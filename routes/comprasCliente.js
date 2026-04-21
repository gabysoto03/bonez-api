const express = require('express');
const router = express.Router();
const pool = require('../db');


// Obtener todas las compras con sus productos
router.get('/', async (req, res) => {
  try {
    const compras = await pool.query('SELECT * FROM comprasCliente');

    const result = await Promise.all(
      compras.rows.map(async (compra) => {
        const detalles = await pool.query(
          `SELECT dc.id, dc.cantidad, dc.id_producto, dc.createdat, dc.updatedat
           FROM detalleCliente dc
           WHERE dc.id_compra = $1`,
          [compra.id]
        );
        return { ...compra, productos: detalles.rows };
      })
    );

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener compras' });
  }
});



// Obtener una compra por ID con sus productos
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const compra = await pool.query( 'SELECT * FROM comprasCliente WHERE id = $1', [id]);
    if (compra.rows.length === 0) { return res.status(404).json({ error: 'Compra no encontrada' });}

    const detalles = await pool.query(
      `SELECT dc.id, dc.cantidad, dc.id_producto, dc.createdat, dc.updatedat
       FROM detalleCliente dc
       WHERE dc.id_compra = $1`,
      [id]
    );

    res.json({ ...compra.rows[0], productos: detalles.rows });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la compra' });
  }
});



// Crear compra con sus detalles
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, fecha, total, status, id_cliente = null, email = null, nombre = null, telefono = null, productos } = req.body;

    if (email !== null && email !== undefined && email !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'El formato del email no es válido' });
      }
    }

    await client.query('BEGIN');

    const compra = await client.query(
      `INSERT INTO comprasCliente (id, fecha, total, status, id_cliente, email, nombre, telefono)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, fecha, total, status, id_cliente || null, email || null, nombre || null, telefono || null]
    );

    for (const item of productos) {
      await client.query(
        `INSERT INTO detalleCliente (id, cantidad, id_compra, id_producto)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [item.cantidad, compra.rows[0].id, item.id_producto]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ ...compra.rows[0], productos });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al crear la compra' });
  } finally {
    client.release();
  }
});



// Actualizar compra y sus detalles
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { fecha, total, status, id_cliente, email = null, nombre = null, telefono = null, productos } = req.body;

    if (email !== null && email !== undefined && email !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'El formato del email no es válido' });
      }
    }

    await client.query('BEGIN');

    const compra = await client.query(
      `UPDATE comprasCliente SET fecha = $1, total = $2, status = $3, id_cliente = $4, email = $5, nombre = $6, telefono = $7, updatedat = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [fecha, total, status, id_cliente, email || null, nombre || null, telefono || null, id]
    );

    if (compra.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    // Eliminar detalles anteriores y reinsertar
    await client.query('DELETE FROM detalleCliente WHERE id_compra = $1', [id]);

    for (const item of productos) {
      await client.query(
        `INSERT INTO detalleCliente (id, cantidad, id_compra, id_producto)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [item.cantidad, id, item.id_producto]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Compra actualizada correctamente', compra: { ...compra.rows[0], productos } });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la compra' });
  } finally {
    client.release();
  }
});



// Eliminar compra y sus detalles
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    await client.query('DELETE FROM detalleCliente WHERE id_compra = $1', [id]);
    const compra = await client.query( 'DELETE FROM comprasCliente WHERE id = $1 RETURNING *', [id]);

    if (compra.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Compra eliminada correctamente', compra: compra.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la compra' });
  } finally {
    client.release();
  }
});

module.exports = router;
