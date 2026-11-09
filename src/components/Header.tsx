import React from 'react'
import { Sliders } from 'lucide-react'

interface HeaderProps {
  onOpenSettings: () => void
  isProcessing: boolean
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, isProcessing }) => {
  return (
    <header className="bg-[#1d3369] border-b-4 border-[#fdb814] shadow-md sticky top-0 z-40 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Official BBWS Bengawan Solo Logo Banner */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/ikonbbws.png"
            alt="BBWS Bengawan Solo"
            className="h-9 sm:h-11 md:h-12 w-auto object-contain shrink-0"
            style={{ aspectRatio: '1180 / 211' }}
          />

          {/* Teks judul hanya tampil jika lebar layar di atas 860px */}
          <div className="hidden min-[861px]:flex items-center gap-3">
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
                SISTEM REKAP LAPORAN OP EMBUNG
              </span>
              <span className="text-[11px] text-[#fdb814] font-medium">
                Wilayah Sungai Bengawan Solo
              </span>
            </div>
          </div>
        </div>

        {/* Right: Tombol Pengaturan Selalu di Kanan (Right Aligned di HP) */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {isProcessing && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-medium text-white animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#fdb814]" />
              <span>Memproses...</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#1d3369] text-xs sm:text-sm font-bold shadow-sm transition-all border border-transparent active:scale-95"
            title="Pengaturan Format Laporan"
          >
            <Sliders className="w-4 h-4 text-[#1d3369] shrink-0" />
            <span className="hidden xs:inline">Pengaturan</span>
            <span className="inline xs:hidden">Format</span>
          </button>
        </div>
      </div>
    </header>
  )
}
