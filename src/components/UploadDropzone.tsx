import React, { useRef, useState } from 'react'
import { UploadCloud, FolderUp, Image as ImageIcon, Loader2 } from 'lucide-react'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  isProcessing: boolean
  processingProgress: { current: number; total: number; fileName: string; status: string }
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesSelected,
  isProcessing,
  processingProgress
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files).filter(f =>
        f.type.startsWith('image/') || f.name.toLowerCase().match(/\.(jpe?g|png|webp)$/)
      )
      if (fileList.length > 0) {
        onFilesSelected(fileList)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files).filter(f =>
        f.type.startsWith('image/') || f.name.toLowerCase().match(/\.(jpe?g|png|webp)$/)
      )
      onFilesSelected(fileList)
      e.target.value = ''
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all p-8 sm:p-10 flex flex-col items-center justify-center text-center shadow-sm ${
        isDragOver
          ? 'border-[#1d3369] bg-blue-50/60'
          : 'border-slate-300 bg-white hover:border-[#1d3369] hover:bg-slate-50/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in browsers
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {isProcessing ? (
        <div className="w-full max-w-lg py-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Loader2 className="w-5 h-5 text-[#1d3369] animate-spin" />
            <span className="text-sm font-bold text-slate-800">
              Sedang Membaca Watermark Jam & Tanggal Foto...
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2 font-mono">
            <span>Kemajuan Proses</span>
            <span className="text-[#1d3369]">
              {processingProgress.current} dari {processingProgress.total} Foto (
              {processingProgress.total > 0
                ? Math.round((processingProgress.current / processingProgress.total) * 100)
                : 0}
              %)
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden shadow-inner">
            <div
              className="h-full bg-[#1d3369] rounded-full transition-all duration-200"
              style={{
                width: `${
                  processingProgress.total > 0
                    ? Math.round((processingProgress.current / processingProgress.total) * 100)
                    : 0
                }%`
              }}
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 font-mono truncate px-4 py-1.5 rounded-lg bg-slate-100 max-w-md mx-auto">
            <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{processingProgress.fileName || 'Menyiapkan...'}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1d3369] mb-4 shadow-sm">
            <UploadCloud className="w-8 h-8 text-[#1d3369]" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
            Tarik & Jatuhkan Foto Laporan ke Sini
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mb-6 leading-relaxed">
            Sistem otomatis membaca tanggal dan jam dari watermark foto, membagi per hari kerja, dan menyusun urutan progres <strong>0% (Pagi)</strong>, <strong>50% (Siang)</strong>, dan <strong>100% (Selesai)</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1d3369] hover:bg-[#14234b] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Pilih Beberapa Foto Sekaligus</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#fdb814] hover:bg-[#e8a60e] text-[#1d3369] text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all border border-amber-300"
            >
              <FolderUp className="w-4 h-4 text-[#1d3369]" />
              <span>Pilih 1 Folder Utuh</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
