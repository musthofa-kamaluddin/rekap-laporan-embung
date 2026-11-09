# Sistem Rekap Laporan Embung Otomatis
> **Client-Side Web Engine • Rekap Foto Dokumentasi Bulanan OP SDA IV Bengawan Solo**

Aplikasi web modern berbasis **Vite + React (TypeScript + Tailwind CSS)** yang memproses foto dokumentasi kegiatan harian embung, membaca watermark waktu secara otomatis menggunakan OCR di sisi peramban (*client-side*), dan menghasilkan laporan resmi **Microsoft Excel (.xlsx)** dengan format baku yang 100% presisi.

---

## 🌟 Fitur Utama

- **In-Browser OCR (Tesseract.js)**: Membaca tanggal, bulan, tahun, dan jam dari watermark foto langsung di browser tanpa mengirim data foto ke server pihak ketiga (aman, cepat, dan hemat kuota).
- **Auto-Sorting Triplet (0%, 50%, 100%)**: Mengurutkan foto per hari kerja secara kronologis: Pagi (0%), Siang (50%), dan Sore (100%).
- **Ekspor Excel (.xlsx) Presisi Tinggi**:
  - Header resmi `FOTO DOKUMENTASI ` (Arial 16pt Bold)
  - Identitas lokasi bertulisan merah
  - Label progres `0%`, `50%`, `100%` (Calibri 20pt Bold Centered Bottom)
  - Border penuh pada baris 10 s/d 25
  - Foto tersusun rapi langsung di dalam bingkai sel
- **Mobile-Friendly UI**:
  - Tata letak kartu 2-kolom optimal di layar smartphone.
  - Fitur **Peek Zoom Preview**: perbesar foto dan langsung ubah/tentukan tanggalnya di jendela pratinjau.
  - Popup **Kerja Bakti**: input lokasi otomatis kapital (*Auto CAPSLOCK*). Foto tetap dapat dimasukkan jika ada dokumentasi.
  - Pembeda visual tanggal yang kontras (badge khusus untuk Hari Kerja, Libur Minggu, dan Kerja Bakti).
- **Unduh Arsip ZIP**: Otomatis merapikan file foto ke dalam folder per tanggal (1 s/d 31).

---

## 🚀 Cara Menjalankan

### 1. Manual via Terminal / Command Prompt
```bash
npm install
npm run dev
```
Buka browser di: `http://localhost:3000`

### 2. Build untuk Produksi
```bash
npm run build
```

---

## 🛠️ Teknologi yang Digunakan
- **Frontend Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icon Library**: Lucide React
- **OCR Engine**: Tesseract.js
- **Excel & ZIP Engine**: JSZip + Raw OpenXML SpreadsheetML Compliant Builder
