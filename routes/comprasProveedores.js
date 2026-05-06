const express = require('express');
const router = express.Router();
const pool = require('../db');
const { handleError } = require('../middleware/errors');


// Obtener todas las compras con sus productos
router.get('/', async (req, res) => {
  try {
    const compras = await pool.query('SELECT * FROM comprasProveedores WHERE activo = true');

    const result = await Promise.all(
      compras.rows.map(async (compra) => {
        const detalles = await pool.query(
          `SELECT id, cantidad, talla, id_producto, createdat, updatedat
           FROM detalleProveedores
           WHERE id_compra_proveedor = $1 AND activo = true`,
          [compra.id]
        );
        return { ...compra, productos: detalles.rows };
      })
    );

    res.json(result);

  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al obtener compras de proveedores');
  }
});


// Obtener una compra por ID con sus productos
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const compra = await pool.query('SELECT * FROM comprasProveedores WHERE id = $1 AND activo = true', [id]);
    if (compra.rows.length === 0) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    const detalles = await pool.query(
      `SELECT id, cantidad, id_producto, createdat, updatedat
       FROM detalleProveedores
       WHERE id_compra_proveedor = $1 AND activo = true`,
      [id]
    );

    res.json({ ...compra.rows[0], productos: detalles.rows });

  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al obtener la compra');
  }
});


// Crear compra con sus detalles
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, fecha, total, status, id_aliado, id_usuario, productos } = req.body;

    if (productos.some(item => !item.talla)) {
      return res.status(400).json({ message: 'El campo talla es requerido en cada producto' });
    }

    await client.query('BEGIN');

    const compra = await client.query(
      `INSERT INTO comprasProveedores (id, fecha, total, status, id_aliado, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, fecha, total, status, id_aliado, id_usuario]
    );

    for (const item of productos) {
      await client.query(
        `INSERT INTO detalleProveedores (cantidad, talla, id_compra_proveedor, id_producto)
         VALUES ($1, $2, $3, $4)`,
        [item.cantidad, item.talla, compra.rows[0].id, item.id_producto]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...compra.rows[0], productos });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    handleError(res, error, 'Error al crear la compra');
  } finally {
    client.release();
  }
});


// Actualizar compra y sus detalles
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { fecha, total, status, id_aliado, id_usuario, productos } = req.body;

    if (productos.some(item => !item.talla)) {
      return res.status(400).json({ message: 'El campo talla es requerido en cada producto' });
    }

    await client.query('BEGIN');

    const compra = await client.query(
      `UPDATE comprasProveedores
       SET fecha = $1, total = $2, status = $3, id_aliado = $4, id_usuario = $5, updatedAt = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [fecha, total, status, id_aliado, id_usuario, id]
    );

    if (compra.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    await client.query('DELETE FROM detalleProveedores WHERE id_compra_proveedor = $1', [id]);

    for (const item of productos) {
      await client.query(
        `INSERT INTO detalleProveedores (cantidad, talla, id_compra_proveedor, id_producto)
         VALUES ($1, $2, $3, $4)`,
        [item.cantidad, item.talla, id, item.id_producto]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Compra actualizada correctamente', compra: { ...compra.rows[0], productos } });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    handleError(res, error, 'Error al actualizar la compra');
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

    const compra = await client.query(
      'UPDATE comprasProveedores SET activo = false WHERE id = $1 AND activo = true RETURNING *', [id]
    );

    if (compra.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    await client.query('UPDATE detalleProveedores SET activo = false WHERE id_compra_proveedor = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Compra eliminada correctamente', compra: compra.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    handleError(res, error, 'Error al eliminar la compra');
  } finally {
    client.release();
  }
});


module.exports = router;
