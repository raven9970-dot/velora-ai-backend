# VELORA 6.1.1 — AI Designer untuk Android

VELORA tetap berjalan sebagai HTML di Android. Backend AI harus berjalan online karena file HTML lokal tidak dapat menjalankan server Node.js secara mandiri. Paket ini menambahkan pengaturan URL backend HTTPS dan token akses pada panel AI Designer.

## Isi paket
- `index.html` / `VELORA_6_1_AI_DESIGNER.html` — aplikasi VELORA.
- `server.js` — backend Node.js tanpa dependensi eksternal.
- `render.yaml` — blueprint untuk deploy backend di Render.
- `.env.example` — contoh variabel rahasia untuk server lokal/VPS.

## Deploy backend di Render (dapat dilakukan melalui browser Android)
1. Buat akun GitHub dan Render jika belum ada.
2. Buat repository GitHub baru, misalnya `velora-ai-backend`.
3. Unggah `server.js`, `package.json`, dan `render.yaml` ke root repository. Jangan unggah file `.env` atau API key.
4. Di Render, pilih **New → Blueprint**, hubungkan repository tadi, lalu deploy service `velora-ai-designer-backend`.
5. Setelah service dibuat, buka **Environment** dan isi:
   - `OPENAI_API_KEY` = API key OpenAI milik Anda.
   - `VELORA_ACCESS_TOKEN` = token acak rahasia minimal 24 karakter (contoh: gunakan password manager untuk membuat password acak panjang). Simpan token ini karena akan dimasukkan ke aplikasi Android.
6. Simpan perubahan dan tunggu deploy selesai.
7. URL backend akan berbentuk `https://nama-service.onrender.com`. Render menyediakan HTTPS untuk web service. Paket menggunakan port dari environment `PORT`.

Catatan: Render Free dapat menidurkan service setelah 15 menit tidak aktif sehingga permintaan pertama setelah idle mungkin lebih lambat. Pemakaian gambar tetap mengikuti biaya dan batas akun API OpenAI. Lihat dokumentasi Render untuk batas paket dan biaya terkini.

## Hubungkan dari Android
1. Buka file `VELORA_6_1_AI_DESIGNER.html` di browser Android.
2. Buka tab **AI Ecosystem → AI Designer Studio**.
3. Pada **Pengaturan koneksi Android**, masukkan URL HTTPS backend Render.
4. Masukkan `VELORA_ACCESS_TOKEN` yang sama persis dengan nilai di Environment Render.
5. Tekan **Simpan & tes koneksi**. Jika berhasil, status akan menunjukkan backend aktif dan penyedia AI terkonfigurasi.
6. Isi deskripsi desain lalu tekan **Generate Desain**.

## Keamanan
- Jangan pernah memasukkan `OPENAI_API_KEY` ke HTML, browser, chat, atau repository GitHub.
- Token akses backend bukan API key OpenAI. Simpan privat; siapa pun yang memilikinya dapat menggunakan kuota backend Anda.
- CORS dibuka agar halaman HTML lokal Android (origin `null`) dapat terhubung; perlindungan endpoint menggunakan bearer token.
- Paket ini untuk uji coba pribadi. Sebelum dibagikan ke banyak pengguna, tambahkan autentikasi akun, kuota per pengguna, pemantauan biaya, dan penyimpanan riwayat yang sesuai.

## Deploy di VPS / server Node.js
Gunakan Node.js 20+, salin `.env.example` menjadi `.env`, isi `OPENAI_API_KEY` dan `VELORA_ACCESS_TOKEN`, lalu jalankan `npm start`. Pastikan reverse proxy menyediakan HTTPS dan meneruskan request ke port aplikasi. Jangan publikasikan file `.env`.

## Status pengujian
Sintaks server dan frontend diperiksa. Koneksi OpenAI nyata belum dapat diuji sampai pemilik akun mengisi API key dan token di lingkungan server. Keberhasilan baru terkonfirmasi setelah status backend aktif dan satu gambar berhasil dibuat dari Android.
