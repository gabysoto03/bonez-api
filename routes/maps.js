const express = require('express');
const router = express.Router();
const { handleError } = require('../middleware/errors');

// Obtener la API key de Google Maps
router.get('/key', (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: 'API key de Google Maps no configurada' });
    }

    res.json({ apiKey });
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al obtener la configuración del mapa');
  }
});

module.exports = router;
