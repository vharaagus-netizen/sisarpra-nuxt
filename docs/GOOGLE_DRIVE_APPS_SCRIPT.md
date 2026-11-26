# Panduan Setup Google Drive Upload-Only (Skema #2) — SISARPRA

Fitur ini memungkinkan **Siswa, Guru, Petugas, dan Admin** mengunggah foto/PDF langsung ke **1 Google Drive Sekolah/Sarpra** dari halaman SISARPRA **tanpa pernah masuk ke folder Drive Anda** (tidak bisa melihat, mengedit, maupun menghapus file laporan orang lain), sementara database TiDB Cloud **tetap 0 KB biner** karena hanya menyimpan URL tautannya.

---

## Langkah 1: Pasang Skrip di Google Drive Sekolah (Sekali Seumur Hidup — ±2 Menit)

1. Login menggunakan akun Google yang ingin dijadikan tempat arsip (disarankan akun Google Sarpra / sekolah).
2. Buka **[https://script.google.com](https://script.google.com)** lalu klik **New Project** (*Proyek baru*).
3. **Pilih semua isi default di editor `Code.gs` (`Ctrl + A`) lalu hapus (`Backspace`)** sampai benar-benar kosong.
4. **Salin & tempel** seluruh kode berikut ke `Code.gs`:

> **Tentang Secret Token:** Google Apps Script **tidak** memberikan token otomatis — Anda sendiri yang menentukan kata sandinya di baris `SECRET_TOKEN` di bawah ini, lalu menyamakannya dengan `GDRIVE_UPLOAD_SECRET` di `.env` / Vercel.

```javascript
var ROOT_FOLDER_NAME = 'SISARPRA_DOKUMENTASI';
var SECRET_TOKEN = 'sisarpra_nusaputera_rahasia_2026';

function doGet() {
  return jsonOut({
    ok: true,
    service: 'SISARPRA Drive Uploader Ready'
  });
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    if (!payload.secret || payload.secret !== SECRET_TOKEN) {
      return jsonOut({ success: false, message: 'Unauthorized secret token' });
    }

    var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
    var subName = String(payload.folder || 'Umum').replace(/[^a-zA-Z0-9_-]/g, '');
    var targetFolder = getOrCreateFolder(rootFolder, subName || 'Umum');

    var bytes = Utilities.base64Decode(payload.base64);
    var blob = Utilities.newBlob(bytes, payload.mimeType, payload.filename);
    var file = targetFolder.createFile(blob);

    if (payload.uploadedBy) {
      file.setDescription('Diunggah melalui SISARPRA oleh: ' + payload.uploadedBy);
    }

    // Kunci keamanan: publik hanya dapat melihat (VIEW), tidak bisa edit/hapus isi Drive
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
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
  var iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

5. Tekan **Save** (`Ctrl + S`).

---

## Langkah 2: Deploy (atau Update Versi) Web App

### A. Jika Deploy Baru Pertama Kali:
1. Klik **Deploy** (kanan atas) → **New deployment**.
2. Klik ikon roda gigi (*Select type*) → pilih **Web app**.
3. Isi:
   * **Description:** `SISARPRA Drive Uploader`
   * **Execute as:** **Me** *(akun pemilik Google Drive)*
   * **Who has access:** **Anyone** *(aman karena URL dirahasiakan di backend Nuxt dan dilindungi `SECRET_TOKEN`)*
4. Klik **Deploy**. Jika muncul pop-up **Authorize access**, pilih akun Google Anda → **Advanced** → **Go to ... (unsafe)** → **Allow**.
5. Salin **Web app URL** (berakhiran `/exec`).

### B. Jika Anda Mengedit `Code.gs` Setelah Sudah Pernah Deploy:
> ⚠️ **Penting:** Menyimpan kode (`Ctrl + S`) saja **belum memperbarui** URL `/exec`! Anda harus menerbitkan versi baru:
1. Klik **Deploy** → **Manage deployments** (*Kelola deployment*).
2. Klik ikon **Pensil (Edit)** di kanan atas dialog.
3. Pada kolom **Version**, pilih **New version** (*Versi baru*).
4. Klik **Deploy**. *(URL `/exec` Anda tetap sama, tidak berubah).*

### Tes Cepat di Browser:
Buka **Web app URL** (`/exec`) Anda langsung di tab browser baru. Jika berhasil, akan tampil JSON:
`{"ok":true,"service":"SISARPRA Drive Uploader Ready"}`.

---

## Langkah 3: Pasang di `.env` Lokal dan Environment Variables Vercel

Tambahkan 2 variabel berikut di file `.env` (lokal) **dan** di **Vercel Dashboard → Settings → Environment Variables**:

```env
GDRIVE_WEBHOOK_URL="https://script.google.com/macros/s/AKfycbx.../exec"
GDRIVE_UPLOAD_SECRET="sisarpra_nusaputera_rahasia_2026"
```

> **Catatan:** Jika Anda mengganti `SECRET_TOKEN` di `Code.gs`, wajib samakan nilai `GDRIVE_UPLOAD_SECRET`, lalu redeploy project di Vercel (atau restart `npm run dev` di lokal) agar variabel terbaca.

---

## Catatan Hak Akses File per Role
* **Siswa & Guru:** Khusus foto gambar (`JPG`, `PNG`, `WebP`), otomatis dikompresi di browser menjadi `≤ 350 KB` sebelum diunggah ke folder `SISARPRA_DOKUMENTASI/Kerusakan`.
* **Petugas Sarpra & Admin:** Dapat mengunggah gambar maupun dokumen **PDF** (misalnya nota, brosur penawaran, foto barang datang, serta scan BAST bertanda tangan basah) maksimal `3 MB`, tersimpan otomatis ke subfolder `Perbaikan`, `Pengadaan`, `BAST`, dan `Buku`.
