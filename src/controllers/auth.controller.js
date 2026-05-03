const db      = require('../config/database');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const authController = {

    // ── Tampilkan halaman login ──────────────────────
    showLogin: (req, res) => {
        // Kalau sudah login, langsung ke dashboard
        if (req.cookies.token) {
            return res.redirect('/pengadaan/dashboard');
        }
        const error = req.query.error || null;
        res.render('auth/login', { error });
    },

    // ── Proses login ────────────────────────────────
    login: async (req, res) => {
        const { email, password } = req.body;

        // Validasi input tidak kosong
        if (!email || !password) {
            return res.render('auth/login', {
                error: 'Email dan password wajib diisi'
            });
        }

        try {
            // Cari user berdasarkan email
            const [rows] = await db.execute(
                'SELECT * FROM users WHERE email = ? AND is_active = 1',
                [email]
            );

            // User tidak ditemukan
            if (rows.length === 0) {
                return res.render('auth/login', {
                    error: 'Email atau password salah'
                });
            }

            const user = rows[0];

            // Bandingkan password dengan hash di database
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.render('auth/login', {
                    error: 'Email atau password salah'
                });
            }

            // Buat JWT token berisi data user
            const token = jwt.sign(
                {
                    id:    user.id,
                    nama:  user.nama,
                    email: user.email,
                    role:  user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES || '8h' }
            );

            // Simpan token ke cookie
            res.cookie('token', token, {
                httpOnly: true,   // tidak bisa diakses JavaScript (lebih aman)
                maxAge: 8 * 60 * 60 * 1000,  // 8 jam
                sameSite: 'strict'
            });

            // Redirect ke dashboard
            console.log(`✅ Login berhasil: ${user.nama} (${user.role})`);
            res.redirect('/pengadaan/dashboard');

        } catch (err) {
            console.error('Login error:', err);
            res.render('auth/login', {
                error: 'Terjadi kesalahan server. Coba lagi.'
            });
        }
    },

    // ── Logout ──────────────────────────────────────
    logout: (req, res) => {
        res.clearCookie('token');
        res.redirect('/auth/login?info=Berhasil+logout');
    }
};

module.exports = authController;