import { useState } from 'react'
import { Header } from './components/Header'
import { BentoStats } from './components/BentoStats'
import { UploadDropzone } from './components/UploadDropzone'
import { DayCard } from './components/DayCard'
import { ConfigModal } from './components/ConfigModal'
import { ImagePreviewModal } from './components/ImagePreviewModal'
import { KerjaBaktiModal } from './components/KerjaBaktiModal'
import { DayGroup, PhotoItem, ReportConfig } from './types'
import { parsePhotoWatermark } from './utils/ocrWorker'
import { exportReportToExcel, exportSortedZip } from './utils/excelExporter'
import { Download, FolderArchive, Trash2, PlusCircle, AlertTriangle, Eye } from 'lucide-react'

const MONTHS_INDO = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
]

export function App() {
  // Ambil bulan saat ini - 1 (karena laporan bulan lalu dibuat pada bulan berjalan)
  // Contoh: jika saat ini November 2026, maka default laporan adalah Oktober 2026
  const now = new Date()
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const defaultMonth = MONTHS_INDO[prevMonthDate.getMonth()] || 'OKTOBER'
  const defaultYear = prevMonthDate.getFullYear() || 2026

  const [dayGroups, setDayGroups] = useState<DayGroup[]>([])
  const [unassignedPhotos, setUnassignedPhotos] = useState<PhotoItem[]>([])
  const [totalPhotos, setTotalPhotos] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({
    current: 0,
    total: 0,
    fileName: '',
    status: ''
  })

  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ percent: number; message: string } | null>(null)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Lightbox Preview Modal State (Peek with Direct Date Picker)
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    photo: PhotoItem | null
    currentDayNum: number | null
  }>({
    isOpen: false,
    photo: null,
    currentDayNum: null
  })

  // Popup Modal Tandai Kerja Bakti (Auto Capslock Lokasi)
  const [kerjaBaktiModal, setKerjaBaktiModal] = useState<{
    isOpen: boolean
    dayNum: number | null
    initialLokasi: string
  }>({
    isOpen: false,
    dayNum: null,
    initialLokasi: 'EMBUNG BANJARANYAR'
  })

  const [config, setConfig] = useState<ReportConfig>({
    kegiatan: 'LAPORAN PROGRES OP SDA IV EMBUNG BENGAWAN SOLO',
    lokasi: 'EMBUNG PINGGIR (BPA) DESA. PINGGIR KEC. BALONGPANGGANG KAB. GRESIK',
    pekerjaan: 'PEKERJAAN RUTIN PETUGAS EMBUNG',
    bulan: defaultMonth, // Bulan saat ini - 1
    tahun: defaultYear,   // Tahun sesuai bulan laporan
    keterangan: 'PEMBERSIHAN SEMAK-SEMAK',
    kerjaBaktiDays: '',
    geminiApiKey: ''
  })

  // Ingest foto & OCR watermark
  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true)
    setTotalPhotos(prev => prev + files.length)
    setProcessingProgress({ current: 0, total: files.length, fileName: '', status: 'Memulai OCR...' })

    // Urutkan file berdasarkan nama untuk menjaga urutan timestamp foto WhatsApp
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    const rawParsed: PhotoItem[] = []

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i]
      setProcessingProgress({
        current: i + 1,
        total: sortedFiles.length,
        fileName: file.name,
        status: `Menganalisis (${i + 1}/${sortedFiles.length})`
      })

      const parsed = await parsePhotoWatermark(file)
      const previewUrl = URL.createObjectURL(file)

      rawParsed.push({
        id: `${file.name}-${Date.now()}-${i}`,
        file,
        previewUrl,
        fileName: file.name,
        dayName: parsed.dayName,
        dayNum: parsed.dayNum,
        monthName: parsed.monthName,
        year: parsed.year,
        timeStr: parsed.timeStr,
        minutes: parsed.minutes,
        progressType: '0%',
        rawOcrText: parsed.rawText,
        isEstimated: false
      })
    }

    // Step 1: Deteksi bulan dominan jika foto terbaca valid
    const detectedMonths = rawParsed.map(p => p.monthName).filter(m => m && m !== 'Unknown')
    const activeBulan = detectedMonths.length > 0 ? detectedMonths[0].toUpperCase() : config.bulan
    if (detectedMonths.length > 0) {
      setConfig(prev => ({ ...prev, bulan: activeBulan }))
    }

    // Step 2: Triplet Heuristic untuk foto tanpa watermark
    for (let i = 0; i < rawParsed.length; i++) {
      const curr = rawParsed[i]
      if (curr.dayNum === null) {
        const prev = i > 0 ? rawParsed[i - 1] : null
        const next = i < rawParsed.length - 1 ? rawParsed[i + 1] : null

        if (prev?.dayNum && next?.dayNum && prev.dayNum === next.dayNum) {
          curr.dayNum = prev.dayNum
          curr.dayName = (prev.dayName && prev.dayName.toLowerCase() !== 'unknown')
            ? prev.dayName
            : getDayNameFromDate(config.tahun, activeBulan, prev.dayNum)
          curr.monthName = (prev.monthName && prev.monthName.toLowerCase() !== 'unknown')
            ? prev.monthName
            : activeBulan
          curr.year = prev.year || config.tahun
          curr.isEstimated = true

          const pMin = prev.minutes || 420
          const nMin = next.minutes || 690
          const midMin = Math.floor((pMin + nMin) / 2)
          curr.minutes = midMin
          const h = Math.floor(midMin / 60)
          const m = midMin % 60
          curr.timeStr = `${h.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}`
        }
      }
    }

    // Step 3: Pisahkan foto ke dalam grup hari dan unassigned pool
    const stillUnassigned: PhotoItem[] = []
    const byDay = new Map<number, PhotoItem[]>()

    dayGroups.forEach(g => {
      byDay.set(g.dayNum, [...g.photos])
    })

    rawParsed.forEach(p => {
      if (p.dayNum !== null && p.dayNum >= 1 && p.dayNum <= 31) {
        if (!byDay.has(p.dayNum)) {
          byDay.set(p.dayNum, [])
        }
        byDay.get(p.dayNum)!.push(p)
      } else {
        stillUnassigned.push(p)
      }
    })

    setUnassignedPhotos(prev => [...prev, ...stillUnassigned])

    // Step 4: Kerja Bakti days
    const kbSet = new Set(
      (config.kerjaBaktiDays || '')
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n))
    )

    const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b)

    const result: DayGroup[] = sortedDays.map(dNum => {
      const photosInDay = byDay.get(dNum) || []
      photosInDay.sort((a, b) => a.minutes - b.minutes)

      photosInDay.forEach((p, idx) => {
        if (idx === 0) p.progressType = '0%'
        else if (idx === 1) p.progressType = '50%'
        else p.progressType = '100%'
      })

      const existingGroup = dayGroups.find(g => g.dayNum === dNum)
      const isKb = existingGroup?.isKerjaBakti ?? kbSet.has(dNum)
      const refPhoto = photosInDay[0]
      const calculatedDayName = getDayNameFromDate(config.tahun, activeBulan, dNum)
      const validDayName = (refPhoto?.dayName && refPhoto.dayName.toLowerCase() !== 'unknown')
        ? refPhoto.dayName
        : calculatedDayName

      photosInDay.forEach(p => {
        if (!p.dayName || p.dayName.toLowerCase() === 'unknown') {
          p.dayName = validDayName
        }
        if (!p.monthName || p.monthName.toLowerCase() === 'unknown') {
          p.monthName = activeBulan
        }
      })

      return {
        dayNum: dNum,
        dayName: validDayName,
        monthName: (refPhoto?.monthName && refPhoto.monthName.toLowerCase() !== 'unknown') ? refPhoto.monthName : activeBulan,
        year: (refPhoto?.year && refPhoto.year > 2000) ? refPhoto.year : config.tahun,
        photos: photosInDay,
        isKerjaBakti: isKb,
        customLokasi: existingGroup?.customLokasi || (isKb ? 'EMBUNG BANJARANYAR' : undefined),
        customPekerjaan: existingGroup?.customPekerjaan || (isKb ? 'KERJA BAKTI' : undefined),
        customKeterangan: existingGroup?.customKeterangan || (isKb ? 'KERJA BAKTI' : undefined)
      }
    })

    setDayGroups(result)
    setIsProcessing(false)
  }

  // Pindahkan foto antar hari
  const handleMovePhotoToDay = (photoId: string, currentDay: number, targetDay: number) => {
    setDayGroups(prev => {
      let photoToMove: PhotoItem | undefined

      const updated = prev.map(g => {
        if (g.dayNum === currentDay) {
          const remaining = g.photos.filter(p => {
            if (p.id === photoId) {
              photoToMove = p
              return false
            }
            return true
          })
          return { ...g, photos: remaining }
        }
        return g
      })

      if (!photoToMove) return prev

      photoToMove.dayNum = targetDay
      photoToMove.dayName = getDayNameFromDate(config.tahun, config.bulan, targetDay)

      let targetExists = false
      const finalResult = updated.map(g => {
        if (g.dayNum === targetDay) {
          targetExists = true
          const nextPhotos = [...g.photos, photoToMove!].sort((a, b) => a.minutes - b.minutes)
          nextPhotos.forEach((p, idx) => {
            if (idx === 0) p.progressType = '0%'
            else if (idx === 1) p.progressType = '50%'
            else p.progressType = '100%'
          })
          return { ...g, photos: nextPhotos }
        }
        return g
      })

      if (!targetExists) {
        finalResult.push({
          dayNum: targetDay,
          dayName: getDayNameFromDate(config.tahun, config.bulan, targetDay),
          monthName: config.bulan,
          year: config.tahun,
          photos: [photoToMove],
          isKerjaBakti: false
        })
        finalResult.sort((a, b) => a.dayNum - b.dayNum)
      }

      return finalResult
    })
  }

  // Masukkan foto dari daftar unassigned ke hari tertentu
  const handleAssignUnassignedPhoto = (photoId: string, targetDay: number) => {
    const photo = unassignedPhotos.find(p => p.id === photoId)
    if (!photo) return

    setUnassignedPhotos(prev => prev.filter(p => p.id !== photoId))

    photo.dayNum = targetDay
    photo.dayName = getDayNameFromDate(config.tahun, config.bulan, targetDay)
    photo.monthName = config.bulan

    setDayGroups(prev => {
      let targetExists = false
      const updated = prev.map(g => {
        if (g.dayNum === targetDay) {
          targetExists = true
          const nextPhotos = [...g.photos, photo].sort((a, b) => a.minutes - b.minutes)
          nextPhotos.forEach((p, idx) => {
            if (idx === 0) p.progressType = '0%'
            else if (idx === 1) p.progressType = '50%'
            else p.progressType = '100%'
          })
          return { ...g, photos: nextPhotos }
        }
        return g
      })

      if (!targetExists) {
        updated.push({
          dayNum: targetDay,
          dayName: getDayNameFromDate(config.tahun, config.bulan, targetDay),
          monthName: config.bulan,
          year: config.tahun,
          photos: [photo],
          isKerjaBakti: false
        })
        updated.sort((a, b) => a.dayNum - b.dayNum)
      }

      return updated
    })
  }

  // Ganti tanggal langsung dari modal preview / peek
  const handleModalDateChange = (photoId: string, currentDay: number | null, newDay: number) => {
    if (currentDay === null) {
      handleAssignUnassignedPhoto(photoId, newDay)
    } else if (currentDay !== newDay) {
      handleMovePhotoToDay(photoId, currentDay, newDay)
    }

    setPreviewModal(prev => ({
      ...prev,
      currentDayNum: newDay,
      photo: prev.photo ? { ...prev.photo, dayNum: newDay } : null
    }))
  }

  // Tukar urutan foto dalam satu hari
  const handleSwapPhotos = (dayNum: number, idx1: number, idx2: number) => {
    setDayGroups(prev =>
      prev.map(g => {
        if (g.dayNum !== dayNum) return g
        const newPhotos = [...g.photos]
        if (idx1 >= 0 && idx1 < newPhotos.length && idx2 >= 0 && idx2 < newPhotos.length) {
          const temp = newPhotos[idx1]
          newPhotos[idx1] = newPhotos[idx2]
          newPhotos[idx2] = temp

          newPhotos.forEach((p, idx) => {
            if (idx === 0) p.progressType = '0%'
            else if (idx === 1) p.progressType = '50%'
            else p.progressType = '100%'
          })
        }
        return { ...g, photos: newPhotos }
      })
    )
  }

  // Buka popup tandai Kerja Bakti dengan input lokasi auto-capslock
  const handleRequestKerjaBakti = (dayNum: number) => {
    const existing = dayGroups.find(g => g.dayNum === dayNum)
    setKerjaBaktiModal({
      isOpen: true,
      dayNum,
      initialLokasi: existing?.customLokasi || 'EMBUNG BANJARANYAR'
    })
  }

  // Konfirmasi simpan Kerja Bakti dari popup
  const handleConfirmKerjaBakti = (dayNum: number, lokasi: string) => {
    setDayGroups(prev => {
      const exists = prev.find(g => g.dayNum === dayNum)
      if (exists) {
        return prev.map(g =>
          g.dayNum === dayNum
            ? {
                ...g,
                isKerjaBakti: true,
                customLokasi: lokasi,
                customPekerjaan: 'KERJA BAKTI',
                customKeterangan: 'KERJA BAKTI'
              }
            : g
        )
      }

      // Jika belum ada hari tersebut, buat baru
      const newGroup: DayGroup = {
        dayNum,
        dayName: getDayNameFromDate(config.tahun, config.bulan, dayNum),
        monthName: config.bulan,
        year: config.tahun,
        photos: [],
        isKerjaBakti: true,
        customLokasi: lokasi,
        customPekerjaan: 'KERJA BAKTI',
        customKeterangan: 'KERJA BAKTI'
      }

      return [...prev, newGroup].sort((a, b) => a.dayNum - b.dayNum)
    })
  }

  // Kembalikan status Kerja Bakti ke hari normal
  const handleRevertKerjaBakti = (dayNum: number) => {
    setDayGroups(prev =>
      prev.map(g =>
        g.dayNum === dayNum
          ? {
              ...g,
              isKerjaBakti: false,
              customLokasi: undefined,
              customPekerjaan: undefined,
              customKeterangan: undefined
            }
          : g
      )
    )
  }

  // Tambah Kerja Bakti dari Action Bar
  const handleAddKerjaBaktiFromBar = () => {
    setKerjaBaktiModal({
      isOpen: true,
      dayNum: null,
      initialLokasi: 'EMBUNG BANJARANYAR'
    })
  }

  // Clear / Reset
  const handleClearAll = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua data dan memulai ulang dari awal?')) {
      setDayGroups([])
      setUnassignedPhotos([])
      setTotalPhotos(0)
    }
  }

  // Ekspor ZIP Folder Gambar
  const handleExportZip = async () => {
    setIsExporting(true)
    setExportProgress({ percent: 10, message: 'Menyiapkan arsip gambar...' })
    try {
      const zipBlob = await exportSortedZip(dayGroups, (percent, message) => {
        setExportProgress({ percent, message })
      })

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Gambar_Tersortir_${config.bulan}_${config.tahun}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Gagal mengekspor ZIP: ' + String(err))
    } finally {
      setIsExporting(false)
      setExportProgress(null)
    }
  }

  // Ekspor Excel (.xlsx)
  const handleExportExcel = async () => {
    setIsExporting(true)
    setExportProgress({ percent: 10, message: 'Menyusun laporan Excel (.xlsx)...' })
    try {
      const excelBlob = await exportReportToExcel(dayGroups, config, (percent, message) => {
        setExportProgress({ percent, message })
      })

      const url = URL.createObjectURL(excelBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan foto bulanan ${config.bulan}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Gagal mengekspor Excel: ' + String(err))
    } finally {
      setIsExporting(false)
      setExportProgress(null)
    }
  }

  const availableDays = dayGroups.map(g => g.dayNum)

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9] text-slate-800 font-sans pb-12">
      {/* Header Official PUPR */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} isProcessing={isProcessing} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-7 space-y-4 sm:space-y-6">
        {/* Ringkasan Statistik Laporan: 2 Kolom di HP */}
        <BentoStats dayGroups={dayGroups} totalPhotos={totalPhotos} config={config} />

        {/* Kotak Upload Foto */}
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          isProcessing={isProcessing}
          processingProgress={processingProgress}
        />

        {/* Peringatan Foto Perlu Konfirmasi Tanggal (2 Kolom di HP) */}
        {unassignedPhotos.length > 0 && (
          <div className="p-3.5 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-base">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                <span>Ada {unassignedPhotos.length} foto perlu konfirmasi tanggal</span>
              </div>
            </div>

            <p className="text-xs text-amber-800 leading-relaxed">
              Klik <strong>ikon mata</strong> pada foto untuk memperbesar watermark dan langsung memilih tanggalnya di jendela pratinjau.
            </p>

            {/* Grid 2-Kolom di HP untuk Foto Konfirmasi */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
              {unassignedPhotos.map(p => (
                <div
                  key={p.id}
                  className="p-2 sm:p-2.5 rounded-xl bg-white border border-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-xs"
                >
                  {/* Thumbnail dengan Tombol Mata Zoom Preview */}
                  <div className="relative group shrink-0 aspect-[4/3] sm:aspect-square sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={p.previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewModal({
                          isOpen: true,
                          photo: p,
                          currentDayNum: null
                        })
                      }
                      className="absolute inset-0 bg-black/45 hover:bg-black/65 flex items-center justify-center text-white transition-opacity active:scale-95"
                      title="Perbesar Foto & Pilih Tanggal"
                    >
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] sm:text-xs font-mono font-semibold text-slate-800 truncate" title={p.fileName}>
                        {p.fileName}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewModal({
                            isOpen: true,
                            photo: p,
                            currentDayNum: null
                          })
                        }
                        className="p-1 rounded-md hover:bg-slate-100 text-blue-700 shrink-0 sm:hidden"
                        title="Lihat ukuran penuh"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <select
                      onChange={(e) => {
                        const target = parseInt(e.target.value, 10)
                        if (!isNaN(target)) {
                          handleAssignUnassignedPhoto(p.id, target)
                        }
                      }}
                      defaultValue=""
                      className="w-full bg-slate-50 border border-slate-300 text-[11px] sm:text-xs font-bold text-blue-900 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Pilih Tgl...</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>Tgl {d.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls Bar (Mobile-Optimized) */}
        {dayGroups.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900">Daftar Hari Terorganisir</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1d3369] border border-blue-200">
                {dayGroups.length} blok hari
              </span>

              <button
                type="button"
                onClick={handleAddKerjaBaktiFromBar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 border border-amber-300 shadow-xs transition-all active:scale-95"
                title="Tambah tanggal kerja bakti khusus dengan lokasi custom"
              >
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>+ Kerja Bakti</span>
              </button>
            </div>

            {/* Tombol Aksi di Layar Mobile & Desktop */}
            <div className="grid grid-cols-3 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-xs font-semibold text-rose-600 border border-rose-200 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleExportZip}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1d3369] hover:bg-[#14234b] text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 active:scale-95"
              >
                <FolderArchive className="w-3.5 h-3.5 text-[#fdb814]" />
                <span>Unduh ZIP</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Export Bar */}
        {isExporting && exportProgress && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-[#1d3369] border-t-transparent animate-spin" />
              <span className="text-xs sm:text-sm font-semibold text-slate-800">{exportProgress.message}</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-[#1d3369] font-mono">{exportProgress.percent}%</span>
          </div>
        )}

        {/* Daftar Kartu Hari (Per Tanggal Jelas & Menonjol) */}
        <div className="space-y-3 sm:space-y-4">
          {dayGroups.map(group => (
            <DayCard
              key={group.dayNum}
              group={group}
              availableDays={availableDays}
              onSwapPhotos={handleSwapPhotos}
              onRequestKerjaBakti={handleRequestKerjaBakti}
              onRevertKerjaBakti={handleRevertKerjaBakti}
              onMovePhotoToDay={handleMovePhotoToDay}
              onPreviewPhoto={(photo, dayNum) =>
                setPreviewModal({
                  isOpen: true,
                  photo,
                  currentDayNum: dayNum
                })
              }
            />
          ))}
        </div>
      </main>

      {/* Modal Format Laporan */}
      <ConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={setConfig}
      />

      {/* Modal Lightbox Zoom Preview Foto dengan Pemilih Tanggal Langsung */}
      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        photo={previewModal.photo}
        currentDayNum={previewModal.currentDayNum}
        onDateChange={handleModalDateChange}
      />

      {/* Modal Tandai Kerja Bakti (Auto-Capslock Lokasi) */}
      <KerjaBaktiModal
        isOpen={kerjaBaktiModal.isOpen}
        onClose={() => setKerjaBaktiModal(prev => ({ ...prev, isOpen: false }))}
        dayNum={kerjaBaktiModal.dayNum}
        initialLokasi={kerjaBaktiModal.initialLokasi}
        availableDays={availableDays}
        onConfirm={handleConfirmKerjaBakti}
      />
    </div>
  )
}

function getDayNameFromDate(year: number, monthStr: string, day: number): string {
  const monthMap: Record<string, number> = {
    JANUARI: 0, FEBRUARI: 1, MARET: 2, APRIL: 3, MEI: 4, JUNI: 5,
    JULI: 6, AGUSTUS: 7, SEPTEMBER: 8, OKTOBER: 9, NOVEMBER: 10, DESEMBER: 11
  }
  const m = monthMap[monthStr.toUpperCase()] ?? 3
  const d = new Date(year, m, day)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[d.getDay()] || 'Senin'
}
