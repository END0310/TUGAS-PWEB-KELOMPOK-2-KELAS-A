const db = require('../config/database');

const pengadaanController = {

    // ── Dashboard ────────────────────────────────────
    dashboard: async (req, res) => {
        const { role, id } = req.user;
        let data = {};

        try {
            if (role === 'ketua_departemen') {
                const [usulan] = await db.execute(
                    `SELECT u.*, COUNT(i.id) as jumlah_item
                     FROM usulan_pengadaan u
                     LEFT JOIN item_usulan i ON u.id = i.usulan_id
                     WHERE u.diajukan_oleh = ?
                     GROUP BY u.id
                     ORDER BY u.created_at DESC`,
                    [id]
                );
                data.usulan = usulan;
            }

            if (role === 'pengelola_aset') {
                const [usulan] = await db.execute(
                    `SELECT u.*, us.nama AS nama_pengaju
                     FROM usulan_pengadaan u
                     JOIN users us ON u.diajukan_oleh = us.id
                     ORDER BY u.created_at DESC`
                );
                const [permohonan] = await db.execute(
                    `SELECT p.*, u.judul, us.nama AS dibuat_oleh
                     FROM permohonan_pengadaan p
                     JOIN usulan_pengadaan u ON p.usulan_id = u.id
                     JOIN users us ON p.dibuat_oleh = us.id
                     ORDER BY p.created_at DESC`
                );
                data.usulan     = usulan;
                data.permohonan = permohonan;
            }

            if (role === 'wakil_dekan') {
                const [permohonan] = await db.execute(
                    `SELECT p.*, u.judul, u.deskripsi, us.nama AS dibuat_oleh
                     FROM permohonan_pengadaan p
                     JOIN usulan_pengadaan u ON p.usulan_id = u.id
                     JOIN users us ON p.dibuat_oleh = us.id
                     ORDER BY p.created_at DESC`
                );
                data.permohonan = permohonan;
            }

            res.render('pengadaan/dashboard', { user: req.user, data });

        } catch (err) {
            console.error(err);
            res.render('error', { user: req.user, kode: 500, pesan: 'Server Error', detail: err.message });
        }
    },

    // ── Form usulan baru ─────────────────────────────
    showFormUsulan: (req, res) => {
        res.render('pengadaan/form-usulan', { user: req.user, error: null });
    },

    // ── Simpan usulan ────────────────────────────────
    simpanUsulan: async (req, res) => {
        const { judul, deskripsi, nama_barang, jumlah, satuan, harga_estimasi } = req.body;

        // Validasi
        if (!judul || !nama_barang) {
            return res.render('pengadaan/form-usulan', {
                user: req.user,
                error: 'Judul dan nama barang wajib diisi'
            });
        }

        try {
            // Simpan usulan utama
            const [result] = await db.execute(
                'INSERT INTO usulan_pengadaan (judul, deskripsi, diajukan_oleh, status) VALUES (?,?,?,?)',
                [judul, deskripsi, req.user.id, 'diajukan']
            );
            const usulanId = result.insertId;

            // Simpan item (bisa multiple)
            const namaArr  = Array.isArray(nama_barang)    ? nama_barang    : [nama_barang];
            const jmlArr   = Array.isArray(jumlah)         ? jumlah         : [jumlah];
            const satArr   = Array.isArray(satuan)         ? satuan         : [satuan];
            const hrgArr   = Array.isArray(harga_estimasi) ? harga_estimasi : [harga_estimasi];

            for (let i = 0; i < namaArr.length; i++) {
                await db.execute(
                    'INSERT INTO item_usulan (usulan_id, nama_barang, jumlah, satuan, harga_estimasi) VALUES (?,?,?,?,?)',
                    [usulanId, namaArr[i], jmlArr[i] || 1, satArr[i] || 'unit', hrgArr[i] || 0]
                );
            }

            res.redirect('/pengadaan/dashboard');

        } catch (err) {
            console.error(err);
            res.render('pengadaan/form-usulan', { user: req.user, error: 'Gagal menyimpan: ' + err.message });
        }
    },

    // ── Buat permohonan resmi ────────────────────────
    buatPermohonan: async (req, res) => {
        const { usulan_id } = req.body;
        try {
            // Cek sudah ada permohonan belum
            const [existing] = await db.execute(
                'SELECT id FROM permohonan_pengadaan WHERE usulan_id = ?', [usulan_id]
            );
            if (existing.length > 0) {
                return res.redirect('/pengadaan/dashboard?info=Permohonan+sudah+dibuat');
            }

            await db.execute(
                'INSERT INTO permohonan_pengadaan (usulan_id, dibuat_oleh, status) VALUES (?,?,?)',
                [usulan_id, req.user.id, 'menunggu']
            );
            await db.execute(
                'UPDATE usulan_pengadaan SET status = ? WHERE id = ?',
                ['diproses', usulan_id]
            );
            res.redirect('/pengadaan/dashboard');
        } catch (err) {
            res.redirect('/pengadaan/dashboard?error=Gagal+buat+permohonan');
        }
    },

    // ── Detail permohonan (WD) ───────────────────────
    detailPermohonan: async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await db.execute(
                `SELECT p.*, u.judul, u.deskripsi, us.nama AS dibuat_oleh
                 FROM permohonan_pengadaan p
                 JOIN usulan_pengadaan u ON p.usulan_id = u.id
                 JOIN users us ON p.dibuat_oleh = us.id
                 WHERE p.id = ?`, [id]
            );
            const [items] = await db.execute(
                `SELECT i.* FROM item_usulan i
                 JOIN usulan_pengadaan u ON i.usulan_id = u.id
                 JOIN permohonan_pengadaan p ON p.usulan_id = u.id
                 WHERE p.id = ?`, [id]
            );
            if (rows.length === 0) return res.redirect('/pengadaan/dashboard');
            res.render('pengadaan/detail-permohonan', {
                user: req.user, permohonan: rows[0], items
            });
        } catch (err) {
            res.redirect('/pengadaan/dashboard');
        }
    },

    // ── Keputusan WD ─────────────────────────────────
    keputusanPermohonan: async (req, res) => {
        const { id } = req.params;
        const { keputusan, catatan } = req.body; // keputusan: 'disetujui' atau 'ditolak'
        try {
            await db.execute(
                `UPDATE permohonan_pengadaan
                 SET status = ?, catatan_wd = ?, diproses_oleh = ?, diproses_at = NOW()
                 WHERE id = ?`,
                [keputusan, catatan || '', req.user.id, id]
            );
            res.redirect('/pengadaan/dashboard');
        } catch (err) {
            res.redirect('/pengadaan/dashboard?error=Gagal+update+keputusan');
        }
    },

    // ── Form realisasi barang ────────────────────────
    showFormRealisasi: async (req, res) => {
        const { permohonan_id } = req.params;
        const [rows] = await db.execute(
            `SELECT p.*, u.judul FROM permohonan_pengadaan p
             JOIN usulan_pengadaan u ON p.usulan_id = u.id
             WHERE p.id = ? AND p.status = 'disetujui'`, [permohonan_id]
        );
        if (rows.length === 0) return res.redirect('/pengadaan/dashboard');
        res.render('pengadaan/form-realisasi', { user: req.user, permohonan: rows[0], error: null });
    },

    // ── Simpan realisasi ─────────────────────────────
    simpanRealisasi: async (req, res) => {
        const { permohonan_id, nama_barang, jumlah_diterima, satuan, kondisi, tanggal_terima } = req.body;
        try {
            await db.execute(
                `INSERT INTO realisasi_barang
                 (permohonan_id, nama_barang, jumlah_diterima, satuan, kondisi, tanggal_terima, ditambahkan_oleh)
                 VALUES (?,?,?,?,?,?,?)`,
                [permohonan_id, nama_barang, jumlah_diterima, satuan, kondisi, tanggal_terima, req.user.id]
            );
            res.redirect('/pengadaan/dashboard');
        } catch (err) {
            res.redirect('/pengadaan/dashboard?error=Gagal+simpan+realisasi');
        }
    },

    // ── API: semua permohonan (JSON) ─────────────────
    apiGetPermohonan: async (req, res) => {
        try {
            const [rows] = await db.execute(
                `SELECT p.id, p.status, p.created_at,
                        u.judul, us.nama AS dibuat_oleh
                 FROM permohonan_pengadaan p
                 JOIN usulan_pengadaan u ON p.usulan_id = u.id
                 JOIN users us ON p.dibuat_oleh = us.id
                 ORDER BY p.created_at DESC`
            );
            res.status(200).json({ status: 'success', total: rows.length, data: rows });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    },

    // ── API: statistik ────────────────────────────────
    apiGetStatistik: async (req, res) => {
        try {
            const [stats] = await db.execute(
                `SELECT
                   COUNT(*) AS total,
                   SUM(status='menunggu')  AS menunggu,
                   SUM(status='disetujui') AS disetujui,
                   SUM(status='ditolak')   AS ditolak
                 FROM permohonan_pengadaan`
            );
            res.status(200).json({ status: 'success', data: stats[0] });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    },

    // ── Generate PDF laporan ──────────────────────────
    generatePDF: async (req, res) => {
        const PDFDocument = require('pdfkit');
        const { id } = req.params;
        try {
            const [rows] = await db.execute(
                `SELECT p.*, u.judul, u.deskripsi, us.nama AS dibuat_oleh
                 FROM permohonan_pengadaan p
                 JOIN usulan_pengadaan u ON p.usulan_id = u.id
                 JOIN users us ON p.dibuat_oleh = us.id
                 WHERE p.id = ?`, [id]
            );
            if (rows.length === 0) return res.status(404).send('Data tidak ditemukan');

            const data = rows[0];
            const doc  = new PDFDocument({ margin: 60 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=permohonan-${id}.pdf`);
            doc.pipe(res);

            doc.fontSize(16).font('Helvetica-Bold')
               .text('SURAT PERMOHONAN PENGADAAN BARANG', { align: 'center' });
            doc.moveDown();
            doc.fontSize(11).font('Helvetica')
               .text(`Judul   : ${data.judul}`)
               .text(`Dibuat  : ${data.dibuat_oleh}`)
               .text(`Status  : ${data.status}`)
               .text(`Tanggal : ${new Date(data.created_at).toLocaleDateString('id-ID')}`);
            if (data.catatan_wd) {
                doc.moveDown().text(`Catatan WD: ${data.catatan_wd}`);
            }
            doc.end();
        } catch (err) {
            res.status(500).send('Gagal generate PDF');
        }
    }
};

module.exports = pengadaanController;