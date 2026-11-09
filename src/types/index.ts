export interface PhotoItem {
  id: string
  file: File
  previewUrl: string
  fileName: string
  dayName: string
  dayNum: number | null
  monthName: string
  year: number
  timeStr: string
  minutes: number
  progressType: '0%' | '50%' | '100%'
  rawOcrText?: string
  confidence?: number
  isEstimated?: boolean
  aiExplanation?: string
}

export interface DayGroup {
  dayNum: number
  dayName: string
  monthName: string
  year: number
  photos: PhotoItem[]
  isKerjaBakti?: boolean
  customLokasi?: string
  customPekerjaan?: string
  customKeterangan?: string
}

export interface ReportConfig {
  kegiatan: string
  lokasi: string
  pekerjaan: string
  bulan: string
  tahun: number
  keterangan: string
  kerjaBaktiDays: string // Comma-separated day numbers, e.g. "8, 26"
  geminiApiKey: string
}
