/**
 * File Compression Utility
 * Compresses PDFs and images before sending to AI
 */
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

/**
 * Compression settings
 */
const COMPRESSION_CONFIG = {
  // PDF settings - optimized for AI readability
  // Note: More pages = longer processing time. Supabase Edge has 60s timeout.
  pdf: {
    scale: 1.8, // Render scale (180% - balance between quality and speed)
    maxWidth: 1400, // Max width per page (reduced for faster processing)
    quality: 0.75, // JPEG quality (75% = good balance)
    maxPages: 20, // Max pages (20 pages ≈ 30-40s processing time)
  },
  // Image settings
  image: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.85,
  },
}

/**
 * Compress a PDF by converting pages to JPEG images
 * Returns an array of compressed page images
 * @param {File} file - PDF file to compress
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Array<{data: string, type: string, page: number}>>}
 */
export async function compressPdf(file, onProgress = () => {}) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const totalPages = Math.min(pdf.numPages, COMPRESSION_CONFIG.pdf.maxPages)
  const compressedPages = []

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress(Math.round((pageNum / totalPages) * 100))

    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: COMPRESSION_CONFIG.pdf.scale })

    // Create canvas for rendering
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    // Calculate dimensions (respect maxWidth)
    let width = viewport.width
    let height = viewport.height

    if (width > COMPRESSION_CONFIG.pdf.maxWidth) {
      const ratio = COMPRESSION_CONFIG.pdf.maxWidth / width
      width = COMPRESSION_CONFIG.pdf.maxWidth
      height = height * ratio
    }

    canvas.width = width
    canvas.height = height

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: page.getViewport({
        scale: (width / viewport.width) * COMPRESSION_CONFIG.pdf.scale,
      }),
    }).promise

    // Convert to compressed JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', COMPRESSION_CONFIG.pdf.quality)
    const base64Data = dataUrl.split(',')[1]

    compressedPages.push({
      data: base64Data,
      type: 'image/jpeg',
      page: pageNum,
      originalName: file.name,
    })
  }

  return compressedPages
}

/**
 * Compress an image file
 * @param {File} file - Image file to compress
 * @returns {Promise<{data: string, type: string}>}
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        const { maxWidth, maxHeight, quality } = COMPRESSION_CONFIG.image

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64Data = dataUrl.split(',')[1]

        resolve({
          data: base64Data,
          type: 'image/jpeg',
          name: file.name,
          originalSize: file.size,
          compressedSize: Math.round(base64Data.length * 0.75), // Approximate decoded size
        })
      }

      img.onerror = reject
      img.src = e.target.result
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Process and compress files for AI context
 * @param {File[]} files - Array of files to process
 * @param {Function} onProgress - Progress callback with status message
 * @returns {Promise<Array<{name: string, type: string, size: number, data: string}>>}
 */
export async function compressFilesForAI(files, onProgress = () => {}) {
  const results = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileProgress = `${i + 1}/${files.length}`

    if (file.type === 'application/pdf') {
      onProgress(`PDF comprimeren (${fileProgress}): ${file.name}...`)

      try {
        const compressedPages = await compressPdf(file, (pageProgress) => {
          onProgress(`PDF comprimeren (${fileProgress}): ${file.name} - ${pageProgress}%`)
        })

        // Add each page as a separate image
        for (const page of compressedPages) {
          results.push({
            name: `${file.name} - pagina ${page.page}`,
            type: page.type,
            size: Math.round(page.data.length * 0.75),
            data: page.data,
          })
        }

        // Log compression stats
        const originalSize = file.size
        const compressedSize = compressedPages.reduce(
          (sum, p) => sum + Math.round(p.data.length * 0.75),
          0,
        )
        console.log(
          `PDF compressed: ${file.name} - ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${compressedPages.length} pages)`,
        )
      } catch (error) {
        console.error(`Failed to compress PDF ${file.name}:`, error)
        // Fallback: send original PDF
        const reader = new FileReader()
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        results.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
        })
      }
    } else if (file.type.startsWith('image/')) {
      onProgress(`Afbeelding comprimeren (${fileProgress}): ${file.name}...`)

      try {
        const compressed = await compressImage(file)
        results.push({
          name: file.name,
          type: compressed.type,
          size: compressed.compressedSize,
          data: compressed.data,
        })

        console.log(
          `Image compressed: ${file.name} - ${formatBytes(file.size)} → ${formatBytes(compressed.compressedSize)}`,
        )
      } catch (error) {
        console.error(`Failed to compress image ${file.name}:`, error)
        // Fallback: send original
        const reader = new FileReader()
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        results.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
        })
      }
    } else {
      // Other file types: send as-is
      onProgress(`Bestand voorbereiden (${fileProgress}): ${file.name}...`)
      const reader = new FileReader()
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      results.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
      })
    }
  }

  return results
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Get total size of compressed files
 */
export function getTotalSize(files) {
  return files.reduce((sum, f) => sum + (f.size || 0), 0)
}
