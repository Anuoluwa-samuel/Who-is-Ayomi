const MAX_SIDE = 2400 // px — plenty for a portfolio, keeps files small
const COMFORTABLE = 1.5 * 1024 * 1024 // smaller files are uploaded untouched
export const UPLOAD_LIMIT = 4 * 1024 * 1024 // the server (Vercel) accepts ~4.5 MB bodies

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

/**
 * Big phone photos are resized and re-compressed in the browser before upload, so they always fit
 * the server limit. Small images, GIFs and PDFs are sent as they are.
 */
export async function prepareUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= COMFORTABLE) return file

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  // keep transparency for PNGs unless that's still too big, then fall back to JPEG
  let type = file.type === "image/png" ? "image/png" : "image/jpeg"
  let blob = await encode(canvas, type, 0.86)
  if (blob && blob.size > UPLOAD_LIMIT * 0.8 && type === "image/png") {
    type = "image/jpeg"
    blob = await encode(canvas, type, 0.86)
  }
  if (!blob || (scale === 1 && blob.size >= file.size)) return file

  const ext = type === "image/png" ? "png" : "jpg"
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type })
}
