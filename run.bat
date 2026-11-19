@echo off
setlocal
title SISARPRA SMA NUSAPUTERA - Nuxt Development Server
cd /d "%~dp0"

:: Tambahkan direktori standar System32 dan NodeJS ke PATH sesi ini
set "PATH=C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0;%PATH%"

cls
echo ================================================================
echo    SISTEM INFORMASI SARANA DAN PRASARANA (SISARPRA)
echo             SMA NUSAPUTERA SEMARANG - NUXT 3
echo ================================================================
echo.

:: 1. Cek apakah perintah node bisa dieksekusi
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak dapat ditemukan di sistem!
    echo Silakan pastikan Node.js sudah terinstall dari https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js terdeteksi : 
node -v
echo [OK] NPM terdeteksi     : 
call npm -v
echo.

:: 2. Cek dependensi node_modules
if not exist "node_modules\" (
    echo [INFO] Folder node_modules belum ada. Menjalankan npm install...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Terjadi kegagalan saat menjalankan npm install!
        pause
        exit /b 1
    )
    echo [INFO] Dependensi berhasil diinstall!
    echo.
)

:: 3. Generate Prisma Client jika belum terpasang
if not exist "node_modules\.prisma\client" (
    echo [INFO] Menghasilkan Prisma Client...
    call npx prisma generate
    echo.
)

:: 4. Buka browser otomatis ke http://localhost:3000 setelah 5 detik di background
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

:: 5. Jalankan server Nuxt Development
echo [INFO] Memulai Nuxt Development Server...
echo [INFO] Akses Komputer Ini   : http://localhost:3000
echo [INFO] Akses HP/Laptop Lain : Cek alamat 'Network' & Scan QR Code di bawah
echo [TIPS] Browser akan terbuka otomatis ke localhost:3000
echo [TIPS] Di HP, Anda bisa langsung scan QR Code yang muncul di terminal!
echo [TIPS] Tekan Ctrl + C di jendela ini untuk mematikan server.
echo ================================================================
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server Nuxt terhenti atau terjadi kesalahan.
    pause
)
