import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !/^\d+$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID laporan kerusakan tidak valid.',
    })
  }

  const report = await prisma.damageReport.findUnique({
    where: { id: BigInt(id) },
    include: {
      pelapor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          nomor_induk: true,
          no_telepon: true,
          kelas_jurusan: true,
        }
      },
      teknisi: {
        select: {
          id: true,
          name: true,
          role: true,
          no_telepon: true,
        }
      },
      room: {
        select: {
          id: true,
          kode_ruang: true,
          nama_ruang: true,
          lokasi: true,
        }
      },
      item: {
        select: {
          id: true,
          kode_barang: true,
          nama_barang: true,
          merk: true,
          kondisi: true,
          lokasi_penyimpanan: true,
        }
      },
      logs: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        },
        orderBy: { created_at: 'asc' }
      }
    }
  })

  if (!report) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data laporan kerusakan tidak ditemukan.',
    })
  }

  // Jika siswa, hanya boleh melihat laporannya sendiri
  if (user.role === 'siswa' && Number(report.pelapor_id) !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akses ditolak: Anda tidak memiliki wewenang melihat tiket laporan orang lain.',
    })
  }

  return {
    success: true,
    report,
  }
})
