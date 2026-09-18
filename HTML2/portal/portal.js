// State penampung data database untuk portal
const portalState = {
    dbKaryawan: [], dbBukanKaryawan: [], dbAkses: [],
    idSuperAdmin: '8221287264', pinSuperAdmin: '07062002',
    pinGlobal1: '123456', pinGlobal2: '123456', pinGlobal3: '123456'
};

document.addEventListener('DOMContentLoaded', () => {
    const activeUser = AuthHelper.getUserSession();
    if (activeUser) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('portal-menu').style.display = 'block';
        
        let roleText = (activeUser.role === 'SUPERADMIN' || activeUser.role === 'SUPER_ADMIN') ? 'Super Admin (Akses Penuh)' : 'Akses Sistem (Mengikuti Izin & Sesi)';
        document.getElementById('welcomeNama').innerText = `Halo, ${activeUser.nama}`;
        document.getElementById('welcomeRole').innerText = `Hak Akses: ${roleText}`;
        
        // Sembunyikan Modul jika tidak ada akses
        terapkanUIAkses(activeUser);
    }

    db.ref('settings/id_superadmin').on('value', snap => { if(snap.val()) portalState.idSuperAdmin = snap.val(); });
    db.ref('settings/pin_superadmin').on('value', snap => { if(snap.val()) portalState.pinSuperAdmin = snap.val(); });
    db.ref('settings/pin_karyawan_1').on('value', snap => { if(snap.val()) portalState.pinGlobal1 = snap.val(); });
    db.ref('settings/pin_karyawan_2').on('value', snap => { if(snap.val()) portalState.pinGlobal2 = snap.val(); });
    db.ref('settings/pin_karyawan_3').on('value', snap => { if(snap.val()) portalState.pinGlobal3 = snap.val(); });
    db.ref('settings/sambutan').on('value', snap => { 
        let val = snap.val() || "Selamat datang di Portal Utama Terpadu V8.8"; 
        let sambutanEl = document.getElementById('teksSambutanDashboard');
        if(sambutanEl) sambutanEl.innerHTML = val; 
    });

    db.ref('karyawan').on('value', snap => { let d = snap.val(); portalState.dbKaryawan = Array.isArray(d) ? d : (d ? Object.values(d) : []); });
    db.ref('bukan_karyawan').on('value', snap => { let d = snap.val(); portalState.dbBukanKaryawan = Array.isArray(d) ? d : (d ? Object.values(d) : []); });
    
    db.ref('hak_akses').on('value', snap => { 
        let d = snap.val(); portalState.dbAkses = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
        if(activeUser) terapkanUIAkses(activeUser); // Panggil ulang agar reaktif jika dirubah Admin
    });
});

// FUNGSI UTAMA: Menyembunyikan Kartu Modul di Portal Sesuai Izin (SUDAH DIPERBAIKI)
function terapkanUIAkses(user) {
    if(!user) return;
    let isSuper = user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN'; 
    let sessSlot = user.matchedPinSlot || 1;
    let uAkses = portalState.dbAkses.find(a => a && a.idKaryawan === user.idKaryawan) || {};
    let pMap = uAkses.pinMapping || { pusat: 1, roster: 1, return: 1, kas: 1, khasanah: 1, bca: 1 };

    const cekAkses = (kode) => {
        if (isSuper) return true;
        return uAkses.aksesList && uAkses.aksesList.includes(kode);
    };

    // Temukan Elemen Kartu (Selector Khasanah dibuat lebih spesifik)
    const cardPusat = document.querySelector('.menu-card[onclick*="pusat.html"]');
    const cardRoster = document.querySelector('.menu-card[onclick*="roster.html"]');
    const cardRetur = document.querySelector('.menu-card[onclick*="return.html"]');
    const cardKas = document.querySelector('.menu-card[onclick*="kas.html"]');
    const cardKhasanah = document.querySelector('.menu-card[onclick*="khasanah utama"]');
    const cardBca = document.querySelector('.menu-card[onclick*="khasanah bca"]');

    // Terapkan Aturan Penyembunyian (Telah disesuaikan dengan value di pusat.html)
    let isPusatSess = isSuper || sessSlot === parseInt(pMap.pusat || 1); 
    let hasPusatAccess = isSuper || ['pusat_dashboard', 'pusat_karyawan', 'pusat_bukankaryawan', 'pusat_cuti', 'pusat_shift', 'pusat_bank', 'pusat_atm', 'pusat_akses'].some(x => cekAkses(x));
    if(cardPusat) cardPusat.style.display = (hasPusatAccess && isPusatSess) ? 'flex' : 'none';

    let isRosterSess = isSuper || sessSlot === parseInt(pMap.roster || 1); 
    let hasRosterAccess = isSuper || ['roster_view', 'roster_umum', 'roster_pic', 'roster_input', 'roster_edit', 'roster_hapus', 'roster_cuti'].some(x => cekAkses(x));
    if(cardRoster) cardRoster.style.display = (hasRosterAccess && isRosterSess) ? 'flex' : 'none';

    let isReturnSess = isSuper || sessSlot === parseInt(pMap.return || 1); 
    let hasReturAccess = isSuper || ['return_view', 'return_input', 'return_edit', 'return_hapus'].some(x => cekAkses(x));
    if(cardRetur) cardRetur.style.display = (hasReturAccess && isReturnSess) ? 'flex' : 'none';

    let isKasSess = isSuper || sessSlot === parseInt(pMap.kas || 1); 
    let hasKasAccess = isSuper || ['kas_view', 'kas_input', 'kas_edit', 'kas_hapus', 'kas_ceklis_view', 'kas_ceklis_input', 'kas_master'].some(x => cekAkses(x));
    if(cardKas) cardKas.style.display = (hasKasAccess && isKasSess) ? 'flex' : 'none';

    let isKhasanahSess = isSuper || sessSlot === parseInt(pMap.khasanah || 1);
    let hasKhasanahAccess = isSuper || ['khasanah_view', 'khasanah_input', 'khasanah_edit', 'khasanah_hapus', 'khasanah_kroscek', 'khasanah_eod'].some(x => cekAkses(x));
    if(cardKhasanah) cardKhasanah.style.display = (hasKhasanahAccess && isKhasanahSess) ? 'flex' : 'none';

    let isBcaSess = isSuper || sessSlot === parseInt(pMap.bca || 1);
    let hasBcaAccess = isSuper || ['bca_view', 'bca_input', 'bca_edit', 'bca_hapus', 'bca_kroscek', 'bca_eod'].some(x => cekAkses(x));
    if(cardBca) cardBca.style.display = (hasBcaAccess && isBcaSess) ? 'flex' : 'none';
}

function autoFillJabatan() { 
    const id = document.getElementById('loginId').value.trim(); 
    const pos = document.getElementById('loginPosisi'); 
    if(id === portalState.idSuperAdmin) return pos.value = "SUPER ADMIN"; 
    const k = portalState.dbKaryawan.find(x => x && (x.nik === id || x.attendanceId === id || x.idKaryawan === id)); 
    if(k) { pos.value = k.jabatan; return; }
    const bk = portalState.dbBukanKaryawan.find(x => x && x.id === id); 
    if(bk) { pos.value = "NON-KARYAWAN"; return; } 
    pos.value = "";
}

function lupaPin() { 
    const idInput = prompt("Masukkan ID Super Admin Anda:"); 
    if(idInput === portalState.idSuperAdmin) { 
        let listPinKhusus = "Daftar PIN Personal Karyawan:\n";
        portalState.dbKaryawan.forEach(k => {
            if(k && (k.pin1 || k.pin2 || k.pin3)) {
                listPinKhusus += `- ${k.nama} (ID: ${k.uniqueId || k.idKaryawan}): PIN1[${k.pin1||'-'}], PIN2[${k.pin2||'-'}], PIN3[${k.pin3||'-'}]\n`;
            }
        });
        if(listPinKhusus === "Daftar PIN Personal Karyawan:\n") listPinKhusus += "Tidak ada karyawan dengan PIN khusus saat ini.";
        const templateParams = { id_super: portalState.idSuperAdmin, pin_super: portalState.pinSuperAdmin, pin_global_1: portalState.pinGlobal1, pin_global_2: portalState.pinGlobal2, pin_global_3: portalState.pinGlobal3, daftar_pin_khusus: listPinKhusus, waktu_update: new Date().toLocaleString('id-ID') }; 
        emailjs.send('service_m542pmk', 'template_rnz13q5', templateParams).then(function() { Swal.fire('Berhasil', 'Informasi Keamanan dikirim ke Email Anda.', 'success'); }, function(err) { Swal.fire('Error', 'Gagal mengirim email: ' + err.text, 'error'); }); 
    } else { Swal.fire('Ditolak', 'ID tidak dikenali!', 'error'); } 
}

function prosesLogin() {
    const id = document.getElementById('loginId').value.trim(); 
    const kode = document.getElementById('loginKode').value.trim();
    if(!id) return Swal.fire('Oops!', 'ID / NIK / Attendance ID Kosong!', 'warning');
    
    if(id === portalState.idSuperAdmin) { 
        if(kode === portalState.pinSuperAdmin) return loginSukses({ nama: 'Super Admin System', role: 'SUPERADMIN', idKaryawan: id, displayId: id }); 
        else return Swal.fire('Akses Ditolak!', 'PIN Super Admin Salah!', 'error'); 
    }

    const hakAksesUser = portalState.dbAkses.find(a => a && (a.idKaryawan === id || a.idAkses === id));
    let isBypassUser = hakAksesUser ? (hakAksesUser.tanpaPin === true || hakAksesUser.tanpaPin === "true") : false;

    const k = portalState.dbKaryawan.find(x => x && (x.nik === id || x.attendanceId === id || x.idKaryawan === id || x.uniqueId === id));
    if (k) {
        let today = new Date(); today.setHours(0,0,0,0);
        if (k.tglTerminate && new Date(k.tglTerminate) < today) return Swal.fire('Akses Ditolak!', 'Akun ini telah dinonaktifkan karena berstatus Resign/Terminate.', 'error');
        let p1 = k.pin1 || portalState.pinGlobal1; let p2 = k.pin2 || portalState.pinGlobal2; let p3 = k.pin3 || portalState.pinGlobal3;
        let matchedSlot = 0;
        
        if (isBypassUser && kode === "") matchedSlot = 1; 
        else if (kode === p1) matchedSlot = 1; 
        else if (kode === p2) matchedSlot = 2; 
        else if (kode === p3) matchedSlot = 3;
        
        if (matchedSlot > 0) {
            loginSukses({ nama: k.nama, role: 'USER', idKaryawan: k.uniqueId || k.idKaryawan || k.nik || k.attendanceId, displayId: k.nik || k.attendanceId || id, matchedPinSlot: matchedSlot });
            let msg = (isBypassUser && kode === "") ? 'Masuk via Bypass PIN (Tanpa PIN)' : `Masuk menggunakan PIN Sesi Level ${matchedSlot}`;
            return Swal.fire({ title: `Login Berhasil!`, text: msg, icon: 'success', timer: 2000, showConfirmButton: false });
        } else return Swal.fire('Akses Ditolak!', 'PIN Keamanan Anda salah!', 'error'); 
    }

    const bk = portalState.dbBukanKaryawan.find(x => x && (x.id === id || x.nik === id));
    if (bk) {
        let pinBk = bk.pin || portalState.pinGlobal1;
        if ((isBypassUser && kode === "") || kode === pinBk || kode === portalState.pinGlobal1) {
            loginSukses({ nama: bk.nama, role: 'USER', idKaryawan: bk.id, displayId: bk.id, matchedPinSlot: 1 });
            let msg = (isBypassUser && kode === "") ? 'Masuk via Bypass PIN Non-Karyawan' : 'Akses Non-Karyawan Terverifikasi';
            return Swal.fire({ title: `Selamat Datang, ${bk.nama}!`, text: msg, icon: 'success', timer: 1500, showConfirmButton: false }); 
        } else return Swal.fire('Akses Ditolak!', 'PIN Non-Karyawan Salah!', 'error');
    }
    
    return Swal.fire('Tidak Ditemukan!', 'ID Anda Tidak Terdaftar di Database!', 'error');
}

function loginSukses(userObj) {
    AuthHelper.setUserSession(userObj);
    document.getElementById('login-screen').style.display = 'none'; 
    document.getElementById('portal-menu').style.display = 'block';
    let roleText = (userObj.role === 'SUPERADMIN' || userObj.role === 'SUPER_ADMIN') ? 'Super Admin (Akses Penuh)' : 'Akses Sistem (Mengikuti Izin & Sesi)';
    document.getElementById('welcomeNama').innerText = `Halo, ${userObj.nama}`; 
    document.getElementById('welcomeRole').innerText = `Hak Akses: ${roleText}`;
    terapkanUIAkses(userObj); // Sembunyikan menu saat sukses
}