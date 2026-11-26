import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  const {
    judul_kerusakan,
    deskripsi_kerusakan,
    kategori = 'elektronik',
    tingkat_urgensi = 'sedang',
    room_id,
    item_id,
    lokasi_keterangan,
    foto_sebelum
  } = body || {}

  if (!judul_kerusakan || !deskripsi_kerusakan) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Judul kerusakan dan deskripsi rincian wajib diisi.',
    })
  }

  // Generate nomor tiket laporan unik: DMG-YYYYMM-XXXX
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  const nomorLaporan = `DMG-${yyyy}${mm}-${randomSuffix}`

  const report = await prisma.damageReport.create({
    data: {
      nomor_laporan: nomorLaporan,
      pelapor_id: BigInt(user.id),
      room_id: room_id ? BigInt(room_id) : null,
      item_id: item_id ? BigInt(item_id) : null,
      judul_kerusakan: String(judul_kerusakan).trim(),
      deskripsi_kerusakan: String(deskripsi_kerusakan).trim(),
      lokasi_keterangan: lokasi_keterangan ? String(lokasi_keterangan).trim() : null,
      kategori,
      tingkat_urgensi,
      status: 'menunggu',
      foto_sebelum: normalizeSafeUrl(foto_sebelum),
      logs: {
        create: {
          user_id: BigInt(user.id),
          status_lama: null,
          status_baru: 'menunggu',
          catatan_tindakan: `Laporan kerusakan diajukan oleh ${user.name} (${user.role.toUpperCase()}).`,
        }
      }
    },
    include: {
      pelapor: {
        select: {
          id: true,
          name: true,
          role: true,
        }
      },
      room: {
        select: {
          id: true,
          nama_ruang: true,
          kode_ruang: true,
        }
      },
      item: {
        select: {
          id: true,
          nama_barang: true,
          kode_barang: true,
        }
      }
    }
  })

  // Sinkronisasi kondisi barang jika item_id terdaftar
  if (item_id) {
    try {
      const kondisiBaru = tingkat_urgensi === 'mendesak' || tingkat_urgensi === 'tinggi'
        ? 'rusak_berat'
        : 'rusak_ringan'

      await prisma.item.update({
        where: { id: BigInt(item_id) },
        data: { kondisi: kondisiBaru }
      })
    } catch (e) {
      // Abaikan jika item_id tidak ditemukan
    }
  }

  return {
    success: true,
    message: `Laporan kerusakan berhasil dikirim dengan Nomor Tiket ${report.nomor_laporan}.`,
    report,
  }
})
