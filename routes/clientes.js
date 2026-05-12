const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const { handleError } = require('../middleware/errors');

const SALT_ROUNDS = 10;


async function getContactos(clientId) {
  const result = await pool.query(
    'SELECT id, nombre, email, telefono, cargo_empresarial FROM contactos WHERE id_cliente = $1',
    [clientId]
  );
  return result.rows;
}


// Obtener todos los clientes con sus contactos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes WHERE activo = true');

    const clientes = await Promise.all(
      result.rows.map(async (cliente) => ({
        ...cliente,
        contactos: await getContactos(cliente.id),
      }))
    );

    res.json(clientes);
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al obtener clientes');
  }
});


// Buscar ID del cliente por razon_social (debe ir antes de /:id)
router.get('/buscar', async (req, res) => {
  try {
    const { razon_social } = req.query;
    const result = await pool.query(
      'SELECT id FROM clientes WHERE razon_social = $1 AND activo = true', [razon_social]
    );
    if (result.rows.length === 0) { return res.status(404).json({ message: 'Cliente no encontrado' }); }
    res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al buscar cliente');
  }
});


// Obtener un cliente por ID con sus contactos
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM clientes WHERE id = $1 AND activo = true', [id]
    );
    if (result.rows.length === 0) { return res.status(404).json({ message: 'Cliente no encontrado' }); }

    res.json({
      ...result.rows[0],
      contactos: await getContactos(id),
    });
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al obtener el cliente');
  }
});


// Crear cliente con sus contactos
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, razon_social, email, telefono, password, contactos = [] } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'El campo password es requerido' });
    }

    if (contactos.some(c => !c.nombre)) {
      return res.status(400).json({ message: 'Cada contacto debe tener al menos el campo nombre' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query('BEGIN');

    const clienteResult = await client.query(
      `INSERT INTO clientes (id, razon_social, email, telefono, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, razon_social ?? null, email ?? null, telefono ?? null, hashedPassword]
    );

    const contactosInsertados = [];
    for (const contacto of contactos) {
      const c = await client.query(
        `INSERT INTO contactos (id_cliente, nombre, email, telefono, cargo_empresarial)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, contacto.nombre, contacto.email ?? null, contacto.telefono ?? null, contacto.cargo_empresarial ?? null]
      );
      contactosInsertados.push(c.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({ ...clienteResult.rows[0], contactos: contactosInsertados });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    handleError(res, error, 'Error al crear cliente');
  } finally {
    client.release();
  }
});


// Asignar administrador a uno o varios clientes
router.put('/asignar-administrador', async (req, res) => {
  try {
    const { ids_clientes, usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ message: 'El campo usuario_id es requerido' });
    }

    if (!ids_clientes || (Array.isArray(ids_clientes) && ids_clientes.length === 0)) {
      return res.status(400).json({ message: 'El campo ids_clientes es requerido' });
    }

    const ids = Array.isArray(ids_clientes) ? ids_clientes : [ids_clientes];

    const administrador = await pool.query('SELECT id FROM usuarios WHERE id = $1', [usuario_id]);
    if (administrador.rows.length === 0) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    const result = await pool.query(
      `UPDATE clientes SET usuario_id = $1, updatedat = CURRENT_TIMESTAMP
       WHERE id = ANY($2) RETURNING *`,
      [usuario_id, ids]
    );

    const actualizados = result.rows.map(r => r.id);
    const noEncontrados = ids.filter(id => !actualizados.includes(id));

    res.json({
      message: 'Operación completada',
      clientes_actualizados: result.rows,
      ...(noEncontrados.length > 0 && { ids_no_encontrados: noEncontrados }),
    });

  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al asignar administrador');
  }
});


// Actualizar perfil del cliente (sin contactos)
router.put('/actualizar-perfil/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { razon_social, email, telefono, password } = req.body;

    const current = await pool.query('SELECT * FROM clientes WHERE id = $1 AND activo = true', [id]);
    if (current.rows.length === 0) { return res.status(404).json({ message: 'Cliente no encontrado' }); }
    const actual = current.rows[0];

    let hashedPassword = actual.password;
    if (password && !password.startsWith('$2b$') && !password.startsWith('$2a$')) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const result = await pool.query(
      `UPDATE clientes SET razon_social = $1, email = $2, telefono = $3, password = $4, updatedat = CURRENT_TIMESTAMP
       WHERE id = $5 AND activo = true RETURNING *`,
      [
        razon_social ?? actual.razon_social,
        email       ?? actual.email,
        telefono    ?? actual.telefono,
        hashedPassword,
        id
      ]
    );

    res.json({ message: 'Perfil actualizado correctamente', cliente: result.rows[0] });

  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al actualizar perfil del cliente');
  }
});


// Actualizar cliente y sus contactos
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { razon_social, email, telefono, contactos = [] } = req.body;

    if (contactos.some(c => !c.nombre)) {
      return res.status(400).json({ message: 'Cada contacto debe tener al menos el campo nombre' });
    }

    await client.query('BEGIN');

    const clienteResult = await client.query(
      `UPDATE clientes SET razon_social = $1, email = $2, telefono = $3, updatedat = CURRENT_TIMESTAMP
       WHERE id = $4 AND activo = true RETURNING *`,
      [razon_social ?? null, email ?? null, telefono ?? null, id]
    );

    if (clienteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const existentes = contactos.filter(c => c.id);
    const nuevos = contactos.filter(c => !c.id);
    const idsEnviados = existentes.map(c => c.id);

    // Eliminar los contactos que ya no vienen en el array
    if (idsEnviados.length > 0) {
      await client.query(
        'DELETE FROM contactos WHERE id_cliente = $1 AND id != ALL($2)',
        [id, idsEnviados]
      );
    } else {
      await client.query('DELETE FROM contactos WHERE id_cliente = $1', [id]);
    }

    const contactosInsertados = [];

    // Actualizar contactos existentes (tienen id)
    for (const contacto of existentes) {
      const c = await client.query(
        `UPDATE contactos SET nombre = $1, email = $2, telefono = $3, cargo_empresarial = $4
         WHERE id = $5 AND id_cliente = $6 RETURNING *`,
        [contacto.nombre, contacto.email ?? null, contacto.telefono ?? null, contacto.cargo_empresarial ?? null, contacto.id, id]
      );
      if (c.rows.length > 0) contactosInsertados.push(c.rows[0]);
    }

    // Insertar contactos nuevos (no tienen id)
    for (const contacto of nuevos) {
      const c = await client.query(
        `INSERT INTO contactos (id_cliente, nombre, email, telefono, cargo_empresarial)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, contacto.nombre, contacto.email ?? null, contacto.telefono ?? null, contacto.cargo_empresarial ?? null]
      );
      contactosInsertados.push(c.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      message: 'Cliente actualizado correctamente',
      cliente: { ...clienteResult.rows[0], contactos: contactosInsertados },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    handleError(res, error, 'Error al actualizar cliente');
  } finally {
    client.release();
  }
});


// Eliminar cliente por ID (soft delete)
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE clientes SET activo = false WHERE id = $1 AND activo = true RETURNING *', [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    await client.query('DELETE FROM contactos WHERE id_cliente = $1', [id]);

    await client.query('COMMIT');

    res.json({ message: 'Cliente eliminado correctamente', cliente: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    handleError(res, error, 'Error al eliminar cliente');
  } finally {
    client.release();
  }
});


module.exports = router;
