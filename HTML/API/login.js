export default async function handler(req, res) {
    // Tambahkan header CORS agar aman
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Metode tidak diizinkan' });
    }

    try {
        const { id, kode, dbKaryawan, dbBukanKaryawan } = req.body;

        // Ambil data PIN dari pengaturan Firebase Anda
        const firebaseUrl = 'https://rostercpcadvbpn-d9c02-default-rtdb.asia-southeast1.firebasedatabase.app/settings.json';
        const settingsRes = await fetch(firebaseUrl);
        const settings = await settingsRes.json();

        // Gunakan nilai default jika di Firebase kebetulan kosong
        const id_superadmin = settings?.id_superadmin || '8221287264';
        const pin_superadmin = settings?.pin_superadmin || '07062002';
        const pin_karyawan = settings?.pin_karyawan || '123456';

        // 1. Cek apakah yang login adalah Super Admin
        if (id === id_superadmin && kode === pin_superadmin) {
            return res.status(200).json({
                status: 'success',
                user: { idKaryawan: id, name: 'Super Admin', role: 'SUPERADMIN' }
            });
        }

        // 2. Cek apakah yang login adalah Karyawan
        const karyawan = (dbKaryawan || []).find(k =>
            k && (k.nik === id || k.attendanceId === id || k.idKaryawan === id)
        );

        if (karyawan) {
            if (kode === pin_karyawan) {
                return res.status(200).json({
                    status: 'success',
                    user: { idKaryawan: karyawan.uniqueId || karyawan.idKaryawan, name: karyawan.nama, role: 'KARYAWAN' }
                });
            } else {
                return res.status(401).json({ status: 'error', message: 'PIN Karyawan salah!' });
            }
        }

        // 3. Cek apakah yang login adalah Bukan Karyawan
        const bukanKaryawan = (dbBukanKaryawan || []).find(bk => bk && bk.id === id);

        if (bukanKaryawan) {
            return res.status(200).json({
                status: 'success',
                user: { idKaryawan: bukanKaryawan.id, name: bukanKaryawan.nama, role: 'BUKANKARYAWAN' }
            });
        }

        // Jika ID tidak ditemukan di mana pun
        return res.status(401).json({ status: 'error', message: 'ID tidak terdaftar atau PIN salah!' });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server backend.' });
    }
}