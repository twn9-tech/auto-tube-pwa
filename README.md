# Auto-Tube PWA

PWA statis Auto-Tube untuk Android dan desktop. Source project pipeline/video tetap berada di repo privat; repo ini hanya memuat frontend publik, ikon, dan workflow deployment Pages.

## Fitur saat ini

- UI responsif, manifest, service worker untuk shell offline dasar, dan ikon install.
- Google Sign-In melalui Supabase Auth; antrean draft menggunakan RLS pada `upload_jobs`.
- Editor cue subtitle yang disimpan sebagai teks SRT, metadata judul/description, dan generator thumbnail PNG lokal.
- GitHub Actions membangun dan menerbitkan situs ke GitHub Pages.

## Setup OAuth/Supabase yang diperlukan

Agar Google Sign-In dapat berfungsi, aktifkan provider Google pada Supabase Auth menggunakan OAuth Web client Auto-Tube. Redirect URI OAuth Web client adalah `https://nzsqrcnvahlxvxcbdibj.supabase.co/auth/v1/callback`. Tambahkan alamat Pages `https://twn9-tech.github.io/auto-tube-pwa/` ke daftar redirect URL yang diizinkan Supabase. OAuth Google saat ini masih dalam mode pengujian; hanya akun tester yang disetujui dapat login.

Frontend hanya menggunakan project URL dan Supabase publishable key. Jangan pernah menambahkan kredensial Supabase istimewa, kredensial GitHub, atau token YouTube ke source/bundle publik.

## Batas integrasi saat ini

PWA menyimpan draft di Supabase. Workflow YouTube yang ada masih dijalankan manual melalui repo pipeline privat dan meminta input serta konfirmasi hak/publikasi tersendiri. Menyimpan draft dari PWA belum otomatis memicu workflow atau mengirim subtitle/metadata/thumbnail draft ke proses render. File video yang dipilih hanya dipratinjau lokal; file belum diunggah ke cloud. Generator thumbnail mengunduh PNG ke perangkat, belum mengunggahnya ke kanal YouTube.

## Build lokal

```sh
pnpm install
pnpm check
GITHUB_PAGES=true pnpm build:static
```

GitHub Actions menjalankan build yang sama dan menerbitkan folder `dist` ke Pages.
