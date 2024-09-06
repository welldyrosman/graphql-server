// knexfile.js
module.exports = {
    client: 'pg',
    connection: {
      host: 'ep-super-bush-a1526tnv.ap-southeast-1.aws.neon.tech',
      user: 'default',
      password: 'DIJfbQl0Tp4A', // Ganti dengan password yang benar
      database: 'verceldb',
      port: 5432,
      ssl: { rejectUnauthorized: false } // Menyediakan konfigurasi SSL untuk koneksi aman
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  };
  