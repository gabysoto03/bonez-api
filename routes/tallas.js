const express = require('express');
const router = express.Router();
const pool = require('../db');


// Obtener todas las tallas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tallas ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener tallas' });
  }
});


// Obtener una talla por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tallas WHERE id = $1', [id]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Talla no encontrada' }); }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la talla' });
  }
});


// Crear talla
router.post('/', async (req, res) => {
  try {
    const { descripcion } = req.body;

    if (!descripcion) {
      return res.status(400).json({ error: 'El campo descripcion es requerido' });
    }

    const result = await pool.query(
      `INSERT INTO tallas (descripcion) VALUES ($1) RETURNING *`,
      [descripcion]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la talla' });
  }
});


// Actualizar talla por ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;

    if (!descripcion) {
      return res.status(400).json({ error: 'El campo descripcion es requerido' });
    }

    const result = await pool.query(
      `UPDATE tallas SET descripcion = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [descripcion, id]
    );

    if (result.rows.length === 0) { return res.status(404).json({ error: 'Talla no encontrada' }); }

    res.json({ message: 'Talla actualizada correctamente', talla: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la talla' });
  }
});


// Eliminar talla por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tallas WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) { return res.status(404).json({ error: 'Talla no encontrada' }); }

    res.json({ message: 'Talla eliminada correctamente', talla: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la talla' });
  }
});


module.exports = router;
