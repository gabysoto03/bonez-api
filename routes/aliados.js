const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los aliados
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aliados');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener aliados' });
  }
});


// Agregar un nuevo aliado
router.post('/', async (req, res) => {
  try {
    const { nombre, img } = req.body;
    let imgBuffer = null;

    if (img) {
      const base64Data = img.split(',')[1] || img;
      imgBuffer = Buffer.from(base64Data, 'base64');
    }

    const result = await pool.query(
      `INSERT INTO aliados (nombre, img) VALUES ($1, $2) RETURNING *`,
      [nombre, imgBuffer]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear aliado' });
  }
});


// Actualizar aliado por ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, img } = req.body;

    let imgBuffer = null;
    if (img) {
      const base64Data = img.split(',')[1] || img;
      imgBuffer = Buffer.from(base64Data, 'base64');
    }

    const result = await pool.query(
      img
        ? `UPDATE aliados SET nombre = $1, img = $2, updatedat = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`
        : `UPDATE aliados SET nombre = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      img
        ? [nombre, imgBuffer, id]
        : [nombre, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aliado no encontrado' });
    }

    res.json({ message: 'Aliado actualizado correctamente', aliado: result.rows[0] });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar aliado' });
  }
});


// Eliminar aliado por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM aliados WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aliado no encontrado' });
    }

    res.json({ message: 'Aliado eliminado correctamente', aliado: result.rows[0] });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar aliado' });
  }
});


module.exports = router;
