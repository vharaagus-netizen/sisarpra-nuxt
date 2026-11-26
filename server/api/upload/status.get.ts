import { requireUser } from '~/server/utils/auth'
import { isStaffRole, MAX_RAW_UPLOAD_BYTES } from '~/server/utils/gdrive'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const config = useRuntimeConfig()

  return {
    success: true,
    configured: Boolean(config.gdriveWebhookUrl && String(config.gdriveWebhookUrl).trim()),
    canUploadPdf: isStaffRole(user.role),
    maxRawBytes: MAX_RAW_UPLOAD_BYTES
  }
})
