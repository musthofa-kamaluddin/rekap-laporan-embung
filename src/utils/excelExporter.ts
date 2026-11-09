import JSZip from 'jszip'
import { DayGroup, ReportConfig } from '../types'
import { fileToArrayBuffer } from './imageProcessor'
import { CLEAN_STYLES_XML } from './excelStyles'

function resolveDayName(dayName: string | undefined, year: number, monthStr: string, dayNum: number): string {
  if (dayName && dayName.trim().length > 0 && dayName.toLowerCase() !== 'unknown') {
    return dayName
  }
  const monthMap: Record<string, number> = {
    JANUARI: 0, FEBRUARI: 1, MARET: 2, APRIL: 3, MEI: 4, JUNI: 5,
    JULI: 6, AGUSTUS: 7, SEPTEMBER: 8, OKTOBER: 9, NOVEMBER: 10, DESEMBER: 11
  }
  const m = monthMap[(monthStr || 'APRIL').toUpperCase()] ?? 3
  const d = new Date(year || 2026, m, dayNum)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[d.getDay()] || 'Senin'
}

export async function exportReportToExcel(
  dayGroups: DayGroup[],
  config: ReportConfig,
  onProgress?: (percent: number, message: string) => void
): Promise<Blob> {
  onProgress?.(10, 'Memuat template master...')
  const templateResponse = await fetch('/template.xlsx')
  if (!templateResponse.ok) {
    throw new Error('Gagal memuat template.xlsx dari server.')
  }
  const templateBuffer = await templateResponse.arrayBuffer()
  const zip = await JSZip.loadAsync(templateBuffer)

  onProgress?.(20, 'Membersihkan kalkulasi dan metadata...')

  // 1. Purge calcChain.xml and set pristine OpenXML package metadata
  if (zip.file('xl/calcChain.xml')) {
    zip.remove('xl/calcChain.xml')
  }

  // Inject 100% clean, prefix-free styles.xml to prevent Excel HRESULT 0x808c0002 style recovery error
  zip.file('xl/styles.xml', CLEAN_STYLES_XML)

  const validCt = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
  zip.file('[Content_Types].xml', validCt)

  const validWbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`
  zip.file('xl/_rels/workbook.xml.rels', validWbRels)

  // Clear any existing template media
  const existingFiles = Object.keys(zip.files)
  for (const f of existingFiles) {
    if (f.startsWith('xl/media/')) {
      zip.remove(f)
    }
  }

  onProgress?.(30, 'Menyiapkan teks dan header...')

  // 2. Shared Strings table
  const ssList: string[] = [
    "FOTO DOKUMENTASI ",
    "KEGIATAN",
    ":",
    config.kegiatan || "LAPORAN PROGRES OP SDA IV EMBUNG BENGAWAN SOLO",
    "LOKASI",
    config.lokasi || "EMBUNG PINGGIR (BPA) DESA. PINGGIR KEC. BALONGPANGGANG KAB. GRESIK",
    "EMBUNG BANJARANYAR",
    "PEKERJAAN",
    config.pekerjaan || "PEKERJAAN RUTIN PETUGAS EMBUNG",
    "KERJA BAKTI",
    "HARI,TANGGAL",
    "BULAN",
    (config.bulan || "OKTOBER").toUpperCase(),
    "0%",
    "50%",
    "100%",
    "KETERANGAN",
    config.keterangan || "PEMBERSIHAN SEMAK-SEMAK"
  ]

  const ssMap = new Map<string, number>()
  ssList.forEach((s, idx) => ssMap.set(s, idx))

  function getSsId(str: string): number {
    if (!ssMap.has(str)) {
      const newId = ssList.length
      ssList.push(str)
      ssMap.set(str, newId)
      return newId
    }
    return ssMap.get(str)!
  }

  // Prepopulate date strings and custom texts (Never allow UNKNOWN)
  dayGroups.forEach(g => {
    const dName = resolveDayName(g.dayName, config.tahun, config.bulan, g.dayNum)
    const dStr = `${dName.toUpperCase()}, ${g.dayNum.toString().padStart(2, '0')}`
    getSsId(dStr)
    if (g.customLokasi) getSsId(g.customLokasi)
    if (g.customPekerjaan) getSsId(g.customPekerjaan)
    if (g.customKeterangan) getSsId(g.customKeterangan)
  })

  // Build sharedStrings.xml
  let ssXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  ssXml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ssList.length * 20}" uniqueCount="${ssList.length}">`
  for (const s of ssList) {
    ssXml += `<si><t>${escapeXml(s)}</t></si>`
  }
  ssXml += '</sst>'
  zip.file('xl/sharedStrings.xml', ssXml)

  onProgress?.(45, 'Menyusun tabel Excel dan merge cell...')

  // 3. Build sheet1.xml directly as a clean, compliant XML string
  let sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  sheetXml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
  sheetXml += 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  sheetXml += 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
  sheetXml += 'xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" '
  sheetXml += 'mc:Ignorable="x14ac">\n'

  const totalRows = 3 + dayGroups.length * 24
  sheetXml += `  <dimension ref="A1:AB${totalRows}"/>\n`
  sheetXml += '  <sheetViews>\n'
  sheetXml += '    <sheetView tabSelected="1" zoomScale="61" zoomScaleNormal="145" workbookViewId="0">\n'
  sheetXml += '      <selection activeCell="A1" sqref="A1"/>\n'
  sheetXml += '    </sheetView>\n'
  sheetXml += '  </sheetViews>\n'
  sheetXml += '  <sheetFormatPr defaultColWidth="14.42578125" defaultRowHeight="15" customHeight="1" x14ac:dyDescent="0.25"/>\n'
  sheetXml += '  <cols>\n'
  sheetXml += '    <col min="1" max="1" width="5" customWidth="1"/>\n'
  sheetXml += '    <col min="2" max="2" width="8.28515625" customWidth="1"/>\n'
  sheetXml += '    <col min="3" max="3" width="8.7109375" customWidth="1"/>\n'
  sheetXml += '    <col min="4" max="6" width="5" customWidth="1"/>\n'
  sheetXml += '    <col min="7" max="7" width="8.42578125" customWidth="1"/>\n'
  sheetXml += '    <col min="8" max="8" width="9.28515625" customWidth="1"/>\n'
  sheetXml += '    <col min="9" max="10" width="5" customWidth="1"/>\n'
  sheetXml += '    <col min="11" max="11" width="8.85546875" customWidth="1"/>\n'
  sheetXml += '    <col min="12" max="13" width="5" customWidth="1"/>\n'
  sheetXml += '    <col min="14" max="14" width="8.42578125" customWidth="1"/>\n'
  sheetXml += '    <col min="15" max="15" width="5" customWidth="1"/>\n'
  sheetXml += '    <col min="16" max="16" width="7.42578125" customWidth="1"/>\n'
  sheetXml += '    <col min="17" max="17" width="9.7109375" customWidth="1"/>\n'
  sheetXml += '    <col min="18" max="19" width="5" customWidth="1"/>\n'
  sheetXml += '    <col min="20" max="20" width="8" customWidth="1"/>\n'
  sheetXml += '    <col min="21" max="21" width="10.140625" customWidth="1"/>\n'
  sheetXml += '    <col min="22" max="26" width="5" customWidth="1"/>\n'
  sheetXml += '    <col min="27" max="27" width="9.42578125" customWidth="1"/>\n'
  sheetXml += '    <col min="28" max="28" width="5" customWidth="1"/>\n'
  sheetXml += '  </cols>\n'

  sheetXml += '  <sheetData>\n'

  const mergeRefs: string[] = []
  const colsLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB']

  for (let blockIdx = 0; blockIdx < dayGroups.length; blockIdx++) {
    const group = dayGroups[blockIdx]
    const r0 = 3 + blockIdx * 24
    const dName = resolveDayName(group.dayName, config.tahun, config.bulan, group.dayNum)
    const dateStr = `${dName.toUpperCase()}, ${group.dayNum.toString().padStart(2, '0')}`

    const isBanjaranyar = Boolean(group.isKerjaBakti)
    const lokasiText = group.customLokasi || (isBanjaranyar ? "EMBUNG BANJARANYAR" : config.lokasi)
    const pekerjaanText = group.customPekerjaan || (isBanjaranyar ? "KERJA BAKTI" : config.pekerjaan)
    const keteranganText = group.customKeterangan || (isBanjaranyar ? "KERJA BAKTI" : config.keterangan)

    mergeRefs.push(
      `B${r0}:AB${r0}`,         // Row 3: FOTO DOKUMENTASI
      `B${r0+7}:I${r0+18}`,     // Rows 10-21: Photo 1 frame
      `K${r0+7}:R${r0+18}`,     // Rows 10-21: Photo 2 frame
      `T${r0+7}:AA${r0+18}`,    // Rows 10-21: Photo 3 frame
      `B${r0+19}:I${r0+20}`,    // Rows 22-23: 0%
      `K${r0+19}:R${r0+20}`,    // Rows 22-23: 50%
      `T${r0+19}:AA${r0+20}`,   // Rows 22-23: 100%
      `B${r0+21}:I${r0+21}`,    // Row 24: KETERANGAN
      `K${r0+21}:R${r0+21}`,    // Row 24: KETERANGAN
      `T${r0+21}:AA${r0+21}`,   // Row 24: KETERANGAN
      `B${r0+22}:I${r0+22}`,    // Row 25: Activity
      `K${r0+22}:R${r0+22}`,    // Row 25: Activity
      `T${r0+22}:AA${r0+22}`    // Row 25: Activity
    )

    for (let offset = 0; offset < 24; offset++) {
      const currR = r0 + offset
      let rowAttrs = `r="${currR}" spans="1:28"`
      if (offset <= 5) {
        rowAttrs += ' ht="18.75" customHeight="1"'
      } else if (offset >= 7 && offset <= 18) {
        rowAttrs += ' ht="15" customHeight="1"'
      } else if (offset >= 19 && offset <= 22) {
        rowAttrs += ' ht="16.5" customHeight="1"'
      }

      sheetXml += `    <row ${rowAttrs}>\n`

      function cellXml(col: string, val: string | number | null, sType?: string, style?: number): string {
        let res = `      <c r="${col}${currR}"`
        if (style !== undefined) res += ` s="${style}"`
        if (sType) res += ` t="${sType}"`
        if (val !== null && val !== undefined) {
          res += `><v>${val}</v></c>\n`
        } else {
          res += `/>\n`
        }
        return res
      }

      if (offset === 0) {
        // Row 3: FOTO DOKUMENTASI (Arial, 16pt, Bold, Centered) -> s=26
        sheetXml += cellXml('B', getSsId("FOTO DOKUMENTASI "), 's', 26)
        for (const cName of colsLetters.slice(2)) {
          sheetXml += cellXml(cName, null, undefined, 27)
        }
      } else if (offset === 1) {
        // Row 4: KEGIATAN -> s=2
        sheetXml += cellXml('B', getSsId("KEGIATAN"), 's', 2)
        sheetXml += cellXml('D', getSsId(":"), 's', 2)
        sheetXml += cellXml('E', getSsId(config.kegiatan || "LAPORAN PROGRES OP SDA IV EMBUNG BENGAWAN SOLO"), 's', 2)
      } else if (offset === 2) {
        // Row 5: LOKASI (RED font 14pt -> s=3)
        sheetXml += cellXml('B', getSsId("LOKASI"), 's', 2)
        sheetXml += cellXml('D', getSsId(":"), 's', 2)
        sheetXml += cellXml('E', getSsId(lokasiText), 's', 3)
      } else if (offset === 3) {
        // Row 6: PEKERJAAN
        sheetXml += cellXml('B', getSsId("PEKERJAAN"), 's', 2)
        sheetXml += cellXml('D', getSsId(":"), 's', 2)
        sheetXml += cellXml('E', getSsId(pekerjaanText), 's', 2)
      } else if (offset === 4) {
        // Row 7: HARI,TANGGAL
        sheetXml += cellXml('B', getSsId("HARI,TANGGAL"), 's', 2)
        sheetXml += cellXml('D', getSsId(":"), 's', 2)
        sheetXml += cellXml('E', getSsId(dateStr), 's', 2)
      } else if (offset === 5) {
        // Row 8: BULAN
        sheetXml += cellXml('B', getSsId("BULAN"), 's', 2)
        sheetXml += cellXml('D', getSsId(":"), 's', 2)
        sheetXml += cellXml('E', getSsId((config.bulan || "OKTOBER").toUpperCase()), 's', 2)
      } else if (offset === 7) {
        // Row 10: Top border of photo boxes
        sheetXml += cellXml('B', null, undefined, 23)
        for (const c of ['C','D','E','F','G','H']) sheetXml += cellXml(c, null, undefined, 30)
        sheetXml += cellXml('I', null, undefined, 31)
        sheetXml += cellXml('J', null, undefined, 1) // Spacer
        sheetXml += cellXml('K', null, undefined, 23)
        for (const c of ['L','M','N','O','P','Q']) sheetXml += cellXml(c, null, undefined, 30)
        sheetXml += cellXml('R', null, undefined, 21)
        sheetXml += cellXml('S', null, undefined, 1) // Spacer
        sheetXml += cellXml('T', null, undefined, 25)
        for (const c of ['U','V','W','X','Y','Z']) sheetXml += cellXml(c, null, undefined, 30)
        sheetXml += cellXml('AA', null, undefined, 21)
      } else if (offset >= 8 && offset <= 17) {
        // Rows 11-20: Sides of photo boxes
        sheetXml += cellXml('B', null, undefined, 32)
        for (const c of ['C','D','E','F','G','H']) sheetXml += cellXml(c, null, undefined, 33)
        sheetXml += cellXml('I', null, undefined, 34)
        sheetXml += cellXml('J', null, undefined, 1)
        sheetXml += cellXml('K', null, undefined, 22)
        for (const c of ['L','M','N','O','P','Q']) sheetXml += cellXml(c, null, undefined, 33)
        sheetXml += cellXml('R', null, undefined, 15)
        sheetXml += cellXml('S', null, undefined, 1)
        sheetXml += cellXml('T', null, undefined, 22)
        for (const c of ['U','V','W','X','Y','Z']) sheetXml += cellXml(c, null, undefined, 33)
        sheetXml += cellXml('AA', null, undefined, 15)
      } else if (offset === 18) {
        // Row 21: Bottom border of photo boxes
        sheetXml += cellXml('B', null, undefined, 35)
        for (const c of ['C','D','E','F','G','H']) sheetXml += cellXml(c, null, undefined, 36)
        sheetXml += cellXml('I', null, undefined, 37)
        sheetXml += cellXml('J', null, undefined, 1)
        sheetXml += cellXml('K', null, undefined, 24)
        for (const c of ['L','M','N','O','P','Q']) sheetXml += cellXml(c, null, undefined, 36)
        sheetXml += cellXml('R', null, undefined, 18)
        sheetXml += cellXml('S', null, undefined, 1)
        sheetXml += cellXml('T', null, undefined, 24)
        for (const c of ['U','V','W','X','Y','Z']) sheetXml += cellXml(c, null, undefined, 36)
        sheetXml += cellXml('AA', null, undefined, 18)
      } else if (offset === 19) {
        // Row 22: Progress labels top (0%, 50%, 100%) -> s=19 (Calibri 20 Bold Centered Bottom)
        sheetXml += cellXml('B', getSsId("0%"), 's', 19)
        for (const c of ['C','D','E','F','G','H']) sheetXml += cellXml(c, null, undefined, 20)
        sheetXml += cellXml('I', null, undefined, 21)
        sheetXml += cellXml('J', null, undefined, 1)
        sheetXml += cellXml('K', getSsId("50%"), 's', 19)
        for (const c of ['L','M','N','O','P','Q']) sheetXml += cellXml(c, null, undefined, 20)
        sheetXml += cellXml('R', null, undefined, 21)
        sheetXml += cellXml('S', null, undefined, 1)
        sheetXml += cellXml('T', getSsId("100%"), 's', 19)
        for (const c of ['U','V','W','X','Y','Z']) sheetXml += cellXml(c, null, undefined, 20)
        sheetXml += cellXml('AA', null, undefined, 21)
      } else if (offset === 20) {
        // Row 23: Progress labels bottom border
        sheetXml += cellXml('B', null, undefined, 22)
        for (const c of ['C','D','E','F','G','H']) sheetXml += cellXml(c, null, undefined, 14)
        sheetXml += cellXml('I', null, undefined, 15)
        sheetXml += cellXml('J', null, undefined, 1)
        sheetXml += cellXml('K', null, undefined, 22)
        for (const c of ['L','M','N','O','P','Q']) sheetXml += cellXml(c, null, undefined, 14)
        sheetXml += cellXml('R', null, undefined, 15)
        sheetXml += cellXml('S', null, undefined, 1)
        sheetXml += cellXml('T', null, undefined, 22)
        for (const c of ['U','V','W','X','Y','Z']) sheetXml += cellXml(c, null, undefined, 14)
        sheetXml += cellXml('AA', null, undefined, 15)
      } else if (offset === 21) {
        // Row 24: KETERANGAN -> s=13 (Calibri 14 Normal Centered)
        sheetXml += cellXml('B', getSsId("KETERANGAN"), 's', 13)
        for (const c of ['C','D','E','F','G','H']) sheetXml += cellXml(c, null, undefined, 14)
        sheetXml += cellXml('I', null, undefined, 15)
        sheetXml += cellXml('J', null, undefined, 1)
        sheetXml += cellXml('K', getSsId("KETERANGAN"), 's', 13)
        for (const c of ['L','M','N','O','P','Q']) sheetXml += cellXml(c, null, undefined, 14)
        sheetXml += cellXml('R', null, undefined, 15)
        sheetXml += cellXml('S', null, undefined, 1)
        sheetXml += cellXml('T', getSsId("KETERANGAN"), 's', 13)
        for (const c of ['U','V','W','X','Y','Z']) sheetXml += cellXml(c, null, undefined, 14)
        sheetXml += cellXml('AA', null, undefined, 15)
      } else if (offset === 22) {
        // Row 25: Activity text -> s=16 (Calibri 14 RED Centered)
        sheetXml += cellXml('B', getSsId(keteranganText), 's', 16)
        for (const c of ['C','D','E','F','G','H']) sheetXml += cellXml(c, null, undefined, 17)
        sheetXml += cellXml('I', null, undefined, 18)
        sheetXml += cellXml('J', null, undefined, 1)
        sheetXml += cellXml('K', getSsId(keteranganText), 's', 16)
        for (const c of ['L','M','N','O','P','Q']) sheetXml += cellXml(c, null, undefined, 17)
        sheetXml += cellXml('R', null, undefined, 18)
        sheetXml += cellXml('S', null, undefined, 1)
        sheetXml += cellXml('T', getSsId(keteranganText), 's', 16)
        for (const c of ['U','V','W','X','Y','Z']) sheetXml += cellXml(c, null, undefined, 17)
        sheetXml += cellXml('AA', null, undefined, 18)
      }

      sheetXml += '    </row>\n'
    }
  }

  sheetXml += '  </sheetData>\n'

  sheetXml += `  <mergeCells count="${mergeRefs.length}">\n`
  for (const ref of mergeRefs) {
    sheetXml += `    <mergeCell ref="${ref}"/>\n`
  }
  sheetXml += '  </mergeCells>\n'

  sheetXml += '  <phoneticPr fontId="12" type="noConversion"/>\n'
  sheetXml += '  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0" footer="0"/>\n'
  sheetXml += '  <pageSetup orientation="landscape"/>\n'
  sheetXml += '  <drawing r:id="rId1"/>\n'
  sheetXml += '</worksheet>'

  zip.file('xl/worksheets/sheet1.xml', sheetXml)

  onProgress?.(60, 'Menyematkan foto ke dalam laporan...')

  // 4. Build drawings and relationships
  let imgCounter = 1
  let drawXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  drawXml += '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'

  let relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  relsXml += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'

  const positions = [
    { col: 0, colOff: 333374, xOff: 333374, cx: 3648075, cy: 2400300 },
    { col: 9, colOff: 333374, xOff: 4314824, cx: 3629025, cy: 2400300 },
    { col: 19, colOff: 0, xOff: 8277225, cx: 3505200, cy: 2400300 }
  ]

  for (let blockIdx = 0; blockIdx < dayGroups.length; blockIdx++) {
    const group = dayGroups[blockIdx]
    const photos = group.photos

    // If day has NO photos, skip adding drawings (boxes remain empty with borders intact).
    // Kerja bakti can also have photos if uploaded.
    if (!photos || photos.length === 0) {
      continue
    }

    const baseRow = blockIdx === 0 ? 8 : 8 + 25 + (blockIdx - 1) * 24
    const baseY = blockIdx === 0 ? 2076449 : 7400925 + (blockIdx - 1) * 4800600
    const rowOff = blockIdx === 0 ? 247649 : 0

    for (let photoIdx = 0; photoIdx < Math.min(photos.length, 3); photoIdx++) {
      const photo = photos[photoIdx]
      const rId = `rId${imgCounter}`
      const ext = photo.file.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
      const mediaName = `image${imgCounter}.${ext}`

      const imgBuffer = await fileToArrayBuffer(photo.file)
      zip.file(`xl/media/${mediaName}`, imgBuffer)

      relsXml += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/>`

      const pos = positions[photoIdx]

      drawXml += `<xdr:oneCellAnchor>`
      drawXml += `<xdr:from><xdr:col>${pos.col}</xdr:col><xdr:colOff>${pos.colOff}</xdr:colOff><xdr:row>${baseRow}</xdr:row><xdr:rowOff>${rowOff}</xdr:rowOff></xdr:from>`
      drawXml += `<xdr:ext cx="${pos.cx}" cy="${pos.cy}"/>`
      drawXml += `<xdr:pic>`
      drawXml += `<xdr:nvPicPr><xdr:cNvPr id="${imgCounter + 1}" name="${mediaName}"/><xdr:cNvPicPr preferRelativeResize="0"/></xdr:nvPicPr>`
      drawXml += `<xdr:blipFill><a:blip r:embed="${rId}" cstate="print"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`
      drawXml += `<xdr:spPr><a:xfrm><a:off x="${pos.xOff}" y="${baseY}"/><a:ext cx="${pos.cx}" cy="${pos.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>`
      drawXml += `</xdr:pic>`
      drawXml += `<xdr:clientData/>`
      drawXml += `</xdr:oneCellAnchor>`

      imgCounter++
    }
  }

  drawXml += '</xdr:wsDr>'
  relsXml += '</Relationships>'

  zip.file('xl/drawings/drawing1.xml', drawXml)
  zip.file('xl/drawings/_rels/drawing1.xml.rels', relsXml)

  onProgress?.(90, 'Melakukan kompresi file Excel...')
  const finalBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  onProgress?.(100, 'Selesai!')
  return finalBlob
}

export async function exportSortedZip(
  dayGroups: DayGroup[],
  onProgress?: (percent: number, message: string) => void
): Promise<Blob> {
  const zip = new JSZip()
  const gambarFolder = zip.folder('Gambar')

  let totalProcessed = 0
  const totalPhotos = dayGroups.reduce((acc, g) => acc + g.photos.length, 0)

  for (const group of dayGroups) {
    if (group.photos.length === 0) continue
    const dayFolder = gambarFolder?.folder(group.dayNum.toString())
    for (const photo of group.photos) {
      const buffer = await fileToArrayBuffer(photo.file)
      dayFolder?.file(photo.fileName, buffer)
      totalProcessed++
      onProgress?.(Math.round((totalProcessed / totalPhotos) * 90), `Mengarsipkan foto ${totalProcessed}/${totalPhotos}...`)
    }
  }

  onProgress?.(95, 'Mengompresi file ZIP...')
  const blob = await zip.generateAsync({ type: 'blob' })
  onProgress?.(100, 'Selesai!')
  return blob
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}
