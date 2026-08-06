import nodemailer from 'nodemailer';

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
        const { idInput } = req.body;

        const firebaseUrl = 'https://rostercpcadvbpn-d9c02-default-rtdb.asia-southeast1.firebasedatabase.app/settings.json';
        const settingsRes = await fetch(firebaseUrl);
        const settings = await settingsRes.json();

        const id_superadmin = settings?.id_superadmin || '8221287264';
        const pin_superadmin = settings?.pin_superadmin || '07062002';
        const pin_karyawan = settings?.pin_karyawan || '123456';

        // Pastikan hanya ID Super Admin yang bisa me-request PIN
        if (idInput !== id_superadmin) {
            return res.status(400).json({ status: 'error', message: 'ID Super Admin tidak valid!' });
        }

        // Setup sistem pengirim email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS  
            }
        });

        const mailOptions = {
            from: '"Sistem Terpadu CPC" <no-reply@cpc-system.com>',
            to: process.env.ADMIN_EMAIL, 
            subject: 'Pemulihan PIN Sistem CPC',
            html: `
                <h3>Data Keamanan Sistem</h3>
                <p>Berikut adalah informasi akses Anda saat ini:</p>
                <ul>
                    <li><b>ID Super Admin:</b> ${id_superadmin}</li>
                    <li><b>PIN Super Admin:</b> ${pin_superadmin}</li>
                    <li><b>PIN Karyawan:</b> ${pin_karyawan}</li>
                </ul>
            `
        };

        await transporter.sendMail(mailOptions);
        
        // Respons sukses ini akan ditangkap oleh frontend untuk memunculkan notifikasi "Berhasil"
        return res.status(200).json({ status: 'success', message: 'Email berhasil dikirim.' });

    } catch (error) {
        console.error("Lupa PIN Error:", error);
        return res.status(500).json({ status: 'error', message: 'Gagal mengirim email.' });
    }
}