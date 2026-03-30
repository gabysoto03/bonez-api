const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Bonez',
  password: '', 
  port: 5432,
});

pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'America/Mexico_City'");
});

module.exports = pool;