export default async function handler(req, res) {
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

        // BENTENG KEAMANAN 1: Paksa ID dan Kode menjadi Teks dan Kapital
        const inputId = String(id || '').trim().toUpperCase();
        const inputKode = String(kode || '').trim();

        const firebaseUrl = 'https://rostercpcadvbpn-d9c02-default-rtdb.asia-southeast1.firebasedatabase.app/settings.json';
        const settingsRes = await fetch(firebaseUrl);
        const settings = await settingsRes.json();

        // BENTENG KEAMANAN 2: Paksa data dari database menjadi Teks
        const id_superadmin = String(settings?.id_superadmin || '8221287264').trim().toUpperCase();
        const pin_superadmin = String(settings?.pin_superadmin || '07062002').trim();
        const pin_karyawan = String(settings?.pin_karyawan || '123456').trim();

        // 1. Cek Super Admin
        if (inputId === id_superadmin && inputKode === pin_superadmin) {
            return res.status(200).json({
                status: 'success',
                user: { idKaryawan: inputId, name: 'Super Admin', role: 'SUPERADMIN' }
            });
        }

        // 2. Cek Karyawan
        const karyawan = (dbKaryawan || []).find(k =>
            k && (
                String(k.nik || '').toUpperCase() === inputId || 
                String(k.attendanceId || '').toUpperCase() === inputId || 
                String(k.idKaryawan || '').toUpperCase() === inputId
            )
        );

        if (karyawan) {
            if (inputKode === pin_karyawan) {
                return res.status(200).json({
                    status: 'success',
                    user: { idKaryawan: karyawan.uniqueId || karyawan.idKaryawan, name: karyawan.nama, role: 'KARYAWAN' }
                });
            } else {
                return res.status(401).json({ status: 'error', message: 'PIN Karyawan salah!' });
            }
        }

        // 3. Cek Bukan Karyawan
        const bukanKaryawan = (dbBukanKaryawan || []).find(bk => 
            bk && String(bk.id || '').toUpperCase() === inputId
        );

        if (bukanKaryawan) {
            return res.status(200).json({
                status: 'success',
                user: { idKaryawan: bukanKaryawan.id, name: bukanKaryawan.nama, role: 'BUKANKARYAWAN' }
            });
        }

        return res.status(401).json({ status: 'error', message: 'ID tidak terdaftar atau PIN salah!' });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server backend.' });
    }
}