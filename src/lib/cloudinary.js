import { CLOUDINARY_CLOUD, CLOUDINARY_PRESET } from './firebase'

export async function uploadImage(file) {
  // Validate file type and size before uploading
  const ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','image/gif']
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Use JPG, PNG, WEBP, or GIF.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image must be under 10MB.')
  }
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', CLOUDINARY_PRESET)
  fd.append('quality', 'auto:best')
  fd.append('fetch_format', 'auto')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: fd }
  )
  if (!res.ok) throw new Error('Image upload failed')
  const data = await res.json()
  return data.secure_url
}
