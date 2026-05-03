// ══════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// Fungsi: mengecek apakah user sudah login atau belum
// Cara kerja: membaca token JWT dari cookie browser
// ══════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {

    // 1. Ambil token dari cookie
    const token = req.cookies.token;

    // 2. Kalau tidak ada token → user belum login
    if (!token) {
        // Simpan pesan error di session lalu redirect ke login
        return res.redirect('/auth/login?error=Silakan+login+terlebih+dahulu');
    }

    try {
        // 3. Verifikasi token menggunakan secret key
        //    Kalau token valid → decoded berisi data user
        //    Kalau tidak valid → masuk ke catch
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Simpan data user ke req.user
        //    agar bisa diakses di controller manapun
        req.user = decoded;

        // 5. Lanjut ke proses berikutnya
        next();

    } catch (err) {
        // Token expired atau tidak valid
        res.clearCookie('token');
        return res.redirect('/auth/login?error=Sesi+habis,+silakan+login+kembali');
    }
};

module.exports = authMiddleware;