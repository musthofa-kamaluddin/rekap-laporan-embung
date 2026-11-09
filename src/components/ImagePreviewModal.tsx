import React, { useEffect, useState } from 'react'
import { X, ZoomIn, Clock, Calendar, Check } from 'lucide-react'
import { PhotoItem } from '../types'

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  photo: PhotoItem | null
  currentDayNum?: number | null
  onDateChange?: (photoId: string, currentDayNum: number | null, newDayNum: number) => void
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  photo,
  currentDayNum,
  onDateChange
}) => {
  const [justChanged, setJustChanged] = useState<number | null>(null)

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      setJustChanged(null)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  if (!isOpen || !photo) return null

  const activeDay = currentDayNum ?? photo.dayNum ?? null

  const handleSelectDay = (day: number) => {
    if (!photo) return
    onDateChange?.(photo.id, activeDay, day)
    setJustChanged(day)
    setTimeout(() => setJustChanged(null), 2500)
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[94vh]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 bg-[#1d3369] text-white shrink-0">
          <div className="flex items-center gap-2 truncate">
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5 text-[#fdb814] shrink-0" />
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold truncate">{photo.fileName}</h3>
              <div className="flex items-center gap-3 text-[11px] text-blue-100">
                {photo.timeStr && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#fdb814]" />
                    {photo.timeStr} WIB {photo.progressType ? `(${photo.progressType})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors ml-2 shrink-0"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Toolbar Interaktif: Pilih / Ganti Tanggal Langsung Saat Peek */}
        <div className="px-3 sm:px-5 py-2.5 bg-blue-50 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1d3369] shrink-0" />
            <span className="text-xs font-bold text-slate-800">Tanggal Saat Ini:</span>
            {activeDay ? (
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#1d3369] text-white shadow-xs">
                TGL {activeDay.toString().padStart(2, '0')}
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                Belum Ditentukan
              </span>
            )}

            {justChanged && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md animate-in fade-in">
                <Check className="w-3 h-3 text-emerald-700" />
                Dipindah ke Tgl {justChanged.toString().padStart(2, '0')}!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-bold text-[#1d3369] hidden sm:inline">
              Pilih Tanggal:
            </span>
            <div className="relative">
              <select
                value={activeDay || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) handleSelectDay(val)
                }}
                className="bg-white border-2 border-[#1d3369] text-[#1d3369] font-bold text-xs sm:text-sm rounded-xl px-3 py-1.5 outline-none shadow-sm cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <option value="" disabled>-- Pilih Tanggal --</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Pindah ke Tgl {d.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Big Zoom Image Area */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-auto min-h-[260px]">
          <img
            src={photo.previewUrl}
            alt={photo.fileName}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
          />
        </div>

        {/* Quick Date Picker Pills on Mobile / Desktop */}
        <div className="px-3 sm:px-4 py-2 bg-slate-100 border-t border-slate-200 overflow-x-auto shrink-0 flex items-center gap-1.5 scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1">
            Klik Cepat:
          </span>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
            const isSelected = activeDay === d
            return (
              <button
                key={d}
                type="button"
                onClick={() => handleSelectDay(d)}
                className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1d3369] text-white border-[#1d3369] shadow-sm scale-105'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400'
                }`}
              >
                {d.toString().padStart(2, '0')}
              </button>
            )
          })}
        </div>

        {/* Footer / Helper Bar */}
        <div className="px-3 sm:px-4 py-2 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span className="text-[11px] text-slate-500 truncate mr-2">
            Periksa watermark tanggal & jam pada sudut foto
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors shrink-0"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
