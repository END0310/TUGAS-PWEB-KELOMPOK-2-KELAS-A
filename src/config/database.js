// Konfigurasi koneksi ke database MySQL
// Menggunakan connection pool agar lebih efisien
require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    port:               process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
});

// Test koneksi saat server pertama kali jalan
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Gagal konek ke database:', err.message);
        return;
    }
    console.log('✅ Database terhubung!');
    connection.release();
});

// Export sebagai promise agar bisa pakai async/await
module.exports = pool.promise();