# Panduan Setup Google Drive Upload-Only (Skema #2) — SISARPRA

Fitur ini memungkinkan **Siswa, Guru, Petugas, dan Admin** mengunggah foto/PDF langsung ke **1 Google Drive Sekolah/Sarpra** dari halaman SISARPRA **tanpa pernah masuk ke folder Drive Anda** (tidak bisa melihat, mengedit, maupun menghapus file laporan orang lain), sementara database TiDB Cloud **tetap 0 KB biner** karena hanya menyimpan URL tautannya.

---

## Langkah 1: Pasang Skrip di Google Drive Sekolah (Sekali Seumur Hidup — ±2 Menit)

1. Login menggunakan akun Google yang ingin dijadikan tempat arsip (disarankan akun Google Sarpra / sekolah).
2. Buka **[https://script.google.com](https://script.google.com)** lalu klik **New Project** (*Proyek baru*).
3. Hapus seluruh isi default di editor `Code.gs`, lalu **salin & tempel** kode lengkap berikut:

```javascript
const ROOT_FOLDER_NAME = 'SISARPRA_DOKUMENTASI';
// GANTI token ini dengan kata sandi acak yang panjang, lalu samakan dengan GDRIVE_UPLOAD_SECRET di .env / Vercel
const SECRET_TOKEN = 'sisarpra_nusaputera_rahasia_2026';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (!payload.secret || payload.secret !== SECRET_TOKEN) {
      return jsonOut({ success: false, message: 'Unauthorized secret token' });
    }

    const rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
    const subName = String(payload.folder || 'Umum').replace(/[^a-zA-Z0-9_-]/g, '');
    const targetFolder = getOrCreateFolder(rootFolder, subName || 'Umum');

    const bytes = Utilities.base64Decode(payload.base64);
    const blob = Utilities.newBlob(bytes, payload.mimeType, payload.filename);
    const file = targetFolder.createFile(blob);

    // Catat info pengunggah di deskripsi file Drive (opsional untuk audit)
    if (payload.uploadedBy) {
      file.setDescription('Diunggah melalui SISARPRA oleh: ' + payload.uploadedBy);
    }

    // Kunci keamanan: hanya bisa dilihat via link (VIEW), tidak bisa edit/hapus isi folder
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    return jsonOut({
      success: true,
      fileId: fileId,
      viewUrl: 'https://drive.google.com/file/d/' + fileId + '/view',
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000'
    });
  } catch (err) {
    return jsonOut({ success: false, message: err && err.message ? err.message : String(err) });
  }
}

function getOrCreateFolder(parent, name) {
  const iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Langkah 2: Deploy sebagai Web App

1. Klik tombol **Deploy** (kanan atas) → **New deployment**.
2. Pada ikon roda gigi (*Select type*), pilih **Web app**.
3. Isi pengaturan berikut **dengan tepat**:
   * **Description:** `SISARPRA Drive Uploader`
   * **Execute as:** **Me** *(akun pemilik Google Drive)*
   * **Who has access:** **Anyone** *(aman karena URL dirahasiakan di backend Nuxt dan dilindungi `SECRET_TOKEN`)*
4. Klik **Deploy**. Jika Google memunculkan pop-up **Authorize access**:
   * Pilih akun Google Drive Sarpra → klik **Advanced / Lanjutan** → **Go to Untitled project (unsafe)** → **Allow / Izinkan**.
5. Salin **Web app URL** (berakhiran `/exec`).

---

## Langkah 3: Pasang di `.env` Lokal dan Environment Variables Vercel

Tambahkan 2 variabel berikut di file `.env` (lokal) **dan** di **Vercel Dashboard → Settings → Environment Variables**:

```env
GDRIVE_WEBHOOK_URL="https://script.google.com/macros/s/AKfycbx.../exec"
GDRIVE_UPLOAD_SECRET="sisarpra_nusaputera_rahasia_2026"
```

> **Penting:** Pastikan nilai `GDRIVE_UPLOAD_SECRET` sama persis dengan `SECRET_TOKEN` di `Code.gs`, lalu re-deploy project di Vercel (atau restart `npm run dev` di lokal) agar variabel terbaca.

---

## Catatan Hak Akses File per Role
* **Siswa & Guru:** Khusus foto gambar (`JPG`, `PNG`, `WebP`), otomatis dikompresi di browser menjadi `≤ 350 KB` sebelum diunggah ke folder `SISARPRA_DOKUMENTASI/Kerusakan`.
* **Petugas Sarpra & Admin:** Dapat mengunggah gambar maupun dokumen **PDF** (misalnya nota, brosur penawaran, foto barang datang, serta scan BAST bertanda tangan basah) maksimal `3 MB`, tersimpan otomatis ke subfolder `Perbaikan`, `Pengadaan`, `BAST`, dan `Buku`.
