const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { handleError } = require('../middleware/errors');


const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_BUCKET_NAME;
const CATALOGO_KEY = 'catalogos/catalogo-Bonez.pdf';


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});


// Subir o reemplazar el catálogo PDF
router.post('/subir', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Archivo PDF requerido' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Solo se permite subir archivos PDF' });
    }

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: CATALOGO_KEY,
      Body: req.file.buffer,
      ContentType: 'application/pdf',
      ContentDisposition: 'inline; filename="catalogo-Bonez.pdf"',
    }));

    res.json({ message: 'Catálogo subido correctamente' });

  } catch (error) {
    console.error(error);
    handleError(res, error, 'Error al subir el catálogo');
  }
});



// Mostrar el catálogo PDF en el visor del navegador
router.get('/pdf', async (req, res) => {
  try {
    const objeto = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: CATALOGO_KEY,
    }));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="catalogo-Bonez.pdf"');

    objeto.Body.pipe(res);

  } catch (error) {
    console.error(error);
    handleError(res, error, 'No se pudo obtener el catálogo PDF');
  }
});



// Descargar el catálogo PDF
router.get('/download', async (req, res) => {
  try {
    const objeto = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: CATALOGO_KEY,
    }));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="catalogo-Bonez.pdf"');

    objeto.Body.pipe(res);

  } catch (error) {
    console.error(error);
    handleError(res, error, 'No se pudo descargar el catálogo PDF');
  }
});


module.exports = router;
