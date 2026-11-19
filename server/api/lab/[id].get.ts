import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !/^\d+$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID barang laboratorium tidak valid atau harus berupa angka.',
    })
  }

  const item = await prisma.labItem.findUnique({
    where: { id: BigInt(id) },
    include: {
      room: {
        select: {
          id: true,
          kode_ruang: true,
          nama_ruang: true,
          lokasi: true,
        }
      },
      usage_logs: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        },
        orderBy: { tanggal_praktikum: 'desc' }
      },
      maintenance_logs: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        },
        orderBy: { tanggal_tindakan: 'desc' }
      }
    }
  })

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Barang laboratorium tidak ditemukan.',
    })
  }

  return {
    success: true,
    item,
  }
})
