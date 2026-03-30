const express = require('express');
const router = express.Router();
const pool = require('../db');

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

    const result = await pool.query(
      `INSERT INTO clientes (id, nombre, email, password, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [id, nombre, email, password, telefono]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});



// Actualizar cliente por ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, telefono } = req.body;

    const result = await pool.query(
      `UPDATE clientes SET nombre = $1, email = $2, password = $3, telefono = $4, updateat = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`, [nombre, email, password, telefono, id]
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