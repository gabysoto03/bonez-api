const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});



// Obtener un cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Cliente no encontrado' });}
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el cliente' });
  }
});

// Agregar un nuevo cliente
router.post('/', async (req, res) => {
  try {
    const { id, nombre, email, password, telefono } = req.body;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO clientes (id, nombre, email, password, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [id, nombre, email, hashedPassword, telefono]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});



// Asignar administrador a uno o varios clientes
router.put('/asignar-administrador', async (req, res) => {
  try {

    const { ids_clientes, usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'El campo usuario_id es requerido' });
    }

    if (!ids_clientes || (Array.isArray(ids_clientes) && ids_clientes.length === 0)) {
      return res.status(400).json({ error: 'El campo ids_clientes es requerido' });
    }

    const ids = Array.isArray(ids_clientes) ? ids_clientes : [ids_clientes];

    const administrador = await pool.query('SELECT id FROM usuarios WHERE id = $1', [usuario_id]);
    if (administrador.rows.length === 0) {
      return res.status(404).json({ error: 'Administrador no encontrado' });
    }

    const result = await pool.query(
      `UPDATE clientes SET usuario_id = $1, updatedat = CURRENT_TIMESTAMP
       WHERE id = ANY($2)
       RETURNING *`,
      [usuario_id, ids]
    );

    const actualizados = result.rows.map(r => r.id);
    const noEncontrados = ids.filter(id => !actualizados.includes(id));

    res.json({
      message: 'Operación completada',
      clientes_actualizados: result.rows,
      ...(noEncontrados.length > 0 && { ids_no_encontrados: noEncontrados })
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al asignar administrador' });
  }
});



// Actualizar cliente por ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, telefono } = req.body;

    // Solo hashear si viene una contraseña nueva en texto plano
    let hashedPassword;
    if (password && !password.startsWith('$2b$') && !password.startsWith('$2a$')) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    } else {
      const current = await pool.query('SELECT password FROM clientes WHERE id = $1', [id]);
      if (current.rows.length === 0) { return res.status(404).json({ error: 'Cliente no encontrado' }); }
      hashedPassword = current.rows[0].password;
    }

    const result = await pool.query(
      `UPDATE clientes SET nombre = $1, email = $2, password = $3, telefono = $4, updatedat = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`, [nombre, email, hashedPassword, telefono, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente actualizado correctamente', cliente: result.rows[0] });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});



// Eliminar cliente por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query( 'DELETE FROM clientes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado correctamente', cliente: result.rows[0] });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});



// Obtener ID del cliente por nombre
router.get('/buscar', async (req, res) => {
  try {
    const { nombre } = req.query;
    const result = await pool.query( 'SELECT id FROM clientes WHERE nombre = $1',[nombre]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Cliente no encontrado' });}
    res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar cliente' });
  }
});


module.exports = router;