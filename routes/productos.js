const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los productos. 
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});


// Obtener un producto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Producto no encontrado' });}
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// Agregar un nuevo producto
router.post('/', async (req, res) => {
  try {
    const { id, nombre, descripcion, categoria, tipo, precio, imagen } = req.body;
    let imagenBuffer = null;

    if (imagen) {
      const base64Data = imagen.split(',')[1] || imagen;
      imagenBuffer = Buffer.from(base64Data, 'base64');
    }

    const result = await pool.query(
      `INSERT INTO productos 
      (id, nombre, descripcion, categoria, tipo, precio, imagen)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [id, nombre, descripcion, categoria, tipo, precio, imagenBuffer]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});


// Eliminar producto por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM productos WHERE id = $1 RETURNING *',
      [id]
    );

    // Si no encontró el producto
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      message: 'Producto eliminado correctamente',
      producto: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});



// Actualizar producto por ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria, tipo, precio, imagen } = req.body;
    let imagenBuffer = null;

    if (imagen) {
      const base64Data = imagen.split(',')[1] || imagen;
      imagenBuffer = Buffer.from(base64Data, 'base64');
    }

    const result = await pool.query(
      imagen
        ? `UPDATE productos SET nombre = $1, descripcion = $2, categoria = $3, tipo = $4, precio = $5, imagen = $6, updateAt = CURRENT_TIMESTAMP
           WHERE id = $7 RETURNING *`
        : `UPDATE productos SET nombre = $1, descripcion = $2, categoria = $3, tipo = $4, precio = $5, updateAt = CURRENT_TIMESTAMP
           WHERE id = $6 RETURNING *`,
      imagen
        ? [nombre, descripcion, categoria, tipo, precio, imagenBuffer, id]
        : [nombre, descripcion, categoria, tipo, precio, id]
    );

    // Si no existe
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      message: 'Producto actualizado correctamente',
      producto: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});



// Obtener ID del producto por nombre
router.get('/buscar', async (req, res) => {
  try {
    const { nombre } = req.query;
    const result = await pool.query( 'SELECT id FROM productos WHERE nombre = $1', [nombre]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Producto no encontrado' });}
    res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar producto' });
  }
});

module.exports = router;