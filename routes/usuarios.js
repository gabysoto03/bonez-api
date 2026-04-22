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
    const { id, nombre, email, password, telefono, razon_social, cargo_empresarial, id_rol } = req.body;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO usuarios (id, nombre, email, password, telefono, razon_social, cargo_empresarial, id_rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, nombre, email, hashedPassword, telefono, razon_social ?? null, cargo_empresarial ?? null, id_rol]
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
    const { nombre, email, password, telefono, razon_social, cargo_empresarial, id_rol } = req.body;

    // Solo hashear si viene una contraseña nueva en texto plano
    let hashedPassword;
    if (password && !password.startsWith('$2b$') && !password.startsWith('$2a$')) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    } else {
      const current = await pool.query('SELECT password FROM usuarios WHERE id = $1', [id]);
      if (current.rows.length === 0) { return res.status(404).json({ error: 'Usuario no encontrado' }); }
      hashedPassword = current.rows[0].password;
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET nombre = $1, email = $2, password = $3, telefono = $4, razon_social = $5, cargo_empresarial = $6, id_rol = $7, updatedat = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [nombre, email, hashedPassword, telefono, razon_social ?? null, cargo_empresarial ?? null, id_rol, id]
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
