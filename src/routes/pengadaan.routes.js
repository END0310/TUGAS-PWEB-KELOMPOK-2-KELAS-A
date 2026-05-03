const express               = require('express');
const router                = express.Router();
const pengadaanController   = require('../controllers/pengadaan.controller');
const authMiddleware        = require('../middleware/auth.middleware');
const { requireRole, isKetua, isPengelola, isWD, isPA_or_WD } = require('../middleware/acl.middleware');

// ── Semua route di sini wajib login dulu ────────────
router.use(authMiddleware);

// ── Dashboard (semua role, konten berbeda) ──────────
router.get('/dashboard', pengadaanController.dashboard);

// ── Fitur Ketua Departemen ───────────────────────────
router.get('/usulan/buat',     isKetua, pengadaanController.showFormUsulan);
router.post('/usulan/simpan',  isKetua, pengadaanController.simpanUsulan);

// ── Fitur Pengelola Aset ─────────────────────────────
router.post('/permohonan/buat',        isPengelola, pengadaanController.buatPermohonan);
router.get('/realisasi/:permohonan_id', isPengelola, pengadaanController.showFormRealisasi);
router.post('/realisasi/simpan',        isPengelola, pengadaanController.simpanRealisasi);

// ── Fitur Wakil Dekan ────────────────────────────────
router.get('/permohonan/:id/detail',   isWD, pengadaanController.detailPermohonan);
router.post('/permohonan/:id/keputusan', isWD, pengadaanController.keputusanPermohonan);

// ── API Endpoints (response JSON) ───────────────────
router.get('/api/permohonan',  isPA_or_WD, pengadaanController.apiGetPermohonan);
router.get('/api/statistik',   isPA_or_WD, pengadaanController.apiGetStatistik);

// ── Generate PDF ─────────────────────────────────────
router.get('/laporan/:id/pdf', isPA_or_WD, pengadaanController.generatePDF);

module.exports = router;