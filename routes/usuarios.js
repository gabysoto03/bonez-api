const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;


// Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});



// Obtener un usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Usuario no encontrado' }); }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
});



// Crear usuario
router.post('/', async (req, res) => {
  try {
    const { id, nombre, email, password, telefono } = req.body;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO usuarios (id, nombre, email, password, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, nombre, email, hashedPassword, telefono]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});



// Actualizar usuario por ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, telefono } = req.body;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `UPDATE usuarios
       SET nombre = $1, email = $2, password = $3, telefono = $4, updatedat = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [nombre, email, hashedPassword, telefono, id]
    );

    if (result.rows.length === 0) { return res.status(404).json({ error: 'Usuario no encontrado' }); }

    res.json({ message: 'Usuario actualizado correctamente', usuario: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});



// Eliminar usuario por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) { return res.status(404).json({ error: 'Usuario no encontrado' }); }

    res.json({ message: 'Usuario eliminado correctamente', usuario: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});


module.exports = router;
