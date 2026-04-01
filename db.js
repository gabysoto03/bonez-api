const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Bonez',
  password: '',
  port: 5432,
  options: "-c timezone=America/Mexico_City",
});

module.exports = pool;