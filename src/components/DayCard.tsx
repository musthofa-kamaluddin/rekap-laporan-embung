import React from 'react'
import { DayGroup, PhotoItem } from '../types'
import { Clock, CheckCircle2, AlertCircle, ArrowLeftRight, Wrench, ImageOff, Eye, MapPin, Edit3, RotateCcw } from 'lucide-react'
import { getDayNameFromCalendar } from '../utils/ocrWorker'

interface DayCardProps {
  group: DayGroup
  availableDays: number[]
  onSwapPhotos: (dayNum: number, idx1: number, idx2: number) => void
  onRequestKerjaBakti: (dayNum: number) => void
  onRevertKerjaBakti: (dayNum: number) => void
  onMovePhotoToDay: (photoId: string, currentDay: number, targetDay: number) => void
  onPreviewPhoto: (photo: PhotoItem, dayNum: number) => void
}

export const DayCard: React.FC<DayCardProps> = ({
  group,
  availableDays,
  onSwapPhotos,
  onRequestKerjaBakti,
  onRevertKerjaBakti,
  onMovePhotoToDay,
  onPreviewPhoto
}) => {
  const isKerjaBakti = Boolean(group.isKerjaBakti)
  const isComplete = group.photos.length === 3
  const hasExcess = group.photos.length > 3
  const displayDayName = (group.dayName && group.dayName.toLowerCase() !== 'unknown')
    ? group.dayName
    : getDayNameFromCalendar(group.year, group.monthName, group.dayNum)
  const isSunday = displayDayName.toLowerCase().includes('minggu')
  const isSaturday = displayDayName.toLowerCase().includes('sabtu')

  // Visual header styling to make dates clearly distinguishable
  let topBorderColor = 'border-t-4 border-t-[#1d3369]'
  let dateBadgeBg = 'bg-[#1d3369] text-white'
  let dayTagLabel = ''

  if (isKerjaBakti) {
    topBorderColor = 'border-t-4 border-t-amber-500'
    dateBadgeBg = 'bg-amber-500 text-slate-950'
    dayTagLabel = 'KERJA BAKTI'
  } else if (isSunday) {
    topBorderColor = 'border-t-4 border-t-rose-600'
    dateBadgeBg = 'bg-rose-600 text-white'
    dayTagLabel = 'LIBUR MINGGU'
  } else if (isSaturday) {
    topBorderColor = 'border-t-4 border-t-sky-700'
    dateBadgeBg = 'bg-sky-800 text-white'
    dayTagLabel = 'SABTU'
  } else if (!isComplete) {
    topBorderColor = 'border-t-4 border-t-amber-400'
  }

  return (
    <div
      className={`rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all p-3 sm:p-5 ${topBorderColor} ${
        isKerjaBakti ? 'bg-amber-50/15' : ''
      }`}
    >
      {/* Header bar per Hari - Sangat Jelas & Beda Antar Tanggal */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 mb-3.5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Badge Tanggal Menonjol */}
          <span className={`font-mono text-sm sm:text-base font-black px-3 py-1 rounded-xl shadow-xs shrink-0 ${dateBadgeBg}`}>
            TGL {group.dayNum.toString().padStart(2, '0')}
          </span>

          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{displayDayName}, {group.dayNum} {group.monthName} {group.year}</span>
              {dayTagLabel && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {dayTagLabel}
                </span>
              )}
            </h3>

            {/* Jika Kerja Bakti: Tampilkan Lokasi Embung yang Bisa Diubah */}
            {isKerjaBakti && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold text-amber-900">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Lokasi: {group.customLokasi || 'EMBUNG BANJARANYAR'}</span>
                <button
                  type="button"
                  onClick={() => onRequestKerjaBakti(group.dayNum)}
                  className="text-[11px] text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 ml-1"
                  title="Ubah lokasi kerja bakti"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Ubah</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status & Kontrol Hari */}
        <div className="flex flex-wrap items-center gap-2 text-xs ml-auto sm:ml-0">
          {/* Tombol Tandai / Kembalikan Kerja Bakti */}
          {isKerjaBakti ? (
            <button
              type="button"
              onClick={() => onRevertKerjaBakti(group.dayNum)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all"
              title="Kembalikan hari ini menjadi hari kerja rutin biasa"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Kembalikan Normal</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRequestKerjaBakti(group.dayNum)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-xs"
              title="Tandai hari ini sebagai kerja bakti (bisa isi lokasi custom)"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span>Tandai Kerja Bakti</span>
            </button>
          )}

          {/* Status Kelengkapan Foto */}
          {isComplete ? (
            <span className="flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Lengkap (3/3)
            </span>
          ) : group.photos.length > 0 ? (
            <span className="flex items-center gap-1 text-amber-800 font-bold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {group.photos.length}/3 Foto
            </span>
          ) : isKerjaBakti ? (
            <span className="flex items-center gap-1 text-slate-600 font-semibold bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              Tanpa Foto
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
              0/3 Foto
            </span>
          )}
        </div>
      </div>

      {/* Warning Foto Berlebih (> 3) */}
      {hasExcess && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          ⚠️ <strong>Perhatian:</strong> Ada {group.photos.length} foto pada tanggal ini. 3 foto pertama masuk laporan, foto lainnya bisa dipindahkan di bawah.
        </div>
      )}

      {/* Grid Foto Progres: 2 Kolom di HP (grid-cols-2), 3 Kolom di Layar Lebar (sm:grid-cols-3) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        {[0, 1, 2].map((slotIdx) => {
          const photo = group.photos[slotIdx] as PhotoItem | undefined
          const label = slotIdx === 0 ? '0%' : slotIdx === 1 ? '50%' : '100%'
          const sublabel = slotIdx === 0 ? 'Pagi' : slotIdx === 1 ? 'Siang' : 'Selesai'

          return (
            <div
              key={slotIdx}
              className="group relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col shadow-xs transition-all hover:border-slate-300"
            >
              {/* Badge Label Progres */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs border border-slate-300 text-[11px] sm:text-xs font-bold text-slate-800 shadow-xs">
                <span>{label}</span>
                <span className="text-[10px] text-slate-500 font-medium hidden xs:inline">({sublabel})</span>
              </div>

              {/* Tombol Mata (Zoom In Preview) */}
              {photo && (
                <button
                  type="button"
                  onClick={() => onPreviewPhoto(photo, group.dayNum)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/65 hover:bg-black/85 text-white backdrop-blur-xs shadow-md transition-all active:scale-95"
                  title="Lihat foto & pilih tanggal (Zoom In)"
                >
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {/* Area Gambar Foto */}
              <div
                onClick={() => photo && onPreviewPhoto(photo, group.dayNum)}
                className={`relative aspect-[4/3] bg-slate-200 flex items-center justify-center overflow-hidden ${
                  photo ? 'cursor-pointer' : ''
                }`}
              >
                {photo ? (
                  <img
                    src={photo.previewUrl}
                    alt={photo.fileName}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : isKerjaBakti ? (
                  <div className="text-[11px] sm:text-xs text-slate-500 font-medium flex flex-col items-center gap-1.5 p-3 text-center">
                    <div className="p-2 rounded-full bg-slate-100 text-slate-400">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-600">Slot Kosong</span>
                    <span className="text-[10px] text-slate-400">Kerja Bakti</span>
                  </div>
                ) : (
                  <div className="text-[11px] sm:text-xs text-slate-500 font-medium flex flex-col items-center gap-1 p-3 text-center">
                    <div className="p-2 rounded-full bg-slate-100 text-slate-400">
                      <ImageOff className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-600">Belum Terisi</span>
                    <span className="text-[10px] text-slate-400">Tarik foto ke sini</span>
                  </div>
                )}
              </div>

              {/* Footer Keterangan & Tindakan Foto */}
              <div className="p-2 sm:p-2.5 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-1.5 text-xs border-t border-slate-200 bg-white">
                {photo ? (
                  <>
                    <div className="flex items-center gap-1 text-slate-700 font-bold truncate">
                      <Clock className="w-3 h-3 text-[#1d3369] shrink-0" />
                      <span className="text-[11px] sm:text-xs truncate">{photo.timeStr} WIB</span>
                    </div>

                    <div className="flex items-center gap-1 justify-end">
                      {/* Dropdown Pindah Tanggal */}
                      <select
                        onChange={(e) => {
                          const target = parseInt(e.target.value, 10)
                          if (!isNaN(target) && target !== group.dayNum) {
                            onMovePhotoToDay(photo.id, group.dayNum, target)
                          }
                          e.target.value = ''
                        }}
                        defaultValue=""
                        className="bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 rounded-md px-1.5 py-0.5 text-[11px] cursor-pointer outline-none font-semibold hover:bg-slate-100"
                        title="Pindahkan foto ke tanggal lain"
                      >
                        <option value="" disabled>Pindah...</option>
                        {availableDays
                          .filter((d) => d !== group.dayNum)
                          .map((d) => (
                            <option key={d} value={d}>
                              Ke Tgl {d.toString().padStart(2, '0')}
                            </option>
                          ))}
                      </select>

                      {/* Tombol Tukar Posisi */}
                      {slotIdx < 2 && group.photos[slotIdx + 1] && (
                        <button
                          type="button"
                          onClick={() => onSwapPhotos(group.dayNum, slotIdx, slotIdx + 1)}
                          className="p-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="Tukar posisi foto dengan slot di sebelahnya"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400 italic text-center xs:text-left py-0.5">
                    {isKerjaBakti ? 'Bisa diisi / kosong' : 'Menunggu foto'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Foto Tambahan Jika Lebih Dari 3: 2 Kolom di HP */}
      {hasExcess && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
          <span className="text-xs font-bold text-slate-700">Foto cadangan di tanggal ini:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {group.photos.slice(3).map((extraPhoto) => (
              <div key={extraPhoto.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5 relative">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                  <img src={extraPhoto.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onPreviewPhoto(extraPhoto, group.dayNum)}
                    className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                  <span>{extraPhoto.timeStr} WIB</span>
                  <select
                    onChange={(e) => {
                      const target = parseInt(e.target.value, 10)
                      if (!isNaN(target)) {
                        onMovePhotoToDay(extraPhoto.id, group.dayNum, target)
                      }
                      e.target.value = ''
                    }}
                    defaultValue=""
                    className="bg-white border border-slate-300 rounded-md text-[10px] text-blue-700 font-bold px-1.5 py-0.5 outline-none hover:bg-slate-50"
                  >
                    <option value="" disabled>Pindah</option>
                    {availableDays.map((d) => (
                      <option key={d} value={d}>
                        Ke Tgl {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
