import React, { useState, useEffect } from 'react'
import { ReportConfig } from '../types'
import { X, Save, Building2 } from 'lucide-react'

interface ConfigModalProps {
  isOpen: boolean
  onClose: () => void
  config: ReportConfig
  onSave: (config: ReportConfig) => void
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  const [formData, setFormData] = useState<ReportConfig>(config)

  useEffect(() => {
    setFormData(config)
  }, [config])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal - PUPR Navy */}
        <div className="flex items-center justify-between bg-[#1d3369] border-b-2 border-[#fdb814] px-5 sm:px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#fdb814]" />
            <div>
              <h2 className="text-sm sm:text-base font-bold">Pengaturan Format Laporan</h2>
              <p className="text-xs text-blue-100">Sesuaikan data identitas dan header laporan Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Isi */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kegiatan</label>
            <input
              type="text"
              value={formData.kegiatan}
              onChange={e => setFormData({ ...formData, kegiatan: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Titik Embung</label>
            <input
              type="text"
              value={formData.lokasi}
              onChange={e => setFormData({ ...formData, lokasi: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pekerjaan</label>
            <input
              type="text"
              value={formData.pekerjaan}
              onChange={e => setFormData({ ...formData, pekerjaan: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bulan Laporan</label>
              <input
                type="text"
                value={formData.bulan}
                onChange={e => setFormData({ ...formData, bulan: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahun</label>
              <input
                type="number"
                value={formData.tahun}
                onChange={e => setFormData({ ...formData, tahun: parseInt(e.target.value, 10) || 2026 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Aktivitas</label>
            <input
              type="text"
              value={formData.keterangan}
              onChange={e => setFormData({ ...formData, keterangan: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tanggal Kerja Bakti Default (Opsional)
            </label>
            <input
              type="text"
              value={formData.kerjaBaktiDays || ''}
              placeholder="Contoh: 8, 26 (kosongkan jika tidak ada)"
              onChange={e => setFormData({ ...formData, kerjaBaktiDays: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Anda juga dapat menandai atau mengubah lokasi kerja bakti langsung pada setiap kartu hari di halaman utama.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1d3369] hover:bg-[#14234b] text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
