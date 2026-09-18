// ==========================================
// FILE: shared/master-akses.js
// FUNGSI: Konfigurasi Global Hak Akses (RBAC) Modul Aplikasi
// ==========================================

const MASTER_HAK_AKSES = [
    {
        modulId: "pusat",
        namaModul: "🗄️ DATA PUSAT",
        warna: "#8b5cf6",
        akses: [
            { kode: "pusat_dashboard", label: "Dasbor & Setting Admin" },
            { kode: "pusat_karyawan", label: "Master Karyawan" },
            { kode: "pusat_bukankaryawan", label: "Master Bukan Karyawan" },
            { kode: "pusat_cuti", label: "Master Hak Cuti" },
            { kode: "pusat_shift", label: "Master Shift (Roster)" },
            { kode: "pusat_bank", label: "Master Bank / Vendor" },
            { kode: "pusat_atm", label: "Master Lokasi ATM" },
            { kode: "pusat_akses", label: "Master Hak Akses & PIN" }
        ]
    },
    {
        modulId: "roster",
        namaModul: "📅 ROSTER SHIFT",
        warna: "var(--secondary)",
        akses: [
            { kode: "roster_view", label: "Lihat Daftar Roster" },
            { kode: "roster_umum", label: "Lihat Roster Umum" },
            { kode: "roster_pic", label: "Lihat Roster TL & PIC" },
            { kode: "roster_input", label: "Input Roster Baru" },
            { kode: "roster_edit", label: "Edit Roster" },
            { kode: "roster_hapus", label: "Hapus Roster" },
            { kode: "roster_cuti", label: "Approval Cuti" }
        ]
    },
    {
        modulId: "return",
        namaModul: "💵 RETUR ATM",
        warna: "#f59e0b",
        akses: [
            { kode: "return_view", label: "Lihat Daftar Retur" },
            { kode: "return_input", label: "Input Retur Baru" },
            { kode: "return_edit", label: "Edit / Revisi Retur" },
            { kode: "return_hapus", label: "Hapus Retur" }
        ]
    },
    {
        modulId: "kas",
        namaModul: "💰 BUKU KAS",
        warna: "#10b981",
        akses: [
            { kode: "kas_view", label: "Lihat Buku Kas" },
            { kode: "kas_input", label: "Input Transaksi" },
            { kode: "kas_edit", label: "Edit Transaksi" },
            { kode: "kas_hapus", label: "Hapus Transaksi" },
            { kode: "kas_ceklis_view", label: "Lihat Ceklis Iuran" },
            { kode: "kas_ceklis_input", label: "Input/Edit Ceklis Iuran" },
            { kode: "kas_master", label: "Master Kategori Kas" }
        ]
    },
    {
        modulId: "khasanah_utama",
        namaModul: "🏦 KHASANAH UTAMA",
        warna: "#ef4444",
        akses: [
            { kode: "khasanah_view", label: "Lihat Saldo Khasanah" },
            { kode: "khasanah_input", label: "Input / Upload Fisik" },
            { kode: "khasanah_edit", label: "Edit Transaksi" },
            { kode: "khasanah_hapus", label: "Hapus Transaksi" },
            { kode: "khasanah_kroscek", label: "Otorisasi Kroscek" },
            { kode: "khasanah_eod", label: "Eksekusi EOD" }
        ]
    },
    {
        modulId: "khasanah_bca",
        namaModul: "🏦 KHASANAH BCA",
        warna: "#0ea5e9",
        akses: [
            { kode: "bca_view", label: "Lihat Saldo BCA" },
            { kode: "bca_input", label: "Input / Upload Fisik" },
            { kode: "bca_edit", label: "Edit Transaksi" },
            { kode: "bca_hapus", label: "Hapus Transaksi" },
            { kode: "bca_kroscek", label: "Otorisasi Kroscek" },
            { kode: "bca_eod", label: "Eksekusi EOD" }
        ]
    }
];