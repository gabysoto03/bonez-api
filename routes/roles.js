const express = require('express');
const router = express.Router();
const pool = require('../db');
const { handleError } = require('../middleware/errors');


// Obtener todos los roles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles WHERE activo = true ORDER BY createat ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al obtener roles');
  }
});



// Obtener un rol por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM roles WHERE id = $1 AND activo = true', [id]);
    if (result.rows.length === 0) { return res.status(404).json({ message: 'Rol no encontrado' }); }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al obtener el rol');
  }
});



// Crear rol (solo recibe descripcion, status inicia en 'activo')
router.post('/', async (req, res) => {
  try {
    const { descripcion } = req.body;

    const result = await pool.query(
      `INSERT INTO roles (descripcion, status)
       VALUES ($1, 'activo')
       RETURNING *`,
      [descripcion]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al crear rol');
  }
});



// Actualizar rol (descripcion y/o status)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, status } = req.body;

    if (status && !['activo', 'inactivo'].includes(status)) {
      return res.status(400).json({ message: 'El status debe ser "activo" o "inactivo"' });
    }

    const result = await pool.query(
      `UPDATE roles
       SET descripcion = COALESCE($1, descripcion),
           status = COALESCE($2, status),
           updatedat = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [descripcion ?? null, status ?? null, id]
    );

    if (result.rows.length === 0) { return res.status(404).json({ message: 'Rol no encontrado' }); }

    res.json({ message: 'Rol actualizado correctamente', rol: result.rows[0] });
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al actualizar rol');
  }
});



// Eliminar rol por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE roles SET activo = false WHERE id = $1 AND activo = true RETURNING *', [id]
    );

    if (result.rows.length === 0) { return res.status(404).json({ message: 'Rol no encontrado' }); }

    res.json({ message: 'Rol eliminado correctamente', rol: result.rows[0] });
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al eliminar rol');
  }
});


module.exports = router;
