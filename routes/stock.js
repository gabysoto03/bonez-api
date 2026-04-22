const express = require('express');
const router = express.Router();
const pool = require('../db');


// Obtener todo el stock
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stock ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el stock' });
  }
});


// Obtener un registro de stock por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM stock WHERE id = $1', [id]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Stock no encontrado' }); }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el stock' });
  }
});


// Crear registro de stock
router.post('/', async (req, res) => {
  try {
    const { cantidad, id_producto, id_talla } = req.body;

    if (!cantidad || !id_producto || !id_talla) {
      return res.status(400).json({ error: 'Los campos cantidad, id_producto e id_talla son requeridos' });
    }

    const result = await pool.query(
      `INSERT INTO stock (cantidad, id_producto, id_talla) VALUES ($1, $2, $3) RETURNING *`,
      [cantidad, id_producto, id_talla]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el stock' });
  }
});


// Actualizar registro de stock por ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, id_producto, id_talla } = req.body;

    if (!cantidad || !id_producto || !id_talla) {
      return res.status(400).json({ error: 'Los campos cantidad, id_producto e id_talla son requeridos' });
    }

    const result = await pool.query(
      `UPDATE stock SET cantidad = $1, id_producto = $2, id_talla = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [cantidad, id_producto, id_talla, id]
    );

    if (result.rows.length === 0) { return res.status(404).json({ error: 'Stock no encontrado' }); }

    res.json({ message: 'Stock actualizado correctamente', stock: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el stock' });
  }
});


// Eliminar registro de stock por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM stock WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) { return res.status(404).json({ error: 'Stock no encontrado' }); }

    res.json({ message: 'Stock eliminado correctamente', stock: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el stock' });
  }
});


module.exports = router;
