import { requireUser } from '~/server/utils/auth'
import { validateUploadPayload } from '~/server/utils/gdrive'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  const validated = validateUploadPayload(user.role, body)
  const config = useRuntimeConfig()

  if (!config.gdriveWebhookUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Integrasi upload Google Drive belum aktif (GDRIVE_WEBHOOK_URL belum dikonfigurasi di server). Silakan tempel link Google Drive secara manual untuk sementara.'
    })
  }

  try {
    const response = await fetch(config.gdriveWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: config.gdriveUploadSecret || '',
        filename: validated.filename,
        mimeType: validated.mimeType,
        base64: validated.base64,
        folder: validated.folder,
        uploadedBy: `${user.name} (${user.role})`
      }),
      redirect: 'follow'
    })

    const rawText = await response.text()
    let parsed: any = null
    try {
      parsed = JSON.parse(rawText)
    } catch {
      throw new Error('Respons Google Apps Script bukan JSON valid. Pastikan Deployment disetel "Execute as: Me" dan "Who has access: Anyone".')
    }

    if (!response.ok || !parsed?.success || !parsed?.viewUrl) {
      throw new Error(parsed?.message || `Gagal menyimpan ke Google Drive (HTTP ${response.status}).`)
    }

    return {
      success: true,
      fileId: parsed.fileId || null,
      viewUrl: String(parsed.viewUrl),
      thumbnailUrl: parsed.thumbnailUrl || null,
      filename: validated.filename,
      mimeType: validated.mimeType,
      folder: validated.folder
    }
  } catch (err: any) {
    console.error('[GDrive Upload Proxy Error]', err?.message || err)
    throw createError({
      statusCode: 502,
      statusMessage: err?.message || 'Gagal menghubungi layanan Google Drive Apps Script.'
    })
  }
})
