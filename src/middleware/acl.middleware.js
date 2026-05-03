// ══════════════════════════════════════════════════════
// ACL MIDDLEWARE (Access Control List)
// Fungsi: mengecek apakah user punya izin akses
//         berdasarkan role-nya
// ══════════════════════════════════════════════════════

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {

        // Pastikan user sudah login (req.user harus ada)
        if (!req.user) {
            return res.redirect('/auth/login');
        }

        // Cek apakah role user ada di daftar role yang diizinkan
        const userRole = req.user.role;
        const isAllowed = allowedRoles.includes(userRole);

        if (!isAllowed) {
            // Role tidak cocok → tampilkan halaman 403 Forbidden
            return res.status(403).render('error', {
                user: req.user,
                kode: 403,
                pesan: 'Akses Ditolak',
                detail: `Halaman ini hanya bisa diakses oleh: ${allowedRoles.join(', ')}. ` +
                        `Role Anda saat ini: ${userRole}`
            });
        }

        // Role cocok → lanjut
        next();
    };
};

// ── Shortcut untuk role spesifik ──────────────────────
// Supaya di routes tidak perlu tulis panjang
const isKetua     = requireRole('ketua_departemen');
const isPengelola = requireRole('pengelola_aset');
const isWD        = requireRole('wakil_dekan');
const isKetua_or_PA = requireRole('ketua_departemen','pengelola_aset');
const isPA_or_WD    = requireRole('pengelola_aset','wakil_dekan');

module.exports = {
    requireRole,
    isKetua,
    isPengelola,
    isWD,
    isKetua_or_PA,
    isPA_or_WD
};