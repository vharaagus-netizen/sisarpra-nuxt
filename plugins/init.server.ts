import fs from 'node:fs'
import path from 'node:path'

export default defineNuxtPlugin(() => {
  try {
    const destDir = path.resolve(process.cwd(), 'public/images')
    const destFile = path.resolve(destDir, 'logo.png')
    const srcFile1 = 'd:/xampp/htdocs/sisarpra/public/images/logo.png'
    const srcFile2 = 'C:/Users/WINDOWS/.gemini/antigravity/brain/a558ada9-33ae-4f46-8fe5-a5900043f76b/.user_uploaded/media_1793060471534_bbedbdbd.png'

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    if (!fs.existsSync(destFile)) {
      if (fs.existsSync(srcFile1)) {
        fs.copyFileSync(srcFile1, destFile)
      } else if (fs.existsSync(srcFile2)) {
        fs.copyFileSync(srcFile2, destFile)
      }
    }
  } catch (err) {
    // Ignore error
  }
})

