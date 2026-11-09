/**
 * Fast client-side image processing using HTML5 Canvas.
 * Crops the bottom-right corner where camera watermarks are located
 * and binarizes bright white text on a clean white background.
 */
export async function preprocessWatermark(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height

        // Watermark is located in the bottom-right corner
        // Using w * 0.40 eliminates center terrain/gravel noise while keeping full watermark text
        const cropX = w >= 800 ? Math.floor(w * 0.40) : Math.floor(w * 0.20)
        const cropY = Math.floor(h * 0.46)
        const cropW = w - cropX
        const cropH = h - cropY

        // Add 16px white margin around canvas for superior Tesseract segmentation
        const pad = 16
        const canvas = document.createElement('canvas')
        canvas.width = cropW + pad * 2
        canvas.height = cropH + pad * 2
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        if (!ctx) {
          URL.revokeObjectURL(url)
          return resolve(url)
        }

        // Fill background white
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw cropped section
        ctx.drawImage(img, cropX, cropY, cropW, cropH, pad, pad, cropW, cropH)

        // Binarize: white text becomes pure black (#000000) on white canvas (#ffffff)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imgData.data

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          // High-confidence threshold for crisp camera watermark text
          if (r >= 190 && g >= 190 && b >= 190) {
            data[i] = 0       // R: Black
            data[i + 1] = 0   // G: Black
            data[i + 2] = 0   // B: Black
          } else {
            data[i] = 255     // R: White background
            data[i + 1] = 255 // G: White background
            data[i + 2] = 255 // B: White background
          }
        }

        ctx.putImageData(imgData, 0, 0)
        const processedUrl = canvas.toDataURL('image/png')
        URL.revokeObjectURL(url)
        resolve(processedUrl)
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }

    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }

    img.src = url
  })
}

export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
