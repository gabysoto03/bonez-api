const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { handleError } = require('../middleware/errors');


// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    // Buscar primero en usuarios (admin)
    const usuarioResult = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1', [email]
    );

    if (usuarioResult.rows.length > 0) {
      const usuario = usuarioResult.rows[0];

      if (!usuario.activo) {
        return res.status(403).json({ message: 'El usuario ha sido eliminado' });
      }

      const passwordValido = await bcrypt.compare(password, usuario.password);

      if (!passwordValido) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, tipo: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      const { password: _, ...usuarioSinPassword } = usuario;

      return res.json({
        tipo: 'admin',
        redireccion: '/admin',
        token,
        usuario: usuarioSinPassword,
      });
    }

    // Buscar en clientes
    const clienteResult = await pool.query(
      'SELECT * FROM clientes WHERE email = $1', [email]
    );

    if (clienteResult.rows.length > 0) {
      const cliente = clienteResult.rows[0];

      if (!cliente.activo) {
        return res.status(403).json({ message: 'El usuario ha sido eliminado' });
      }

      const passwordValido = await bcrypt.compare(password, cliente.password);

      if (!passwordValido) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { id: cliente.id, email: cliente.email, tipo: 'cliente' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      const { password: _, ...clienteSinPassword } = cliente;

      return res.json({
        tipo: 'cliente',
        redireccion: '/mis-compras',
        token,
        usuario: clienteSinPassword,
      });
    }

    // No encontrado en ninguna tabla
    return res.status(401).json({ message: 'Credenciales inválidas' });

  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al iniciar sesión');
  }
});


// Verificar si un email existe en usuarios o clientes
router.post('/verificar-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'El email es requerido' });
    }

    const usuarioResult = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1 AND activo = true', [email]
    );

    if (usuarioResult.rows.length > 0) {
      return res.json({ existe: true });
    }

    const clienteResult = await pool.query(
      'SELECT id FROM clientes WHERE email = $1 AND activo = true', [email]
    );

    return res.json({ existe: clienteResult.rows.length > 0 });

  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al verificar el email');
  }
});


// Cambiar contraseña por email
router.put('/cambiar-password', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Buscar primero en usuarios
    const usuarioResult = await pool.query(
      'UPDATE usuarios SET password = $1, updatedat = CURRENT_TIMESTAMP WHERE email = $2 AND activo = true RETURNING id',
      [hashedPassword, email]
    );

    if (usuarioResult.rows.length > 0) {
      return res.json({ message: 'Contraseña actualizada correctamente' });
    }

    // Buscar en clientes
    const clienteResult = await pool.query(
      'UPDATE clientes SET password = $1, updatedat = CURRENT_TIMESTAMP WHERE email = $2 AND activo = true RETURNING id',
      [hashedPassword, email]
    );

    if (clienteResult.rows.length > 0) {
      return res.json({ message: 'Contraseña actualizada correctamente' });
    }

    return res.status(404).json({ message: 'No se encontró ningún usuario con ese email' });

  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al cambiar la contraseña');
  }
});


module.exports = router;
