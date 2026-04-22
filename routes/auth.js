const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar primero en usuarios (admin)
    const usuarioResult = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1', [email]
    );

    if (usuarioResult.rows.length > 0) {
      const usuario = usuarioResult.rows[0];
      console.log('[LOGIN] Usuario encontrado en tabla usuarios:', usuario.email);
      console.log('[LOGIN] Password recibido (texto plano):', password);
      console.log('[LOGIN] Password almacenado en BD:', usuario.password);
      console.log('[LOGIN] ¿Password recibido ya es un hash bcrypt?:', password.startsWith('$2b$') || password.startsWith('$2a$'));
      const passwordValido = await bcrypt.compare(password, usuario.password);
      console.log('[LOGIN] Resultado bcrypt.compare:', passwordValido);

      if (!passwordValido) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
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
      console.log('[LOGIN] Usuario encontrado en tabla clientes:', cliente.email);
      const passwordValido = await bcrypt.compare(password, cliente.password);
      console.log('[LOGIN] Password válido (cliente):', passwordValido);

      if (!passwordValido) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
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
    return res.status(401).json({ error: 'Credenciales inválidas' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});


module.exports = router;
