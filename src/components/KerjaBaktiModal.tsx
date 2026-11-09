import React, { useState, useEffect, useRef } from 'react'
import { X, Wrench, MapPin, Check } from 'lucide-react'

interface KerjaBaktiModalProps {
  isOpen: boolean
  onClose: () => void
  dayNum: number | null
  initialLokasi?: string
  availableDays?: number[]
  onConfirm: (dayNum: number, lokasi: string) => void
}

export const KerjaBaktiModal: React.FC<KerjaBaktiModalProps> = ({
  isOpen,
  onClose,
  dayNum,
  initialLokasi = 'EMBUNG BANJARANYAR',
  availableDays = [],
  onConfirm
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(dayNum || 1)
  const [lokasi, setLokasi] = useState<string>(initialLokasi)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dayNum) {
      setSelectedDay(dayNum)
    }
    setLokasi(initialLokasi || 'EMBUNG BANJARANYAR')
  }, [dayNum, initialLokasi, isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanLokasi = lokasi.trim().toUpperCase() || 'EMBUNG BANJARANYAR'
    onConfirm(selectedDay, cleanLokasi)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white border border-amber-300 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4 text-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-slate-950">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight">Tandai Kerja Bakti</h3>
              <p className="text-xs font-semibold text-slate-900/80">
                {dayNum ? `Untuk Tanggal ${dayNum.toString().padStart(2, '0')}` : 'Tentukan Tanggal & Lokasi'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 text-slate-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800">
          {/* Tanggal Selection if not fixed */}
          {!dayNum && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pilih Tanggal:
              </label>
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-[#1d3369] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>
                    Tgl {d.toString().padStart(2, '0')} {availableDays.includes(d) ? '(Sudah Ada Foto)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lokasi Input with Auto Capslock */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Lokasi Embung Kerja Bakti:</span>
              </label>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                AUTO CAPSLOCK
              </span>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={lokasi}
              placeholder="CONTOH: EMBUNG BANJARANYAR"
              onChange={e => setLokasi(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold uppercase tracking-wide text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Ketikkan nama embung, teks otomatis menjadi huruf kapital. Lokasi ini akan tercetak merah pada laporan Excel hari ini.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            💡 <strong>Info:</strong> Foto kerja bakti tidak wajib kosong. Jika ada foto dokumentasi di tanggal ini, foto akan tetap ditampilkan dan dimasukkan ke laporan.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Kerja Bakti</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
