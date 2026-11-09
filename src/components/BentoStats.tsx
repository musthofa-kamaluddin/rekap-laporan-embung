import React from 'react'
import { DayGroup, ReportConfig } from '../types'
import { Calendar, CheckCircle2, Clock, MapPin, AlertCircle } from 'lucide-react'

interface BentoStatsProps {
  dayGroups: DayGroup[]
  totalPhotos: number
  config: ReportConfig
}

export const BentoStats: React.FC<BentoStatsProps> = ({ dayGroups, totalPhotos, config }) => {
  const completeDays = dayGroups.filter(g => g.photos.length === 3 || g.isKerjaBakti).length
  const incompleteDays = dayGroups.filter(g => g.photos.length !== 3 && !g.isKerjaBakti).length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* 1. Total Foto */}
      <div className="p-3.5 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between border-l-4 border-l-[#1d3369]">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">Total Foto</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-[#1d3369]">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{totalPhotos}</span>
          <span className="text-[10px] sm:text-xs font-medium text-slate-500">terbaca</span>
        </div>
        <div className="mt-1.5 text-[10px] sm:text-xs text-slate-600 truncate">
          Target: <strong>{dayGroups.length * 3} foto</strong> (3/hari)
        </div>
      </div>

      {/* 2. Hari Kerja */}
      <div className="p-3.5 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between border-l-4 border-l-[#fdb814]">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">Hari Aktif</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 text-amber-700">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{dayGroups.length}</span>
          <span className="text-[10px] sm:text-xs font-medium text-slate-500">hari</span>
        </div>
        <div className="mt-1.5 text-[10px] sm:text-xs text-slate-600 font-semibold truncate">
          Bulan: <strong className="text-blue-900">{config.bulan} {config.tahun}</strong>
        </div>
      </div>

      {/* 3. Kelengkapan Triplet */}
      <div className={`p-3.5 sm:p-5 rounded-xl bg-white border shadow-xs flex flex-col justify-between border-l-4 ${
        incompleteDays === 0 && dayGroups.length > 0 ? 'border-l-emerald-500 border-slate-200' : 'border-l-amber-500 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">Kelengkapan</span>
          <div className={`p-1.5 sm:p-2 rounded-lg ${
            incompleteDays === 0 && dayGroups.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {incompleteDays === 0 && dayGroups.length > 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{completeDays}</span>
          <span className="text-[10px] sm:text-xs font-medium text-slate-500">/ {dayGroups.length} hari</span>
        </div>
        <div className="mt-1.5 text-[10px] sm:text-xs font-bold truncate">
          {dayGroups.length === 0 ? (
            <span className="text-slate-400">Belum ada data</span>
          ) : incompleteDays > 0 ? (
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              ⚠️ {incompleteDays} hari perlu dicek
            </span>
          ) : (
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              ✅ Semua lengkap
            </span>
          )}
        </div>
      </div>

      {/* 4. Lokasi Titik OP */}
      <div className="p-3.5 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between border-l-4 border-l-blue-600">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">Titik Lokasi</span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-blue-700">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
          {config.lokasi}
        </div>
        <div className="mt-1.5 text-[10px] sm:text-xs text-slate-500 truncate font-semibold">
          {config.pekerjaan}
        </div>
      </div>
    </div>
  )
}
