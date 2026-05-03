require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const app = express();

// ── Middleware global ────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ── Template engine ──────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// ── Routes ───────────────────────────────────────────
const authRoutes      = require('./src/routes/auth.routes');
const pengadaanRoutes = require('./src/routes/pengadaan.routes');

app.use('/auth',      authRoutes);
app.use('/pengadaan', pengadaanRoutes);

// ── Redirect root ke login ───────────────────────────
app.get('/', (req, res) => res.redirect('/auth/login'));

// ── 404 Handler ──────────────────────────────────────
app.use((req, res) => {
    res.status(404).render('error', {
        user: null, kode: 404,
        pesan: 'Halaman Tidak Ditemukan',
        detail: `URL ${req.path} tidak tersedia`
    });
});

// ── Jalankan server ──────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📁 Mode: ${process.env.NODE_ENV || 'development'}`);
});