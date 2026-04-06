const express = require('express');
const cors = require('cors');

const app = express();

// middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// rutas
const productosRoutes = require('./routes/productos');
app.use('/productos', productosRoutes);

const clientesRoutes = require('./routes/clientes');
app.use('/clientes', clientesRoutes);

const aliadosRoutes = require('./routes/aliados');
app.use('/aliados', aliadosRoutes);

const comprasClienteRoutes = require('./routes/comprasCliente');
app.use('/compras-cliente', comprasClienteRoutes);

const comprasProveedoresRoutes = require('./routes/comprasProveedores');
app.use('/compras-proveedores', comprasProveedoresRoutes);

const usuariosRoutes = require('./routes/usuarios');
app.use('/usuarios', usuariosRoutes);

// puerto
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});