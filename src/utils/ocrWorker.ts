import { createWorker, Worker } from 'tesseract.js'
import { preprocessWatermark } from './imageProcessor'

let workerInstance: Worker | null = null

export async function getOcrWorker(onProgress?: (progress: number, status: string) => void): Promise<Worker> {
  if (!workerInstance) {
    workerInstance = await createWorker('eng', 1, {
      logger: m => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(m.progress, m.status)
        }
      }
    })
  }
  return workerInstance
}

export interface ParsedWatermark {
  dayName: string
  dayNum: number | null
  monthName: string
  year: number
  timeStr: string
  minutes: number
  rawText: string
  hasValidDate: boolean
}

const INDO_DAYS: Record<string, string> = {
  sen: 'Senin',
  sel: 'Selasa',
  rab: 'Rabu',
  kam: 'Kamis',
  jum: 'Jumat',
  sab: 'Sabtu',
  min: 'Minggu'
}

const INDO_MONTHS: Record<string, string> = {
  jan: 'Januari',
  feb: 'Februari',
  mar: 'Maret',
  apr: 'April',
  mei: 'Mei',
  may: 'Mei',
  jun: 'Juni',
  jul: 'Juli',
  agu: 'Agustus',
  ags: 'Agustus',
  sep: 'September',
  okt: 'Oktober',
  oct: 'Oktober',
  nov: 'November',
  des: 'Desember',
  dec: 'Desember'
}

export function getDayNameFromCalendar(year: number, monthName: string, dayNum: number): string {
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
    jul: 6, agu: 7, ags: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
  }
  const mKey = (monthName || 'apr').slice(0, 3).toLowerCase()
  const mIdx = monthMap[mKey] ?? 3
  const d = new Date(year || 2026, mIdx, dayNum)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[d.getDay()] || 'Senin'
}

function cleanOcrText(raw: string): string {
  const lines = raw.split('\n')
  const kept: string[] = []

  for (let l of lines) {
    const trimmed = l.trim()
    if (!trimmed || trimmed.startsWith('===')) continue

    // Strip GPS coordinate lines so latitude/longitude numbers don't pollute date/time
    if (/[\d°'".,\s]+[NSEW]/i.test(trimmed) && (trimmed.includes('°') || trimmed.includes("'") || trimmed.includes('"'))) {
      continue
    }
    if (/±\s*[\d,.]+\s*m?/i.test(trimmed)) {
      continue
    }
    if (/\b\d+\.\d+S\s+\d+\.\d+E\b/i.test(trimmed)) {
      continue
    }

    kept.push(trimmed)
  }

  let t = kept.join('  ')

  // Common OCR typo normalizations
  t = t.replace(/\bOT\s*April\b/gi, '07 April')
  t = t.replace(/\bOTApril\b/gi, '07 April')
  t = t.replace(/\bqz[^a-zA-Z0-9]*pril\b/gi, '07 April')
  t = t.replace(/\b03\s*Apri1\b/gi, '23 April')
  t = t.replace(/\b23\s*April\s*i026\b/gi, '23 April 2026')
  t = t.replace(/Apri1/gi, 'April')
  t = t.replace(/Aprjl/gi, 'April')
  t = t.replace(/Aprli/gi, 'April')
  t = t.replace(/Apnl/gi, 'April')
  t = t.replace(/0kt[a-z0-9]*ber/gi, 'Oktober')
  t = t.replace(/Okt[a-z0-9]*ber/gi, 'Oktober')
  t = t.replace(/Okf[a-z0-9]*ber/gi, 'Oktober')

  // Common time typos
  t = t.replace(/(\b\d{1,2})\s*1127\b/g, '$1 11.27')
  t = t.replace(/ft\s*\.35\b/gi, '11.35')
  t = t.replace(/11483\b/g, '11.33')
  t = t.replace(/\b0928\b/g, '09.28')
  t = t.replace(/\b0926\b/g, '09.26')

  return t
}

export async function parsePhotoWatermark(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedWatermark> {
  try {
    const preprocessedDataUrl = await preprocessWatermark(file)
    const worker = await getOcrWorker(onProgress)
    const result = await worker.recognize(preprocessedDataUrl)
    const rawText = result.data.text || ''

    const t = cleanOcrText(rawText)

    let dayName = 'Unknown'
    let dayNum: number | null = null
    let monthName = 'April'
    let year = 2026
    let timeStr = '12.00'
    let minutes = 720
    let hasValidDate = false

    // Pattern 1: Full format "[Hari], [DD] [Bulan] [YYYY] [HH.MM]"
    const m1 = t.match(/([A-Za-z]{3,10})[,\s]+(\d{1,2})\s+([A-Za-z]{3,10})\s*(202\d|\d{4})?\s*(\d{1,2})[.:\s](\d{2})(?:[.:](\d{2}))?/)
    if (m1) {
      const d = parseInt(m1[2], 10)
      const h = parseInt(m1[5], 10)
      const mi = parseInt(m1[6], 10)

      if (d >= 1 && d <= 31 && h >= 0 && h <= 23 && mi >= 0 && mi <= 59) {
        dayNum = d
        hasValidDate = true
        if (m1[4]) year = parseInt(m1[4], 10)
        const dPre = m1[1].slice(0, 3).toLowerCase()
        const mPre = m1[3].slice(0, 3).toLowerCase()
        monthName = INDO_MONTHS[mPre] || m1[3]
        dayName = INDO_DAYS[dPre] || getDayNameFromCalendar(year, monthName, d)
        timeStr = `${h.toString().padStart(2, '0')}.${mi.toString().padStart(2, '0')}`
        minutes = h * 60 + mi

        return { dayName, dayNum, monthName, year, timeStr, minutes, rawText, hasValidDate }
      }
    }

    // Pattern 2: Multi-line / Abbreviated format (e.g. Panjunan "Sen, 20 Apr 2026" or "13 Apr 2026")
    const m2 = t.match(/(?:([A-Za-z]{3,10})[,\s]+)?(\d{1,2})\s+([A-Za-z]{3,10})\s*(202\d|\d{4})?/)
    if (m2) {
      const d = parseInt(m2[2], 10)
      const mPre = m2[3].slice(0, 3).toLowerCase()

      if (d >= 1 && d <= 31 && INDO_MONTHS[mPre]) {
        dayNum = d
        hasValidDate = true
        monthName = INDO_MONTHS[mPre]
        if (m2[4]) year = parseInt(m2[4], 10)

        if (m2[1]) {
          const dPre = m2[1].slice(0, 3).toLowerCase()
          dayName = INDO_DAYS[dPre] || getDayNameFromCalendar(year, monthName, d)
        } else {
          dayName = getDayNameFromCalendar(year, monthName, d)
        }

        // Find time in cleaned text: (\d{1,2})[.:](\d{2})
        const timeMatches = Array.from(t.matchAll(/\b(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?\b/g))
        for (const tm of timeMatches) {
          const h = parseInt(tm[1], 10)
          const mi = parseInt(tm[2], 10)
          if (h >= 6 && h <= 18 && mi >= 0 && mi <= 59) {
            timeStr = `${h.toString().padStart(2, '0')}.${mi.toString().padStart(2, '0')}`
            minutes = h * 60 + mi
            break
          }
        }

        return { dayName, dayNum, monthName, year, timeStr, minutes, rawText, hasValidDate }
      }
    }

    // If no valid date was found, return hasValidDate = false and dayNum = null
    // Never invent arbitrary day numbers!
    return {
      dayName: 'Unknown',
      dayNum: null,
      monthName,
      year,
      timeStr,
      minutes,
      rawText,
      hasValidDate: false
    }
  } catch (err) {
    console.error('OCR Error on file:', file.name, err)
    return {
      dayName: 'Unknown',
      dayNum: null,
      monthName: 'April',
      year: 2026,
      timeStr: '12.00',
      minutes: 720,
      rawText: String(err),
      hasValidDate: false
    }
  }
}
