// ==========================================
// FILE: khasanah utama.js
// FUNGSI: Logika Khusus Modul Khasanah (Terintegrasi RBAC)
// ==========================================

const currentUser = typeof AuthHelper !== 'undefined' ? AuthHelper.checkAccess() : null;
window.currentRealtimeAkses = null;

window.app = window.app || {};
window.currentDenomUtama = 0;
window.currentJenisUtama = 'KERTAS';

function bukaModalUtama(denom, jenis) {
    let appValid = typeof app !== 'undefined' ? app : window.app;
    if (!appValid.cekValidasiAkses('khasanah_input') && !appValid.cekValidasiAkses('khasanah_edit')) {
        return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak untuk mengisi detail (Khasanah Input/Edit).", "error");
    }

    window.currentDenomUtama = denom;
    window.currentJenisUtama = jenis;
    let labelTitle = jenis === 'KERTAS' ? `${denom/1000}K` : `${denom}`;
    document.getElementById('modal-title-utama').innerText = `UANG ${jenis} ${labelTitle}`;
    
    document.getElementById('detail-modal-utama').style.display = 'flex';
    muatDataKeModalUtama(denom, jenis);
}

function tutupModalUtama() {
    document.getElementById('detail-modal-utama').style.display = 'none';
}

function muatDataKeModalUtama(denom, jenis) {
    const container = document.getElementById('modal-rows-container-utama');
    container.innerHTML = ''; 
    
    let appValid = typeof app !== 'undefined' ? app : window.app;
    let bankAktif = appValid.bankAktifKhasanah || 'BRI';
    
    let oldTrx = (appValid.trxKhasanah || []).filter(x => x.bank === bankAktif && x.denom === denom && x.jenis === jenis);
    
    if(oldTrx.length > 0) {
        oldTrx.slice().reverse().forEach(trx => {
            tambahBarisModalUtama(trx.qty, trx.tipe, trx.kategori, trx.emisi, trx.id, trx.waktu, trx.prev_qty);
        });
    } else {
        tambahBarisModalUtama('', 'IN', 'gress_bi', '', '', '', '');
    }
}

function tambahBarisModalUtama(lembar = '', tipe = 'IN', kondisi = 'gress_bi', emisiInput = '', trxId = '', trxWaktu = '', trxPrevQty = '') {
    const container = document.getElementById('modal-rows-container-utama');
    const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 4);
    
    let jenis = window.currentJenisUtama;
    let denom = window.currentDenomUtama;
    let appValid = typeof app !== 'undefined' ? app : window.app;
    let bankAktif = appValid.bankAktifKhasanah || 'BRI';
    
    let existingEmisi = [];
    if(appValid.saldoKhasanah && appValid.saldoKhasanah[bankAktif]) {
        appValid.saldoKhasanah[bankAktif].forEach(x => {
            if(x.denom === denom && x.jenis === jenis && x.emisi) {
                if(!existingEmisi.includes(x.emisi)) existingEmisi.push(x.emisi);
            }
        });
    }
    
    let defaultEmisi = existingEmisi.length > 0 ? [] : (jenis === 'KOIN' ? ["2016"] : ["2022"]);
    let combinedEmisi = [...new Set([...defaultEmisi, ...existingEmisi])];
    
    if (emisiInput && !combinedEmisi.includes(emisiInput)) combinedEmisi.push(emisiInput);
    combinedEmisi.sort((a,b) => b.localeCompare(a));
    
    let datalistId = 'dl-emisi-' + rowId;
    let emisiOpsi = `<datalist id="${datalistId}">`;
    combinedEmisi.forEach(e => { emisiOpsi += `<option value="${e}">`; });
    emisiOpsi += `</datalist>`;
    
    let defaultPilih = existingEmisi.length > 0 ? existingEmisi[0] : (jenis === 'KOIN' ? "2016" : "2022");
    let emisiPilih = emisiInput || defaultPilih;
    
    let rowDiv = document.createElement('div');
    rowDiv.className = 'modal-row';
    rowDiv.id = rowId;
    rowDiv.dataset.trxId = trxId || '';
    rowDiv.dataset.trxWaktu = trxWaktu || '';
    rowDiv.dataset.trxPrevQty = trxPrevQty || '';
    
    rowDiv.innerHTML = `
        <input type="number" class="modal-lembar-input" value="${lembar}" min="0" placeholder="0" style="width: 100px;">
        <select class="modal-tipe-select" style="flex-grow: 1;">
            <option value="IN" ${tipe==='IN'?'selected':''} style="color: #10b981; font-weight: bold;">+ Masuk (IN)</option>
            <option value="OUT" ${tipe==='OUT'?'selected':''} style="color: #ef4444; font-weight: bold;">- Keluar (OUT)</option>
            <option value="TIMPA" ${tipe==='TIMPA'?'selected':''} style="color: #8b5cf6; font-weight: bold;">⚡ Timpa (Edit Angka)</option>
            <option value="BUNTUT" ${tipe==='BUNTUT'?'selected':''} style="color: #f59e0b; font-weight: bold;">🔄 Ganti Buntut</option>
        </select>
        <select class="modal-kondisi-select" style="flex-grow: 1;">
            <option value="gress_bi" ${kondisi==='gress_bi'?'selected':''}>Gress BI</option>
            <option value="fit_atm" ${kondisi==='fit_atm'?'selected':''}>Fit ATM</option>
            <option value="ule" ${kondisi==='ule'?'selected':''}>ULE</option>
            <option value="utle" ${kondisi==='utle'?'selected':''}>UTLE</option>
            <option value="minor" ${kondisi==='minor'?'selected':''}>Minor</option>
            <option value="mayor" ${kondisi==='mayor'?'selected':''}>Mayor</option>
            <option value="u_lama" ${kondisi==='u_lama'?'selected':''}>U. Lama</option>
            <option value="unsorted" ${kondisi==='unsorted'?'selected':''}>Unsorted</option>
        </select>
        <input type="text" class="modal-emisi-input" list="${datalistId}" value="${emisiPilih}" style="flex-grow: 1; padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-weight: 700; font-size: 14px; text-align:center; color:#0f172a; outline:none;" placeholder="Ketik / Pilih">
        ${emisiOpsi}
        <button type="button" class="btn-remove" onclick="document.getElementById('${rowId}').remove()">×</button>
    `;
    container.appendChild(rowDiv);
}

function simpanModalUtama() {
    let appValid = typeof app !== 'undefined' ? app : window.app;
    if (!appValid.cekValidasiAkses('khasanah_input') && !appValid.cekValidasiAkses('khasanah_edit')) {
        return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak untuk menyimpan data (Input/Edit).", "error");
    }

    let denom = window.currentDenomUtama;
    let jenis = window.currentJenisUtama;
    let bankAktif = appValid.bankAktifKhasanah || 'BRI'; 
    
    let kasirName = 'Super Admin';
    if (appValid.currentUser) { kasirName = appValid.currentUser.nama || appValid.currentUser.name || 'Super Admin'; }
    
    if(!appValid.saldoKhasanah) appValid.saldoKhasanah = {};
    if(!appValid.saldoKhasanah[bankAktif]) appValid.saldoKhasanah[bankAktif] = [];
    
    let bankDb = appValid.saldoKhasanah[bankAktif];
    if(!appValid.trxKhasanah) appValid.trxKhasanah = [];

    let simulasiBankDb = JSON.parse(JSON.stringify(bankDb));
    let oldTrx = appValid.trxKhasanah.filter(x => x.bank === bankAktif && x.denom === denom && x.jenis === jenis);
    
    oldTrx.forEach(trx => {
        let obj = simulasiBankDb.find(x => x.denom === denom && x.jenis === jenis && x.emisi === trx.emisi);
        if (obj) {
            if (trx.tipe === 'IN') { obj[trx.kategori] = Math.max(0, (obj[trx.kategori] || 0) - trx.qty); } 
            else if (trx.tipe === 'OUT') { obj[trx.kategori] = (obj[trx.kategori] || 0) + trx.qty; } 
            else if (trx.tipe === 'TIMPA' || trx.tipe === 'BUNTUT') { obj[trx.kategori] = trx.prev_qty !== undefined ? trx.prev_qty : 0; }
        }
    });

    let historyBaru = [];
    let rows = document.querySelectorAll('#modal-rows-container-utama .modal-row');
    let isValid = true;
    let errorMsg = "";

    let rowArray = Array.from(rows);
    for (let i = 0; i < rowArray.length; i++) {
        let r = rowArray[i];
        let lbrRaw = r.querySelector('.modal-lembar-input').value;
        let lbr = parseInt(lbrRaw);
        let tipe = r.querySelector('.modal-tipe-select').value;
        let kond = r.querySelector('.modal-kondisi-select').value;
        let ems = r.querySelector('.modal-emisi-input').value.trim().toUpperCase();
        
        let trxId = r.dataset.trxId;
        let trxWaktu = r.dataset.trxWaktu;
        let trxPrevQty = r.dataset.trxPrevQty;
        
        if(!ems) {
            let existingEmisiList = simulasiBankDb.filter(x => x.denom === denom && x.jenis === jenis).map(x => x.emisi);
            ems = existingEmisiList.length > 0 ? existingEmisiList[0] : (jenis === 'KOIN' ? "2016" : "2022");
        }

        if(!isNaN(lbr) && lbr > 0) {
            let objEmisi = simulasiBankDb.find(x => x.denom === denom && x.jenis === jenis && x.emisi === ems);
            if(!objEmisi) {
                objEmisi = { denom: denom, emisi: ems, jenis: jenis, gress_bi:0, fit_atm:0, ule:0, utle:0, minor:0, mayor:0, u_lama:0, unsorted:0 };
                simulasiBankDb.push(objEmisi);
            }

            let prevQty = objEmisi[kond] || 0;

            if (tipe === 'OUT') {
                if (prevQty < lbr) {
                    isValid = false;
                    let labelKondisi = r.querySelector('.modal-kondisi-select').options[r.querySelector('.modal-kondisi-select').selectedIndex].text;
                    errorMsg = `Saldo fisik tidak cukup!<br>Pecahan: Rp ${denom.toLocaleString('id-ID')}<br>Kondisi: ${labelKondisi}<br>Sisa Saldo: <b>${prevQty}</b><br>Jumlah Ditarik: <b>${lbr}</b>`;
                    break;
                }
                objEmisi[kond] = prevQty - lbr;
            } else if (tipe === 'IN') {
                objEmisi[kond] = prevQty + lbr;
            } else if (tipe === 'TIMPA') {
                objEmisi[kond] = lbr;
            } else if (tipe === 'BUNTUT') {
                let bundle = Math.floor(prevQty / 100) * 100;
                objEmisi[kond] = bundle + lbr;
            }

            historyBaru.push({
                id: trxId ? trxId : 'TRX-' + Date.now() + Math.random().toString(36).substr(2,6),
                waktu: trxWaktu ? trxWaktu : new Date().toLocaleString('id-ID'),
                kasir: kasirName, tipe: tipe, denom: denom, jenis: jenis, emisi: ems, kategori: kond, qty: lbr,
                prev_qty: trxPrevQty ? parseInt(trxPrevQty) : prevQty, keterangan: 'Input/Edit Modal', bank: bankAktif
            });
        }
    }

    if (!isValid) {
        if (typeof Swal !== 'undefined') { Swal.fire({ title: 'Gagal Menyimpan!', html: errorMsg, icon: 'error' }); } 
        else { alert('Gagal Menyimpan! Saldo tidak cukup.'); }
        return; 
    }

    appValid.trxKhasanah = appValid.trxKhasanah.filter(x => !(x.bank === bankAktif && x.denom === denom && x.jenis === jenis));
    appValid.trxKhasanah = [...historyBaru.reverse(), ...appValid.trxKhasanah];

    appValid.saldoKhasanah[bankAktif] = simulasiBankDb.filter(obj => {
        let totalBaris = 0;
        let kunci = appValid.kategoriKunciKhasanah || ['gress_bi', 'fit_atm', 'ule', 'utle', 'minor', 'mayor', 'u_lama', 'unsorted'];
        kunci.forEach(k => totalBaris += (obj[k] || 0));
        return totalBaris > 0;
    });

    tutupModalUtama();
    if (typeof updateRingkasanGridUtama === 'function') updateRingkasanGridUtama();
    if (typeof appValid.renderSaldoKhasanah === 'function') appValid.renderSaldoKhasanah(); 
    if (typeof appValid.renderHistoryKhasanah === 'function') appValid.renderHistoryKhasanah();
    if (typeof Swal !== 'undefined') { Swal.fire({ title: 'Tersimpan!', text: 'Data transaksi berhasil diperbarui.', icon: 'success', timer: 1500, showConfirmButton: false }); }

    if(appValid.database) {
        appValid.database.ref('khasanah_trx').set(appValid.trxKhasanah).catch(e => console.error(e));
        appValid.database.ref('khasanah_saldo').set(appValid.saldoKhasanah).catch(e => console.error(e));
    }
}

function updateRingkasanGridUtama() {
    let appValid = typeof app !== 'undefined' ? app : window.app;
    let trxDb = [];
    let bankAktif = appValid.bankAktifKhasanah || 'BRI';
    if (appValid && appValid.trxKhasanah) trxDb = appValid.trxKhasanah.filter(x => x.bank === bankAktif);

    const kertas = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000];
    const koin = [1000, 500, 200, 100, 50];

    kertas.forEach(d => {
        let totalLbr = 0;
        trxDb.filter(x => x.denom === d && x.jenis === 'KERTAS').forEach(t => {
            if (t.tipe === 'OUT') totalLbr -= t.qty;
            else if (t.tipe === 'IN') totalLbr += t.qty;
            else if (t.tipe === 'TIMPA') totalLbr += (t.qty - (t.prev_qty || 0));
            else if (t.tipe === 'BUNTUT') { let prevBuntut = (t.prev_qty || 0) % 100; totalLbr += (t.qty - prevBuntut); }
        });
        let el = document.getElementById(`val-kertas-${d}`);
        if(el) el.innerText = `${totalLbr.toLocaleString('id-ID')} Lembar`;
    });

    koin.forEach(d => {
        let totalKpg = 0;
        trxDb.filter(x => x.denom === d && x.jenis === 'KOIN').forEach(t => {
            if (t.tipe === 'OUT') totalKpg -= t.qty;
            else if (t.tipe === 'IN') totalKpg += t.qty;
            else if (t.tipe === 'TIMPA') totalKpg += (t.qty - (t.prev_qty || 0));
            else if (t.tipe === 'BUNTUT') { let prevBuntut = (t.prev_qty || 0) % 100; totalKpg += (t.qty - prevBuntut); }
        });
        let el = document.getElementById(`val-koin-${d}`);
        if(el) el.innerText = `${totalKpg.toLocaleString('id-ID')} Keping`;
    });
}


// LOGIKA OBJECT APP KHASANAH UTAMA
Object.assign(window.app, {
    saldoKhasanah: {}, trxKhasanah: [], bankAktifKhasanah: 'BRI', editTrxKhasanahId: null,
    kroscekStateKhasanah: {}, hPlus1DataKhasanah: {}, eodLogKhasanah: null, viewKroscekTypeKhasanah: 'tabel1',
    kategoriKunciKhasanah: ["gress_bi", "fit_atm", "ule", "utle", "minor", "mayor", "u_lama", "unsorted"],
    viewSaldoTypeKhasanah: 'lembar', viewCetakTypeKhasanah: 'lembar',
    dbBank: [], dbAkses: [],
    database: typeof db !== 'undefined' ? db : (typeof firebase !== 'undefined' && firebase.apps.length ? firebase.database() : null), 
    currentUser: currentUser,

    init: function() {
        if (!this.database) return; 
        
        // Memuat hak_akses agar dapat dicek
        this.database.ref('hak_akses').on('value', snap => {
            let d = snap.val(); this.dbAkses = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if (this.currentUser && this.currentUser.idKaryawan) {
                window.currentRealtimeAkses = this.dbAkses.find(a => a && a.idKaryawan === this.currentUser.idKaryawan) || null;
            }
            this.terapkanUIAkses(); 
        });

        this.database.ref('master_bank').on('value', snap => { 
            let d = snap.val(); this.dbBank = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.renderDropdownBank(); 
        });
        this.database.ref('khasanah_saldo').on('value', snap => { this.saldoKhasanah = snap.val() || {}; if(typeof updateRingkasanGridUtama === 'function') updateRingkasanGridUtama(); app.renderSaldoKhasanah(); });
        this.database.ref('khasanah_trx').on('value', snap => { let d = snap.val(); this.trxKhasanah = Array.isArray(d) ? d : (d ? Object.values(d) : []); app.renderHistoryKhasanah(); if(typeof updateRingkasanGridUtama === 'function') updateRingkasanGridUtama(); });
        this.database.ref('khasanah_kroscek').on('value', snap => { this.kroscekStateKhasanah = snap.val() || {}; this.renderDropdownBankKroscekKhasanah(); app.renderKroscekKhasanah(); app.renderSaldoKhasanah(); });
        this.database.ref('khasanah_hplus1').on('value', snap => { this.hPlus1DataKhasanah = snap.val() || {}; app.renderKroscekKhasanah(); });
        this.database.ref('khasanah_eod_log').on('value', snap => { let log = snap.val() || { date: '', banks: [] }; let today = new Date().toISOString().split('T')[0]; if(log.date !== today) { log = { date: today, banks: [] }; } this.eodLogKhasanah = log; app.renderEODListKhasanah(); });
        
        this.initKhasanah();
    },

    cekValidasiAkses: function(kodeAkses) { 
        if (typeof AuthHelper === 'undefined') return false;
        return AuthHelper.cekAkses(kodeAkses, window.currentRealtimeAkses);
    }, 

    terapkanUIAkses: function() {
        if (!this.currentUser) return;
        
        let canView = this.cekValidasiAkses('khasanah_view') || this.cekValidasiAkses('khasanah_input') || this.cekValidasiAkses('khasanah_edit') || this.cekValidasiAkses('khasanah_kroscek');
        let canInput = this.cekValidasiAkses('khasanah_input') || this.cekValidasiAkses('khasanah_edit');
        let canKroscek = this.cekValidasiAkses('khasanah_kroscek');
        let canEOD = this.cekValidasiAkses('khasanah_eod');

        if (!canView) {
            Swal.fire("Akses Ditolak!", "Anda tidak memiliki hak akses untuk Modul Khasanah.", "error").then(() => {
                window.location.href = '../portal/index.html';
            });
            return;
        }

        // Tampilkan/Sembunyikan Menu berdasarkan Akses
        document.getElementById('nav-khasanah-input').style.display = canInput ? 'block' : 'none';
        
        let navKroscek = document.getElementById('nav-khasanah-kroscek');
        if(navKroscek) navKroscek.style.display = canKroscek ? 'block' : 'none';

        let divEod = document.getElementById('div-khasanah-eod');
        let divEodStatus = document.getElementById('div-khasanah-eod-status');
        let navEod = document.getElementById('nav-khasanah-eod');

        if(divEod) divEod.style.display = canEOD ? 'block' : 'none';
        if(divEodStatus) divEodStatus.style.display = canEOD ? 'block' : 'none';
        if(navEod) navEod.style.display = canEOD ? 'block' : 'none';

        // Jika Tab Input aktif tapi user hanya VIEW, paksa pindah ke Tab Saldo
        if (!canInput && document.getElementById('tab-khasanah-input').classList.contains('active')) {
            this.switchTabKhasanah('tab-khasanah-saldo', document.getElementById('nav-khasanah-saldo'));
        }

        // Sembunyikan semua tombol aksi Edit/Upload/Kirim bagi user yang cuma VIEW
        if (!canInput) {
            document.querySelectorAll('.btnAksiTrans').forEach(el => el.style.display = 'none');
        }

        if (!canKroscek) {
            let btnKirim = document.getElementById('btnAksiKirimKroscek');
            if(btnKirim) btnKirim.style.display = 'none';
            
            let btnUploadH1 = document.getElementById('btnAksiUploadH1');
            if(btnUploadH1) btnUploadH1.style.display = 'none';

            let modeKroscek = document.getElementById('kroscekModeKhasanah');
            if(modeKroscek) modeKroscek.disabled = true;

            let btnKirimRevisi = document.getElementById('btnAksiKirimRevisi');
            if(btnKirimRevisi) btnKirimRevisi.style.display = 'none';

            let btnSelesaiKroscek = document.getElementById('btnAksiSelesaiKroscek');
            if(btnSelesaiKroscek) btnSelesaiKroscek.style.display = 'none';
        }
    },

    renderDropdownBank: function() { 
        let html = '<option value="">-- Pilih Bank --</option>'; let htmlKhasanah = ''; 
        this.dbBank.forEach(b => { if(b) { html += `<option value="${b.nama}">${b.nama} (${b.kode||'-'})</option>`; htmlKhasanah += `<option value="${b.nama}">${b.nama}</option>`; } }); 
        const selKhasanah = document.getElementById('pilihBankKhasanah'); 
        if(selKhasanah) { 
            let val = selKhasanah.value; selKhasanah.innerHTML = htmlKhasanah || '<option value="">-- Belum Ada Master Bank --</option>'; 
            if(val && htmlKhasanah.includes(`"${val}"`)) { selKhasanah.value = val; } 
            else if(this.dbBank.length > 0) { this.bankAktifKhasanah = this.dbBank[0].nama; selKhasanah.value = this.bankAktifKhasanah; } 
            app.gantiBankKhasanah(); 
        } 
    },

    switchTabKhasanah: function(tabId, el) {
        if (tabId === 'tab-khasanah-input' && !this.cekValidasiAkses('khasanah_input') && !this.cekValidasiAkses('khasanah_edit')) {
            return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin untuk menginput data.", "error");
        }
        if (tabId === 'tab-khasanah-kroscek' && !this.cekValidasiAkses('khasanah_kroscek')) {
            return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin membuka antrean kroscek.", "error");
        }

        document.querySelectorAll('#khasanah-module .section').forEach(s => s.classList.remove('active'));
        const activeSection = document.getElementById(tabId);
        if(activeSection) activeSection.classList.add('active');
        
        if(el) { document.querySelectorAll('#khasanah-module .nav-link').forEach(l => l.classList.remove('active')); el.classList.add('active'); }
        if (tabId === 'tab-khasanah-saldo') this.renderSaldoKhasanah(); 
        else if (tabId === 'tab-khasanah-kroscek') this.renderKroscekKhasanah(); 
        else if (tabId === 'tab-khasanah-laporan') this.renderCetakKhasanah();
    },

    initKhasanah: function() {
        this.gantiBankKhasanah(); 
        this.renderDropdownBankKroscekKhasanah(); 
        this.gantiModeKroscekKhasanah(); 
        this.renderEODListKhasanah();
        if(typeof updateRingkasanGridUtama === 'function') updateRingkasanGridUtama();
    },

    gantiBankKhasanah: function() {
        const sel = document.getElementById('pilihBankKhasanah');
        if (sel && sel.value) {
            this.bankAktifKhasanah = sel.value;
            const lbl = document.getElementById('labelBankAktifKhasanah'); if (lbl) lbl.innerText = this.bankAktifKhasanah;
            const lblUpload = document.getElementById('lblBankUploadKhasanah'); if (lblUpload) lblUpload.innerText = this.bankAktifKhasanah;
            
            this.renderHistoryKhasanah();
            this.renderSaldoKhasanah();
            if (typeof updateRingkasanGridUtama === 'function') updateRingkasanGridUtama();
        }
    },

    renderHistoryKhasanah: function() {
        const tbody = document.getElementById('bodyHistoryKhasanah');
        if (!tbody) return; 
        
        const theadTr = tbody.parentElement.querySelector('thead tr');
        if (theadTr && !theadTr.innerHTML.includes('TOTAL NOMINAL')) {
            theadTr.innerHTML = '<th>WAKTU</th><th>USER (KASIR)</th><th>TIPE</th><th>DENOM</th><th>EMISI & KAT</th><th class="text-right">JML</th><th style="background:#dbeafe; color:#1e40af;">TOTAL NOMINAL</th>';
        }

        tbody.innerHTML = '';
        const historyFiltered = this.trxKhasanah.filter(x => x.bank === this.bankAktifKhasanah).slice(0, 50); 
        
        historyFiltered.forEach(trx => {
            let colorTipe = trx.tipe === 'IN' ? '#10b981' : (trx.tipe === 'OUT' ? '#ef4444' : '#8b5cf6');
            let iconTipe = trx.tipe === 'IN' ? '📥' : (trx.tipe === 'OUT' ? '📤' : '⚡');
            
            let displayKasir = trx.kasir;
            if (!displayKasir || String(displayKasir).toLowerCase() === 'undefined') displayKasir = 'Super Admin';

            let totalNominal = trx.qty * trx.denom;

            tbody.innerHTML += `<tr>
                <td>${trx.waktu}</td>
                <td><b>${displayKasir}</b></td>
                <td><span style="color:${colorTipe}; font-weight:bold;">${iconTipe} ${trx.tipe}</span></td>
                <td>Rp ${trx.denom.toLocaleString('id-ID')}</td>
                <td>Emisi ${trx.emisi} (${trx.kategori.replace('_',' ').toUpperCase()})</td>
                <td class="text-right"><b>${trx.qty.toLocaleString('id-ID')}</b> ${trx.jenis==='KOIN'?'Keping':'Lembar'}</td>
                <td class="text-right" style="background:#eff6ff; font-weight:bold; color:#1e40af;">Rp ${totalNominal.toLocaleString('id-ID')}</td>
            </tr>`;
        });
        
        if(historyFiltered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding:20px; color:#64748b;">Belum ada riwayat transaksi.</td></tr>';
        }
    },

    renderEODListKhasanah: function() {
        let container = document.getElementById('listBankEOD'); if(!container) return;
        let listEOD = this.eodLogKhasanah ? this.eodLogKhasanah.banks : [];
        let listSemuaBank = this.dbBank.map(b => b.nama);
        let belumEOD = listSemuaBank.filter(b => !listEOD.includes(b));
        
        let html = "";
        if (listEOD.length === 0) html += `<div style="color: #ef4444; font-weight: bold;">Belum ada satupun bank di-EOD hari ini.</div>`;
        else html += `<div style="color: #10b981; margin-bottom: 5px;">✅ EOD Selesai: <b>${listEOD.join(', ')}</b></div>`;
        
        if (belumEOD.length > 0) html += `<div style="color: #f59e0b; border-top: 1px dashed #cbd5e1; padding-top: 5px;">⚠️ Belum EOD: <b>${belumEOD.join(', ')}</b></div>`;
        container.innerHTML = html;
    },

    prosesEODKhasanah: function() {
        if (!this.cekValidasiAkses('khasanah_eod')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak untuk melakukan EOD.", "error");

        Swal.fire({ title: 'Proses End of Day (EOD)?', text: `Riwayat transaksi ${this.bankAktifKhasanah} hari ini akan dibersihkan.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#64748b' }).then((result) => {
            if (result.isConfirmed) {
                this.trxKhasanah = this.trxKhasanah.filter(x => x.bank !== this.bankAktifKhasanah); 
                this.database.ref('khasanah_trx').set(this.trxKhasanah); 
                updateRingkasanGridUtama(); this.renderHistoryKhasanah(); 
                
                delete this.kroscekStateKhasanah[this.bankAktifKhasanah]; 
                this.database.ref('khasanah_kroscek').set(this.kroscekStateKhasanah);
                
                delete this.hPlus1DataKhasanah[this.bankAktifKhasanah]; 
                this.database.ref('khasanah_hplus1').set(this.hPlus1DataKhasanah);
                
                let log = this.eodLogKhasanah || { date: new Date().toISOString().split('T')[0], banks: [] };
                if(!log.banks.includes(this.bankAktifKhasanah)) { log.banks.push(this.bankAktifKhasanah); this.database.ref('khasanah_eod_log').set(log); }
                
                this.renderSaldoKhasanah(); 
                Swal.fire('EOD Selesai!', `Proses untuk ${this.bankAktifKhasanah} selesai.`, 'success');
            }
        });
    },

    ubahViewSaldoKhasanah: function(mode) {
        this.viewSaldoTypeKhasanah = mode;
        this.renderSaldoKhasanah();
    },

    renderSaldoKhasanah: function() {
        updateRingkasanGridUtama();
        const tbody = document.getElementById('bodySaldoKhasanah');
        const banner = document.getElementById('bannerStatusBankKhasanah');
        const notifContainer = document.getElementById('notifKroscekKhasanah');
        
        if(!tbody || !banner || !notifContainer) return;
        tbody.innerHTML = ''; banner.innerHTML = ''; notifContainer.innerHTML = '';
        
        let banksWaiting = [], banksRevisi = [], banksBalance = [];
        Object.keys(this.kroscekStateKhasanah).forEach(b => {
            if (this.kroscekStateKhasanah[b].status === 'WAITING') banksWaiting.push(b);
            else if (this.kroscekStateKhasanah[b].status === 'REVISI') banksRevisi.push(b);
            else if (this.kroscekStateKhasanah[b].status === 'BALANCE') banksBalance.push(b);
        });

        if (banksWaiting.length > 0 || banksRevisi.length > 0 || banksBalance.length > 0) {
            let htmlBanner = '';
            if (banksWaiting.length > 0) htmlBanner += `<div style="background:#eff6ff; padding:10px 15px; border-radius:6px; border:1px solid #93c5fd; color:#1e40af; flex:1; min-width: 150px;"> <b style="font-size:13px;">⏳ Antrean Kroscek (${banksWaiting.length} Bank)</b><br><span style="font-size:11px;">${banksWaiting.join(', ')}</span></div>`;
            if (banksRevisi.length > 0) htmlBanner += `<div style="background:#fee2e2; padding:10px 15px; border-radius:6px; border:1px solid #fca5a5; color:#991b1b; flex:1; min-width: 150px;"> <b style="font-size:13px;">⚠️ Butuh Cek Ulang Fisik (${banksRevisi.length} Bank)</b><br><span style="font-size:11px;">${banksRevisi.join(', ')}</span></div>`;
            if (banksBalance.length > 0) htmlBanner += `<div style="background:#f0fdf4; padding:10px 15px; border-radius:6px; border:1px solid #6ee7b7; color:#065f46; flex:1; min-width: 150px;"> <b style="font-size:13px;">✅ Selesai Balance (${banksBalance.length} Bank)</b><br><span style="font-size:11px;">${banksBalance.join(', ')}</span></div>`;
            banner.innerHTML = htmlBanner;
        }
        
        let kState = this.kroscekStateKhasanah[this.bankAktifKhasanah];
        if (kState) {
            if (kState.status === 'WAITING') {
                notifContainer.innerHTML = `<div style="background:#fef08a; color:#92400e; padding:10px 15px; border-radius:6px; margin-bottom:15px; font-weight:bold; border: 1px solid #facc15;">⏳ Menunggu pengecekan tim Kroscek untuk Bank ${this.bankAktifKhasanah}... (Data sedang di antrean)</div>`;
            }
            else if (kState.status === 'BALANCE') {
                notifContainer.innerHTML = `<div style="background:#d1fae5; color:#065f46; padding:10px 15px; border-radius:6px; margin-bottom:15px; font-weight:bold; border: 1px solid #34d399;">✅ KROSCEK SELESAI: SALDO ${this.bankAktifKhasanah} BALANCE. Data telah dikonfirmasi dan siap untuk EOD.</div>`;
            }
            else if (kState.status === 'REVISI') { 
                let detailRingkas = kState.data.map(d => {
                    let satuan = (d.jenis === 'KOIN') ? 'Keping' : 'Lembar';
                    return `<li style="margin-bottom:4px; margin-left:15px;">Pecahan <b>Rp ${Number(d.denom).toLocaleString('id-ID')}</b> : <span style="color:#ef4444; font-weight:bold;">${d.tipe} ${Number(d.qty).toLocaleString('id-ID')} ${satuan}</span></li>`;
                }).join('');

                notifContainer.innerHTML = `<div style="background:#fee2e2; color:#991b1b; padding:12px; border-radius:6px; margin-bottom:15px; border:1px solid #fca5a5;">
                    <b style="font-size:13px;">⚠️ Notifikasi Selisih Kroscek Fisik:</b>
                    <ul style="margin-top:6px; font-size:12px;">${detailRingkas}</ul>
                </div>`;
            }
        }

        document.getElementById('btnViewLembarKhasanah').style.background = this.viewSaldoTypeKhasanah === 'lembar' ? '#3b82f6' : '#64748b';
        document.getElementById('btnViewNominalKhasanah').style.background = this.viewSaldoTypeKhasanah === 'nominal' ? '#3b82f6' : '#64748b';
        
        let bankDb = this.saldoKhasanah[this.bankAktifKhasanah] || [];
        let htmlTbody = ''; let grandTotNominal = 0; let flagKoin = false;

        if(bankDb.length === 0) { tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="padding:20px;">Belum ada saldo fisik.</td></tr>`; return; }

        bankDb.forEach(r => {
            let rowTot = 0; this.kategoriKunciKhasanah.forEach(k => rowTot += r[k]); if (rowTot === 0) return;
            grandTotNominal += (rowTot * r.denom);
            
            if(r.jenis === 'KOIN' && !flagKoin) { htmlTbody += `<tr class="row-koin-separator"><td colspan="11" style="text-align:center;">--- UANG LOGAM (KOIN) ---</td></tr>`; flagKoin = true; }
            
            let trHtml = `<tr><td class="col-denom text-center">${r.denom.toLocaleString('id-ID')}</td><td class="col-emisi text-center">${r.emisi}</td>`;
            this.kategoriKunciKhasanah.forEach(k => {
                let val = r[k] || 0;
                if (this.viewSaldoTypeKhasanah === 'nominal') trHtml += `<td class="text-right">${val === 0 ? '-' : (val * r.denom).toLocaleString('id-ID')}</td>`;
                else trHtml += `<td class="text-right">${val === 0 ? '-' : val.toLocaleString('id-ID')}</td>`;
            });
            
            let colTotal = this.viewSaldoTypeKhasanah === 'nominal' ? (rowTot * r.denom) : rowTot;
            trHtml += `<td class="text-right" style="background:#e0e7ff; font-weight:bold; color:#1e40af;">${colTotal.toLocaleString('id-ID')}</td></tr>`;
            htmlTbody += trHtml;
        });
        htmlTbody += `<tr><td colspan="10" class="text-right" style="font-weight:bold; background:#e2e8f0;">GRAND TOTAL KESELURUHAN :</td><td class="text-right" style="font-weight:bold; background:#e2e8f0; color:#1e40af;">Rp ${grandTotNominal.toLocaleString('id-ID')}</td></tr>`;
        tbody.innerHTML = htmlTbody;
    },

    prosesUploadSaldoKhasanah: function(event) {
        if (!this.cekValidasiAkses('khasanah_input') && !this.cekValidasiAkses('khasanah_edit')) { 
            event.target.value = ''; 
            return Swal.fire("Ditolak","Anda tidak memiliki hak upload (Input/Edit).","error"); 
        }

        const file = event.target.files[0]; if (!file) return; Swal.fire({ title: 'Memproses...', text: 'Sedang membaca file Excel...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        const reader = new FileReader();
        reader.onload = (e) => {
            setTimeout(() => {
                try {
                    const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: ""});
                    let tempBankDb = []; let statusJenisSaatIni = 'KERTAS'; let rowCount = 0;
                    const validDenomsKertas = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000, 500]; const validDenomsKoin = [1000, 500, 200, 100, 50, 25, 10, 5, 1];
                    const extractL = (nom, lmb, d) => { let strNom = String(nom).trim(); let isMinusNom = strNom.includes('-') || (strNom.includes('(') && strNom.includes(')')); let cleanNom = strNom.replace(/[^0-9]/g, ''); let n = parseInt(cleanNom) || 0; if (isMinusNom) n = -n; let strLmb = String(lmb).trim(); let isMinusLmb = strLmb.includes('-') || (strLmb.includes('(') && strLmb.includes(')')); let cleanLmb = strLmb.replace(/[^0-9]/g, ''); let l = parseInt(cleanLmb) || 0; if (isMinusLmb) l = -l; if (l !== 0) return l; if (Math.abs(n) >= d) return Math.trunc(n / d); if (Math.abs(n) > 0 && Math.abs(n) < d) return n; return 0; };
                    for (let i = 0; i < rows.length; i++) {
                        let r = rows[i]; let col0 = String(r[0] || r[12] || "").toUpperCase();
                        if (col0.includes("COIN") || col0.includes("KOIN")) { statusJenisSaatIni = 'KOIN'; continue; }
                        let dRaw = col0.replace(/[^0-9]/g, ''); let denom = parseInt(dRaw); let isDenomValid = false;
                        if (statusJenisSaatIni === 'KERTAS' && validDenomsKertas.includes(denom)) isDenomValid = true; if (statusJenisSaatIni === 'KOIN' && validDenomsKoin.includes(denom)) isDenomValid = true;
                        if (isDenomValid) {
                            let emisi = String(r[1] || r[13] || '').trim(); if(!emisi || emisi === 'NaN' || emisi === 'null' || emisi.toUpperCase() === 'EMISI') continue;
                            let l_gress_bi = extractL(r[2], r[14], denom); let l_fit_atm  = extractL(r[3], r[15], denom); let l_ule = extractL(r[4], r[16], denom); let l_utle = extractL(r[5], r[17], denom); let l_minor = extractL(r[6], r[18], denom); let l_mayor = extractL(r[7], r[19], denom); let l_u_lama = extractL(r[8], r[20], denom); let l_unsorted = extractL(r[9], r[21], denom);
                            if(l_gress_bi===0 && l_fit_atm===0 && l_ule===0 && l_utle===0 && l_minor===0 && l_mayor===0 && l_u_lama===0 && l_unsorted===0) continue;
                            let idx = tempBankDb.findIndex(x => x.denom === denom && x.emisi === emisi && x.jenis === statusJenisSaatIni);
                            if (idx >= 0) { tempBankDb[idx].gress_bi += l_gress_bi; tempBankDb[idx].fit_atm += l_fit_atm; tempBankDb[idx].ule += l_ule; tempBankDb[idx].utle += l_utle; tempBankDb[idx].minor += l_minor; tempBankDb[idx].mayor += l_mayor; tempBankDb[idx].u_lama += l_u_lama; tempBankDb[idx].unsorted += l_unsorted; } 
                            else { tempBankDb.push({ denom: denom, emisi: emisi, jenis: statusJenisSaatIni, gress_bi: l_gress_bi, fit_atm: l_fit_atm, ule: l_ule, utle: l_utle, minor: l_minor, mayor: l_mayor, u_lama: l_u_lama, unsorted: l_unsorted }); } rowCount++;
                        }
                    }
                    if(rowCount > 0) { app.saldoKhasanah[app.bankAktifKhasanah] = tempBankDb; app.database.ref('khasanah_saldo').set(app.saldoKhasanah); Swal.fire({title:'Berhasil!', text:`Data Saldo Excel berhasil diproses (${rowCount} baris).`, icon:'success', timer: 1500, showConfirmButton: false}); app.renderSaldoKhasanah(); } else { Swal.fire('Gagal!', 'Tidak menemukan format tabel data yang sesuai.', 'error'); }
                } catch(err) { Swal.fire('Error', 'Gagal memproses file Excel: ' + err.message, 'error'); } event.target.value = ''; 
            }, 500);
        }; reader.readAsArrayBuffer(file);
    },

    prosesUploadH1Khasanah: function(event) {
        if (!this.cekValidasiAkses('khasanah_kroscek')) { 
            event.target.value = ''; 
            return Swal.fire("Ditolak","Anda tidak memiliki hak untuk mengupload data kroscek H+1.","error"); 
        }

        const bankK = document.getElementById('pilihBankKroscekKhasanah').value; if(!bankK) { Swal.fire('Oops', 'Pilih bank kroscek terlebih dahulu sebelum upload file!', 'warning'); event.target.value = ''; return; }
        const file = event.target.files[0]; if (!file) return; Swal.fire({ title: 'Memproses...', text: 'Sedang mengekstrak data referensi H+1...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        const reader = new FileReader();
        reader.onload = (e) => {
            setTimeout(() => {
                try {
                    const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: ""});
                    let tempBankDb = []; let statusJenisSaatIni = 'KERTAS'; let rowCount = 0;
                    const validDenomsKertas = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000, 500]; const validDenomsKoin = [1000, 500, 200, 100, 50, 25, 10, 5, 1];
                    const extractL = (nom, lmb, d) => { let strNom = String(nom).trim(); let isMinusNom = strNom.includes('-') || (strNom.includes('(') && strNom.includes(')')); let cleanNom = strNom.replace(/[^0-9]/g, ''); let n = parseInt(cleanNom) || 0; if (isMinusNom) n = -n; let strLmb = String(lmb).trim(); let isMinusLmb = strLmb.includes('-') || (strLmb.includes('(') && strLmb.includes(')')); let cleanLmb = strLmb.replace(/[^0-9]/g, ''); let l = parseInt(cleanLmb) || 0; if (isMinusLmb) l = -l; if (l !== 0) return l; if (Math.abs(n) >= d) return Math.trunc(n / d); if (Math.abs(n) > 0 && Math.abs(n) < d) return n; return 0; };
                    for (let i = 0; i < rows.length; i++) {
                        let r = rows[i]; let col0 = String(r[0] || r[12] || "").toUpperCase();
                        if (col0.includes("COIN") || col0.includes("KOIN")) { statusJenisSaatIni = 'KOIN'; continue; }
                        let dRaw = col0.replace(/[^0-9]/g, ''); let denom = parseInt(dRaw); let isDenomValid = false;
                        if (statusJenisSaatIni === 'KERTAS' && validDenomsKertas.includes(denom)) isDenomValid = true; if (statusJenisSaatIni === 'KOIN' && validDenomsKoin.includes(denom)) isDenomValid = true;
                        if (isDenomValid) {
                            let emisi = String(r[1] || r[13] || '').trim(); if(!emisi || emisi === 'NaN' || emisi === 'null' || emisi.toUpperCase() === 'EMISI') continue;
                            let l_gress_bi = extractL(r[2], r[14], denom); let l_fit_atm  = extractL(r[3], r[15], denom); let l_ule = extractL(r[4], r[16], denom); let l_utle = extractL(r[5], r[17], denom); let l_minor = extractL(r[6], r[18], denom); let l_mayor = extractL(r[7], r[19], denom); let l_u_lama = extractL(r[8], r[20], denom); let l_unsorted = extractL(r[9], r[21], denom);
                            if(l_gress_bi===0 && l_fit_atm===0 && l_ule===0 && l_utle===0 && l_minor===0 && l_mayor===0 && l_u_lama===0 && l_unsorted===0) continue;
                            let idx = tempBankDb.findIndex(x => x.denom === denom && x.emisi === emisi && x.jenis === statusJenisSaatIni);
                            if (idx >= 0) { tempBankDb[idx].gress_bi += l_gress_bi; tempBankDb[idx].fit_atm += l_fit_atm; tempBankDb[idx].ule += l_ule; tempBankDb[idx].utle += l_utle; tempBankDb[idx].minor += l_minor; tempBankDb[idx].mayor += l_mayor; tempBankDb[idx].u_lama += l_u_lama; tempBankDb[idx].unsorted += l_unsorted; } 
                            else { tempBankDb.push({ denom: denom, emisi: emisi, jenis: statusJenisSaatIni, gress_bi: l_gress_bi, fit_atm: l_fit_atm, ule: l_ule, utle: l_utle, minor: l_minor, mayor: l_mayor, u_lama: l_u_lama, unsorted: l_unsorted }); } rowCount++;
                        }
                    }
                    if(rowCount > 0) { this.hPlus1DataKhasanah[bankK] = tempBankDb; this.database.ref('khasanah_hplus1').set(this.hPlus1DataKhasanah); document.getElementById('labelFileH1Khasanah').innerText = `Data ${file.name} dimuat. (${rowCount} baris)`; Swal.fire({title:'File H+1 Terbaca!', text:`Berhasil ekstrak data referensi fisik dari ${file.name}.`, icon:'success', timer: 1500, showConfirmButton: false}); this.renderKroscekKhasanah(); } else { Swal.fire('Gagal!', 'Tidak menemukan format tabel data yang sesuai.', 'error'); }
                } catch(err) { Swal.fire('Error', 'Gagal memproses file Excel: ' + err.message, 'error'); } event.target.value = ''; 
            }, 500);
        }; reader.readAsArrayBuffer(file);
    },

    renderDropdownBankKroscekKhasanah: function() { 
        let htmlKhasanah = ''; 
        let countSent = 0, countRevisi = 0, countBalance = 0;

        this.dbBank.forEach(b => { 
            if(b) { 
                let state = this.kroscekStateKhasanah[b.nama];
                if (state) {
                    let icon = '';
                    if (state.status === 'WAITING') { icon = '⏳'; countSent++; }
                    else if (state.status === 'REVISI') { icon = '⚠️'; countRevisi++; }
                    else if (state.status === 'BALANCE') { icon = '✅'; countBalance++; }
                    
                    htmlKhasanah += `<option value="${b.nama}">${icon} ${b.nama}</option>`; 
                }
            } 
        }); 
        
        const selKroscek = document.getElementById('pilihBankKroscekKhasanah'); 
        if(selKroscek) { 
            let val = selKroscek.value; 
            selKroscek.innerHTML = htmlKhasanah || '<option value="">-- Tidak Ada Antrean --</option>'; 
            if(val && htmlKhasanah.includes(`value="${val}"`)) selKroscek.value = val; 
        } 

        const summaryContainer = document.getElementById('summary-kroscek-khasanah');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div style="background:#eff6ff; padding:10px 15px; border-radius:6px; border:1px solid #93c5fd; color:#1e40af; font-weight:bold; flex:1; min-width:120px;">⏳ Baru Dikirim: ${countSent} Bank</div>
                <div style="background:#fee2e2; padding:10px 15px; border-radius:6px; border:1px solid #fca5a5; color:#991b1b; font-weight:bold; flex:1; min-width:120px;">⚠️ Kroscek Ulang: ${countRevisi} Bank</div>
                <div style="background:#f0fdf4; padding:10px 15px; border-radius:6px; border:1px solid #6ee7b7; color:#065f46; font-weight:bold; flex:1; min-width:120px;">✅ Balance: ${countBalance} Bank</div>
            `;
        }
    },

    gantiModeKroscekKhasanah: function() { this.renderKroscekKhasanah(); },

    ubahViewKroscekKhasanah: function(type) { 
        this.viewKroscekTypeKhasanah = type; 
        document.getElementById('wadahTabelAntreanKhasanah').style.display = type === 'tabel1' ? 'block' : 'none'; 
        document.getElementById('wadahTabelDetailKhasanah').style.display = type === 'tabel2' ? 'block' : 'none'; 
        document.getElementById('wadahTabelH1Khasanah').style.display = type === 'tabel3' ? 'block' : 'none'; 
        
        document.getElementById('btnViewKroscek1Khasanah').style.background = type === 'tabel1' ? '#3b82f6' : '#64748b'; 
        document.getElementById('btnViewKroscek2Khasanah').style.background = type === 'tabel2' ? '#3b82f6' : '#64748b'; 
        document.getElementById('btnViewKroscek3Khasanah').style.background = type === 'tabel3' ? '#3b82f6' : '#64748b'; 
    },

    renderKroscekKhasanah: function() {
        const bankK = document.getElementById('pilihBankKroscekKhasanah').value; 
        const selectMode = document.getElementById('kroscekModeKhasanah');
        
        if(bankK && this.hPlus1DataKhasanah[bankK] && this.hPlus1DataKhasanah[bankK].length > 0) { 
            selectMode.value = 'otomatis'; 
            if(selectMode.querySelector('option[value="manual"]')) selectMode.querySelector('option[value="manual"]').disabled = true; 
        } else { 
            if(selectMode.querySelector('option[value="manual"]')) selectMode.querySelector('option[value="manual"]').disabled = false; 
        }
        
        const mode = selectMode.value; let isAuto = (mode === 'otomatis');
        let uploadDiv = document.getElementById('uploadH1ContainerKhasanah'); 
        let kroscekGrp = document.getElementById('kroscekToggleGroupKhasanah');
        
        if (isAuto) { 
            if(uploadDiv) uploadDiv.style.display = 'flex'; 
            if(kroscekGrp) kroscekGrp.style.display = 'flex'; 
        } else {
            if(uploadDiv) uploadDiv.style.display = 'none'; 
            if(kroscekGrp) kroscekGrp.style.display = 'none';
        }

        this.ubahViewKroscekKhasanah(this.viewKroscekTypeKhasanah || 'tabel1');
        
        const tbody = document.getElementById('bodyKroscekKhasanah'); 
        const tFoot1 = document.getElementById('footKroscekKhasanah'); 
        const tDetail = document.getElementById('bodyKroscekDetailKhasanah'); 
        const tH1 = document.getElementById('bodyKroscekH1Khasanah'); 
        const tFoot3 = document.getElementById('footKroscekH1Khasanah'); 
        const infoDiv = document.getElementById('infoStatusKroscekKhasanah');
        
        if(!tbody || !tDetail || !tH1 || !infoDiv) return;
        
        tbody.innerHTML = ''; tFoot1.innerHTML = ''; tDetail.innerHTML = ''; tH1.innerHTML = ''; tFoot3.innerHTML = ''; infoDiv.innerHTML = '';

        if(!bankK || !this.kroscekStateKhasanah[bankK]) { 
            document.getElementById('wadahTabelAntreanKhasanah').style.display = 'block'; 
            document.getElementById('wadahTabelDetailKhasanah').style.display = 'none';
            document.getElementById('wadahTabelH1Khasanah').style.display = 'none';
            if(kroscekGrp) kroscekGrp.style.display = 'none';
            if(uploadDiv) uploadDiv.style.display = 'none';
            
            if(document.getElementById('labelFileH1Khasanah')) document.getElementById('labelFileH1Khasanah').innerText = "Belum ada file diunggah."; 
            tbody.innerHTML = `<tr><td colspan="14" class="text-center" style="padding:20px; color:#64748b;">Silakan pilih bank pada dropdown untuk memproses antrean kroscek.</td></tr>`;
            infoDiv.innerHTML = ''; 
            return; 
        }

        let kState = this.kroscekStateKhasanah[bankK];
        
        if (kState.status === 'REVISI') { 
            let detailLengkap = kState.data.map(d => {
                let satuan = (d.jenis === 'KOIN') ? 'Keping' : 'Lembar';
                let kondisiTxt = d.kondisi ? d.kondisi.replace('KONDISI_', '').toUpperCase() : 'UNSORTED';
                return `<li style="margin-bottom:6px; margin-left:15px;">Pecahan <b>Rp ${Number(d.denom).toLocaleString('id-ID')} (${d.jenis})</b> | Emisi: <b>${d.emisi || '-'}</b> | Fisik: <b>${kondisiTxt}</b> <br> <span style="color:#ef4444; font-weight:bold;">↳ Sistem ${d.tipe} ${Number(d.qty).toLocaleString('id-ID')} ${satuan}</span></li>`;
            }).join(''); 

            infoDiv.innerHTML = `<div style="background:#fee2e2; color:#991b1b; padding:12px; border-radius:6px; margin-bottom:15px; border:1px solid #fca5a5;">
                <b style="font-size:13px;">⚠️ Menunggu Perbaikan Admin (Data Dikembalikan Dari Kroscek Fisik)</b>
                <ul style="margin-top:8px; font-size:12px;">${detailLengkap}</ul>
            </div>`; 
        } 
        else if (kState.status === 'WAITING') { 
            if (kState.admin_changes && kState.admin_changes.length > 0) { 
                let detail = kState.admin_changes.map(d => { 
                    let aksiTeks = d.diff > 0 ? `Ditambah ${d.diff.toLocaleString('id-ID')}` : `Dikurang ${Math.abs(d.diff).toLocaleString('id-ID')}`; 
                    let color = d.diff > 0 ? '#059669' : '#ef4444'; 
                    let satuan = d.jenis === 'KOIN' ? 'Keping' : 'Lembar';
                    return `<li style="margin-left: 20px;">Pecahan <b>Rp ${parseInt(d.denom).toLocaleString('id-ID')} (${d.jenis})</b> (Emisi: <b>${d.emisi}</b>, Kondisi: <b>${d.kondisi.toUpperCase()}</b>) : <span style="color:${color}; font-weight:bold;">${aksiTeks} ${satuan}</span></li>`; 
                }).join(''); 
                
                infoDiv.innerHTML = `<div style="background:#f0fdf4; color:#065f46; padding:12px; border-radius:6px; margin-bottom:15px; border:1px solid #6ee7b7;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <div style="font-size:16px;">🔄</div>
                        <div><b style="font-size:13px;">Saldo Telah Diperbarui Admin (Hanya Perubahan Fisik)</b></div>
                    </div>
                    <p style="margin-top:4px; font-size:11px; margin-bottom:8px;">Admin telah melakukan penyesuaian saldo fisik berikut yang menggantikan selisih sebelumnya:</p>
                    <ul style="margin-top:8px; font-size:12px; padding-left:10px;">${detail}</ul>
                </div>`; 
            } else { 
                infoDiv.innerHTML = `<div style="background:#eff6ff; color:#1e40af; padding:12px; border-radius:6px; margin-bottom:15px; border:1px solid #93c5fd;">
                    <b style="font-size:13px;">ℹ️ Menunggu Kroscek (Data Baru)</b>
                    <p style="margin-top:4px; font-size:11px;">Silakan cek fisik. Jika sudah Balance, langsung klik "KROSCEK SELESAI (Balance)".</p>
                </div>`; 
            } 
        }

        let bankDb = this.saldoKhasanah[bankK] || []; let h1Db = this.hPlus1DataKhasanah[bankK] || []; let groupedKhasanah = {}; let totalKhasanahPerDenom = {};
        bankDb.forEach(r => { 
            let rowTot = 0; this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0)); 
            if(rowTot !== 0) { 
                let key = r.jenis + "_" + r.denom;
                if(!groupedKhasanah[key]) { groupedKhasanah[key] = []; totalKhasanahPerDenom[key] = 0; } 
                groupedKhasanah[key].push(r); totalKhasanahPerDenom[key] += rowTot; 
            } 
        });
        let totalH1PerDenom = {}; h1Db.forEach(r => { 
            let rowTot = 0; this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0)); 
            if(rowTot !== 0) { 
                let key = r.jenis + "_" + r.denom;
                if(!totalH1PerDenom[key]) { totalH1PerDenom[key] = 0; } 
                totalH1PerDenom[key] += rowTot; 
            } 
        });
        
        let sortedKeys = Object.keys(groupedKhasanah).sort((a,b) => {
            let [jenisA, denomA] = a.split('_'); let [jenisB, denomB] = b.split('_');
            if (jenisA !== jenisB) return jenisA === 'KERTAS' ? -1 : 1;
            return Number(denomB) - Number(denomA);
        });
        
        let flagKoinMulai = false; let grandTotalNominalTabel1 = 0;
        
        sortedKeys.forEach(key => {
            let [jenis, denomStr] = key.split('_'); let denom = Number(denomStr);
            let rows = groupedKhasanah[key]; let rowSpan = rows.length; 
            
            if(jenis === 'KOIN' && !flagKoinMulai) { tbody.innerHTML += `<tr class="row-koin-separator"><td colspan="14" style="text-align:center;">--- UANG LOGAM (KOIN) ---</td></tr>`; flagKoinMulai = true; }
            let khasanahTot = totalKhasanahPerDenom[key] || 0; grandTotalNominalTabel1 += (khasanahTot * denom); let h1Tot = totalH1PerDenom[key] || 0; let autoSelisihVal = ''; let autoTipe = '';
            if (isAuto && h1Db.length > 0) { autoSelisihVal = Math.abs(h1Tot - khasanahTot); if (khasanahTot > h1Tot) autoTipe = 'LEBIH'; else if (khasanahTot < h1Tot) autoTipe = 'KURANG'; if (autoSelisihVal === 0) { autoSelisihVal = ''; autoTipe = ''; } }
            
            rows.forEach((r, idx) => {
                let rowTot = 0; this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0)); let tr = document.createElement('tr'); let html = '';
                if (idx === 0) html += `<td rowspan="${rowSpan}" class="col-denom" style="text-align:center; vertical-align:middle; font-size:14px;">${denom.toLocaleString('id-ID')}</td>`;
                html += `<td class="col-emisi" style="text-align:center;">${r.emisi}</td>`; this.kategoriKunciKhasanah.forEach(k => { html += `<td>${r[k] === 0 ? '-' : r[k].toLocaleString('id-ID')}</td>`; });
                html += `<td style="background:#f1f5f9; font-weight:bold;">${rowTot.toLocaleString('id-ID')}</td>`; html += `<td style="background:#dbeafe; font-weight:bold; color:#1e40af;">${(rowTot * denom).toLocaleString('id-ID')}</td>`;
                
                if (idx === 0) { 
                    let idPrefix = `kroscek_${jenis}_${denom}`; let disabledAttr = isAuto ? 'readonly' : ''; let disabledSelectAttr = isAuto ? 'disabled' : ''; 
                    let placeholderSatuan = jenis === 'KOIN' ? 'Keping' : 'Lembar';
                    html += `<td rowspan="${rowSpan}" style="background:#eff6ff; vertical-align:middle; text-align:center; border-left: 2px solid #cbd5e1;"><input type="number" id="input_selisih_${idPrefix}" data-denom="${denom}" data-jenis="${jenis}" ${disabledAttr} value="${autoSelisihVal}" style="width:100%; text-align:center; font-weight:bold; padding:6px; border:1px solid #94a3b8; border-radius:4px; outline:none;" placeholder="${placeholderSatuan}"></td>`;
                    html += `<td rowspan="${rowSpan}" style="background:#f8fafc; vertical-align:middle;"><select id="select_selisih_${idPrefix}" ${disabledSelectAttr} style="width:100%; padding:6px; font-weight:bold; border-radius:4px; outline:none;"><option value="">-- Balance --</option><option value="LEBIH" ${autoTipe==='LEBIH'?'selected':''} style="color:#059669;">LEBIH (FISIK > H+1)</option><option value="KURANG" ${autoTipe==='KURANG'?'selected':''} style="color:#ef4444;">KURANG (FISIK < H+1)</option></select></td>`;
                }
                tr.innerHTML = html; tbody.appendChild(tr);
            });
        });
        tFoot1.innerHTML = `<tr><td colspan="11" class="text-right" style="font-weight:bold; background:#e2e8f0;">GRAND TOTAL KHASANAH :</td><td class="text-right" style="font-weight:bold; background:#e2e8f0; color:#1e40af;">Rp ${grandTotalNominalTabel1.toLocaleString('id-ID')}</td><td colspan="2" style="background:#e2e8f0;"></td></tr>`;

        if(isAuto && h1Db.length > 0) {
            let h1Html = ''; let grandTotalH1 = 0; let flagKoinH1 = false;
            let sortedH1Keys = Object.keys(totalH1PerDenom).sort((a,b) => { let [jenisA, denomA] = a.split('_'); let [jenisB, denomB] = b.split('_'); if (jenisA !== jenisB) return jenisA === 'KERTAS' ? -1 : 1; return Number(denomB) - Number(denomA); });
            
            sortedH1Keys.forEach(key => {
                let [jenis, denomStr] = key.split('_'); let denom = Number(denomStr);
                let khasanahTot = totalKhasanahPerDenom[key] || 0; let h1Tot = totalH1PerDenom[key] || 0;
                let h1Rows = h1Db.filter(r => r.jenis === jenis && r.denom === denom); let rowSpan = h1Rows.length;
                
                if(jenis === 'KOIN' && !flagKoinH1) { 
                    let sepHTML = `<tr class="row-koin-separator"><td colspan="11" style="text-align:center;">--- UANG LOGAM (KOIN) ---</td></tr>`;
                    tDetail.innerHTML += sepHTML;
                    h1Html += `<tr class="row-koin-separator"><td colspan="12" style="text-align:center;">--- UANG LOGAM (KOIN) ---</td></tr>`; 
                    flagKoinH1 = true; 
                }
                
                let khasanahRows = groupedKhasanah[key] || [];
                let emisiSet = new Set();
                h1Rows.forEach(r => emisiSet.add(r.emisi)); 
                khasanahRows.forEach(r => emisiSet.add(r.emisi));
                
                let emisiArr = Array.from(emisiSet).sort((a, b) => {
                    let numA = parseInt(a);
                    let numB = parseInt(b);
                    if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
                    if (!isNaN(numA)) return -1;
                    if (!isNaN(numB)) return 1;
                    return b.localeCompare(a);
                });
                
                let eSpan = emisiArr.length;
                
                emisiArr.forEach((ems, eIdx) => {
                    let rowLama = khasanahRows.find(x => x.emisi === ems) || {}; 
                    let rowBaru = h1Rows.find(x => x.emisi === ems) || {}; 
                    
                    let tr = document.createElement('tr'); let h = '';
                    if(eIdx === 0) h += `<td rowspan="${eSpan}" class="col-denom" style="text-align:center; vertical-align:middle; font-size:14px;">${denom.toLocaleString('id-ID')}</td>`;
                    h += `<td class="col-emisi" style="text-align:center;">${ems}</td>`;
                    
                    let totalSelisihBaris = 0;
                    this.kategoriKunciKhasanah.forEach(k => {
                        let qtyH1 = rowBaru[k] || 0; 
                        let qtyKhasanah = rowLama[k] || 0; 
                        let d = qtyH1 - qtyKhasanah; 
                        totalSelisihBaris += d;
                        
                        let style = ''; let tx = '0';
                        if(d > 0) { style = 'color:#059669; font-weight:bold; background:#d1fae5;'; tx = `+${d}`; } 
                        else if (d < 0) { style = 'color:#ef4444; font-weight:bold; background:#fee2e2;'; tx = d.toString(); }
                        h += `<td style="${style}">${tx}</td>`;
                    });
                    
                    let styleTotal = ''; let txTotal = '0';
                    if(totalSelisihBaris > 0) { styleTotal = 'color:#059669; font-weight:bold; background:#a7f3d0;'; txTotal = `+${totalSelisihBaris}`; } 
                    else if (totalSelisihBaris < 0) { styleTotal = 'color:#ef4444; font-weight:bold; background:#fecaca;'; txTotal = totalSelisihBaris.toString(); }
                    h += `<td style="${styleTotal}">${txTotal}</td>`;
                    
                    tr.innerHTML = h; tDetail.appendChild(tr);
                });
                
                h1Rows.forEach((r, idx) => {
                    let rowTot = 0; this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0)); grandTotalH1 += (rowTot * denom);
                    let tr = document.createElement('tr'); let h = '';
                    if (idx === 0) h += `<td rowspan="${rowSpan}" class="col-denom" style="text-align:center; vertical-align:middle; font-size:14px;">${denom.toLocaleString('id-ID')}</td>`;
                    h += `<td class="col-emisi" style="text-align:center;">${r.emisi}</td>`; this.kategoriKunciKhasanah.forEach(k => { h += `<td>${r[k] === 0 ? '-' : r[k].toLocaleString('id-ID')}</td>`; });
                    h += `<td style="background:#f1f5f9; font-weight:bold;">${rowTot.toLocaleString('id-ID')}</td>`; h += `<td style="background:#dbeafe; font-weight:bold; color:#1e40af;">${(rowTot * denom).toLocaleString('id-ID')}</td>`;
                    tr.innerHTML = h; tH1.appendChild(tr);
                });
            });
            
            tFoot3.innerHTML = `<tr><td colspan="11" class="text-right" style="font-weight:bold; background:#e2e8f0;">GRAND TOTAL H+1 :</td><td class="text-right" style="font-weight:bold; background:#e2e8f0; color:#1e40af;">Rp ${grandTotalH1.toLocaleString('id-ID')}</td></tr>`;
        }
    },

    kirimKeKroscekKhasanah: function() {
        if (!this.cekValidasiAkses('khasanah_input') && !this.cekValidasiAkses('khasanah_edit') && !this.cekValidasiAkses('khasanah_kroscek')) {
            return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak untuk mengirim ke antrean Kroscek.", "error");
        }

        const bankK = this.bankAktifKhasanah;
        if (!bankK) return Swal.fire('Error', 'Pilih bank terlebih dahulu', 'error');
        let dataBank = this.saldoKhasanah[bankK] || [];
        if (dataBank.length === 0) return Swal.fire('Error', 'Saldo Khasanah kosong, tidak ada yang bisa dikirim.', 'error');
        
        let kState = this.kroscekStateKhasanah[bankK] || {};
        
        if (kState.status === 'WAITING') { 
            return Swal.fire('Info', 'Data sudah berada di antrean kroscek.', 'info'); 
        }

        Swal.fire({ title: 'Kirim Data ke Kroscek?', text: "Saldo ini akan dikirim ke tim Kroscek Fisik.", icon: 'question', showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Ya, Kirim' }).then((result) => {
            if (result.isConfirmed) {
                if (!this.kroscekStateKhasanah[bankK]) this.kroscekStateKhasanah[bankK] = {};
                let newState = this.kroscekStateKhasanah[bankK];
                
                if (newState.status === 'REVISI' && newState.snapshot) {
                    let snapshotDb = newState.snapshot;
                    let currentDb = dataBank;
                    let tempChanges = [];
                    let emisiSet = new Set();
                    
                    snapshotDb.forEach(x => emisiSet.add(x.jenis + '_' + x.denom + '_' + x.emisi));
                    currentDb.forEach(x => emisiSet.add(x.jenis + '_' + x.denom + '_' + x.emisi));
                    
                    let kondisiList = this.kategoriKunciKhasanah || ['gress_bi', 'fit_atm', 'ule', 'utle', 'minor', 'mayor', 'u_lama', 'unsorted'];

                    emisiSet.forEach(key => {
                        let [jenis, denomStr, ems] = key.split('_');
                        let denom = parseInt(denomStr);
                        let objLama = snapshotDb.find(x => x.denom === denom && x.jenis === jenis && x.emisi === ems) || {};
                        let objBaru = currentDb.find(x => x.denom === denom && x.jenis === jenis && x.emisi === ems) || {};

                        kondisiList.forEach(kondisi => {
                            let qtyLama = objLama[kondisi] || 0;
                            let qtyBaru = objBaru[kondisi] || 0;
                            let diff = qtyBaru - qtyLama;

                            if (diff !== 0) {
                                tempChanges.push({ jenis: jenis, denom: denom, emisi: ems, kondisi: kondisi, diff: diff, waktu: new Date().toLocaleString('id-ID') });
                            }
                        });
                    });
                    
                    newState.admin_changes = tempChanges;
                }
                
                newState.status = 'WAITING';
                newState.timestamp = Date.now();
                this.database.ref('khasanah_kroscek').set(this.kroscekStateKhasanah).then(() => { 
                    Swal.fire('Terkirim!', 'Data telah berhasil dikirim ke antrean kroscek.', 'success'); 
                    this.renderSaldoKhasanah(); 
                });
            }
        });
    },

    kirimRevisiKroscekKhasanah: function() {
        if (!this.cekValidasiAkses('khasanah_kroscek')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak untuk merevisi fisik (Kroscek).", "error");

        const bankK = document.getElementById('pilihBankKroscekKhasanah').value;
        const mode = document.getElementById('kroscekModeKhasanah').value;
        if (!bankK) return Swal.fire('Error', 'Pilih bank terlebih dahulu', 'error');
        
        let dataRevisi = [];
        let bankDb = this.saldoKhasanah[bankK] || [];
        
        if (mode === 'manual') {
            let keys = [...new Set(bankDb.map(x => x.jenis + "_" + x.denom))]; 
            try {
                keys.forEach(key => {
                    let [jenis, denomStr] = key.split('_');
                    let denom = Number(denomStr);
                    let idPrefix = `kroscek_${jenis}_${denom}`;
                    let inputEl = document.getElementById(`input_selisih_${idPrefix}`);
                    let selectTipeEl = document.getElementById(`select_selisih_${idPrefix}`);
                    
                    if(inputEl && selectTipeEl) {
                        let qty = parseInt(inputEl.value);
                        let tipe = selectTipeEl.value;

                        if(!isNaN(qty) && qty > 0) {
                            if(!tipe) { Swal.fire('Peringatan', `Keterangan (Lebih/Kurang) untuk pecahan ${denom} wajib diisi!`, 'warning'); throw new Error('Validation Error'); }
                            dataRevisi.push({ jenis: jenis, denom: denom, emisi: "-", kondisi: "GLOBAL", qty: qty, tipe: tipe });
                        }
                    }
                });
            } catch (e) { return; }
        } else {
            let h1Db = this.hPlus1DataKhasanah[bankK] || [];
            if (h1Db.length === 0) return Swal.fire('Error', 'File H+1 belum diunggah untuk mode otomatis.', 'error');

            let mapGlobal = {};
            bankDb.forEach(r => {
                let rowTot = 0;
                this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0));
                if(rowTot > 0) {
                    let key = `${r.jenis}_${r.denom}`;
                    if(!mapGlobal[key]) mapGlobal[key] = { jenis: r.jenis, denom: r.denom, khasanah: 0, h1: 0 };
                    mapGlobal[key].khasanah += rowTot;
                }
            });
            h1Db.forEach(r => {
                let rowTot = 0;
                this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0));
                if(rowTot > 0) {
                    let key = `${r.jenis}_${r.denom}`;
                    if(!mapGlobal[key]) mapGlobal[key] = { jenis: r.jenis, denom: r.denom, khasanah: 0, h1: 0 };
                    mapGlobal[key].h1 += rowTot;
                }
            });

            Object.values(mapGlobal).forEach(d => {
                if (d.khasanah > d.h1) { 
                    dataRevisi.push({ jenis: d.jenis, denom: d.denom, emisi: "-", kondisi: "GLOBAL", qty: (d.khasanah - d.h1), tipe: 'LEBIH' }); 
                } else if (d.khasanah < d.h1) { 
                    dataRevisi.push({ jenis: d.jenis, denom: d.denom, emisi: "-", kondisi: "GLOBAL", qty: (d.h1 - d.khasanah), tipe: 'KURANG' }); 
                }
            });
        }

        if (dataRevisi.length === 0) { 
            return Swal.fire('Info', 'Tidak ada selisih yang diinput / ditemukan. Jika fisik sudah sesuai, silakan klik tombol hijau "KROSCEK SELESAI".', 'info'); 
        }

        Swal.fire({ title: 'Kirim Laporan Selisih ke Admin?', text: "Laporan selisih akan dikembalikan ke Admin Khasanah untuk perbaikan.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#f59e0b', confirmButtonText: 'Ya, Kirim Laporan' }).then((result) => {
            if (result.isConfirmed) {
                this.kroscekStateKhasanah[bankK] = { status: 'REVISI', data: dataRevisi, snapshot: JSON.parse(JSON.stringify(bankDb)), timestamp: Date.now() };
                this.database.ref('khasanah_kroscek').set(this.kroscekStateKhasanah).then(() => { Swal.fire('Terkirim!', 'Laporan Selisih telah dikembalikan ke Admin Khasanah.', 'success'); this.renderKroscekKhasanah(); });
            }
        });
    },

    // PENAMBAHAN: Cek balance saat kroscek selesai ditekan
    selesaiKroscekKhasanah: function() {
        if (!this.cekValidasiAkses('khasanah_kroscek')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak menyetujui kroscek (Kroscek).", "error");

        const bankK = document.getElementById('pilihBankKroscekKhasanah').value;
        const mode = document.getElementById('kroscekModeKhasanah').value;
        if (!bankK) return Swal.fire('Error', 'Pilih bank terlebih dahulu', 'error');

        // LOGIKA PENGECEKAN SELISIH SEBELUM BISA BALANCE
        let hasSelisih = false;
        let bankDb = this.saldoKhasanah[bankK] || [];

        if (mode === 'manual') {
            let keys = [...new Set(bankDb.map(x => x.jenis + "_" + x.denom))];
            keys.forEach(key => {
                let [jenis, denomStr] = key.split('_');
                let denom = Number(denomStr);
                let inputEl = document.getElementById(`input_selisih_kroscek_${jenis}_${denom}`);
                if (inputEl) {
                    let qty = parseInt(inputEl.value);
                    if (!isNaN(qty) && qty > 0) hasSelisih = true;
                }
            });
        } else {
            let h1Db = this.hPlus1DataKhasanah[bankK] || [];
            let mapGlobal = {};
            bankDb.forEach(r => {
                let rowTot = 0; this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0));
                if (rowTot > 0) {
                    let key = `${r.jenis}_${r.denom}`;
                    if (!mapGlobal[key]) mapGlobal[key] = { khasanah: 0, h1: 0 };
                    mapGlobal[key].khasanah += rowTot;
                }
            });
            h1Db.forEach(r => {
                let rowTot = 0; this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0));
                if (rowTot > 0) {
                    let key = `${r.jenis}_${r.denom}`;
                    if (!mapGlobal[key]) mapGlobal[key] = { khasanah: 0, h1: 0 };
                    mapGlobal[key].h1 += rowTot;
                }
            });
            Object.values(mapGlobal).forEach(d => {
                if (d.khasanah !== d.h1) hasSelisih = true;
            });
        }

        if (hasSelisih) {
            return Swal.fire(
                'Tidak Dapat Diselesaikan!', 
                'Masih terdapat selisih antara Fisik (Sistem Khasanah) dengan referensi (Inputan/H+1).<br><br>Harap kirimkan laporan selisih ke Admin Khasanah menggunakan tombol kuning <b>"Kirim Hasil Kroscek (Ada Selisih)"</b> untuk ditindaklanjuti.', 
                'error'
            );
        }
        
        // JIKA TIDAK ADA SELISIH (BALANCE) LANJUTKAN:
        Swal.fire({ title: 'Kroscek Selesai (Balance)?', text: "Pastikan fisik uang benar-benar sudah sesuai (BALANCE). Data akan siap untuk proses End of Day (EOD).", icon: 'question', showCancelButton: true, confirmButtonColor: '#10b981', confirmButtonText: 'Ya, Fisik Balance!' }).then((result) => {
            if (result.isConfirmed) {
                this.kroscekStateKhasanah[bankK] = { status: 'BALANCE', timestamp: Date.now() };
                this.database.ref('khasanah_kroscek').set(this.kroscekStateKhasanah).then(() => { Swal.fire('Selesai!', 'Status kroscek bank ini BALANCE.', 'success'); this.renderKroscekKhasanah(); });
            }
        });
    },

    ubahViewCetakKhasanah: function(type) {
        this.viewCetakTypeKhasanah = type;
        document.getElementById('wadahCetakLembar').style.display = type === 'lembar' ? 'block' : 'none';
        document.getElementById('wadahCetakNominal').style.display = type === 'nominal' ? 'block' : 'none';
        document.getElementById('btnViewCetakLembarKhasanah').style.background = type === 'lembar' ? '#3b82f6' : '#64748b';
        document.getElementById('btnViewCetakNominalKhasanah').style.background = type === 'nominal' ? '#3b82f6' : '#64748b';
    },

    getSortedDataKhasanah: function() {
        let dbBank = this.saldoKhasanah[this.bankAktifKhasanah] || [];
        return [...dbBank].sort((a,b) => {
            if(a.jenis !== b.jenis) return a.jenis === 'KERTAS' ? -1 : 1;
            if(a.denom !== b.denom) return b.denom - a.denom;
            return (a.emisi || "").localeCompare(b.emisi || "");
        });
    },

    renderCetakKhasanah: function() {
        const tglStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('cetakTglKhasanah').innerText = tglStr;
        document.getElementById('cetakBankKhasanah').innerText = this.bankAktifKhasanah;
        
        const tbLmb = document.getElementById('cetakLembarBodyKhasanah');
        const tbNom = document.getElementById('cetakNominalBodyKhasanah');
        if(!tbLmb || !tbNom) return;
        tbLmb.innerHTML = ''; tbNom.innerHTML = '';
        
        let sortedData = this.getSortedDataKhasanah();
        if(sortedData.length === 0) {
            tbLmb.innerHTML = `<tr><td colspan="11" style="text-align:center;">Tidak ada data fisik.</td></tr>`;
            tbNom.innerHTML = `<tr><td colspan="11" style="text-align:center;">Tidak ada data fisik.</td></tr>`;
            return;
        }

        let gTotLmb = 0, gTotNom = 0; let fKoinL = false, fKoinN = false;
        
        sortedData.forEach(r => {
            let rTot = 0; this.kategoriKunciKhasanah.forEach(k => rTot += (r[k] || 0)); if (rTot === 0) return;
            gTotLmb += rTot; gTotNom += (rTot * r.denom);
            
            if(r.jenis === 'KOIN' && !fKoinL) { tbLmb.innerHTML += `<tr><td colspan="11" style="text-align:center; background:#fef08a;"><b>--- UANG LOGAM (KOIN) ---</b></td></tr>`; fKoinL = true; }
            if(r.jenis === 'KOIN' && !fKoinN) { tbNom.innerHTML += `<tr><td colspan="11" style="text-align:center; background:#fef08a;"><b>--- UANG LOGAM (KOIN) ---</b></td></tr>`; fKoinN = true; }
            
            let hL = `<tr><td style="text-align:center; font-weight:bold;">${r.denom.toLocaleString('id-ID')}</td><td style="text-align:center;">${r.emisi}</td>`;
            let hN = `<tr><td style="text-align:center; font-weight:bold;">${r.denom.toLocaleString('id-ID')}</td><td style="text-align:center;">${r.emisi}</td>`;
            
            this.kategoriKunciKhasanah.forEach(k => { let v = r[k] || 0; hL += `<td>${v === 0 ? '-' : v.toLocaleString('id-ID')}</td>`; hN += `<td>${v === 0 ? '-' : (v * r.denom).toLocaleString('id-ID')}</td>`; });
            hL += `<td style="background:#cbd5e1; font-weight:bold;">${rTot.toLocaleString('id-ID')}</td></tr>`;
            hN += `<td style="background:#cbd5e1; font-weight:bold;">${(rTot * r.denom).toLocaleString('id-ID')}</td></tr>`;
            
            tbLmb.innerHTML += hL; tbNom.innerHTML += hN;
        });
        
        tbLmb.innerHTML += `<tr><td colspan="10" style="font-weight:bold;">GRAND TOTAL</td><td style="font-weight:bold; background:#94a3b8;">${gTotLmb.toLocaleString('id-ID')}</td></tr>`;
        tbNom.innerHTML += `<tr><td colspan="10" style="font-weight:bold;">GRAND TOTAL NOMINAL</td><td style="font-weight:bold; background:#94a3b8; color:#000;">Rp ${gTotNom.toLocaleString('id-ID')}</td></tr>`;
    },

    // PENAMBAHAN: Format EXCEL diubah total menggunakan objek styling dari xlsx-js-style
    unduhExcelKhasanah: function() {
        if (!this.cekValidasiAkses('khasanah_view')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin Cetak/Export.", "error");

        let sortedData = this.getSortedDataKhasanah();
        if(sortedData.length === 0) return Swal.fire('Gagal', 'Tidak ada data untuk diekspor.', 'error');
        
        let ws = {};
        let range = { s: { c: 0, r: 0 }, e: { c: 11, r: 0 } };

        // Variabel Styling Excel
        const borderAll = {
            top: { style: 'thin', color: { rgb: "000000" } },
            bottom: { style: 'thin', color: { rgb: "000000" } },
            left: { style: 'thin', color: { rgb: "000000" } },
            right: { style: 'thin', color: { rgb: "000000" } }
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } }, // Warna Primer (Biru-Indigo)
            alignment: { horizontal: "center", vertical: "center" },
            border: borderAll
        };
        const titleStyle = {
            font: { bold: true, sz: 14, color: { rgb: "1E40AF" } },
            alignment: { horizontal: "center" }
        };
        const dataStyleCenter = { alignment: { horizontal: "center" }, border: borderAll };
        const dataStyleRight = { alignment: { horizontal: "right" }, border: borderAll };
        const totalStyle = {
            font: { bold: true }, 
            fill: { fgColor: { rgb: "E2E8F0" } }, // Warna Slate-200
            alignment: { horizontal: "right" }, 
            border: borderAll
        };

        // Fungsi Helper untuk membuat cell
        let cell = (r, c, v, t = "s", s = null) => {
            let cellRef = XLSX.utils.encode_cell({ c, r });
            ws[cellRef] = { v: v, t: t };
            if (s) ws[cellRef].s = s;
            range.e.c = Math.max(range.e.c, c);
            range.e.r = Math.max(range.e.r, r);
        };

        // ROW 0: Title Laporan
        cell(0, 0, `LAPORAN SALDO FISIK KHASANAH - BANK ${this.bankAktifKhasanah}`, 's', titleStyle);
        // ROW 1: Tanggal Cetak
        cell(1, 0, `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 's', { font: { italic: true } });

        // ROW 3: Headers
        let headers = ["DENOM", "EMISI", "GRESS BI", "FIT ATM", "ULE", "UTLE", "MINOR", "MAYOR", "U. LAMA", "UNSORTED", "TOTAL (LBR/KPG)", "TOTAL NOMINAL"];
        let rIdx = 3;
        headers.forEach((h, cIdx) => cell(rIdx, cIdx, h, 's', headerStyle));

        rIdx++;
        let grandTot = 0;
        let isKoinPrinted = false;

        sortedData.forEach(r => {
            let rowTot = 0; 
            this.kategoriKunciKhasanah.forEach(k => rowTot += (r[k] || 0)); 
            if (rowTot === 0) return;
            grandTot += (rowTot * r.denom);

            // Pemisah Koin jika berhadapan dengan baris koin pertama (opsional, bisa dilewati namun untuk visual dirender sebagai border tebal atau semacamnya)
            if(r.jenis === 'KOIN' && !isKoinPrinted) {
                 cell(rIdx, 0, "--- UANG LOGAM (KOIN) ---", 's', { font: { bold:true, color:{rgb:"92400E"} }, fill: { fgColor: {rgb:"FEF08A"} }, alignment: { horizontal: "center" }, border: borderAll });
                 for(let c=1; c<=11; c++) cell(rIdx, c, "", 's', { border: borderAll, fill: { fgColor: {rgb:"FEF08A"} }});
                 ws['!merges'] = ws['!merges'] || [];
                 ws['!merges'].push({ s: {r:rIdx, c:0}, e: {r:rIdx, c:11} });
                 rIdx++;
                 isKoinPrinted = true;
            }

            cell(rIdx, 0, r.denom, 'n', dataStyleCenter);
            cell(rIdx, 1, r.emisi, 's', dataStyleCenter);
            cell(rIdx, 2, r.gress_bi || 0, 'n', dataStyleRight);
            cell(rIdx, 3, r.fit_atm || 0, 'n', dataStyleRight);
            cell(rIdx, 4, r.ule || 0, 'n', dataStyleRight);
            cell(rIdx, 5, r.utle || 0, 'n', dataStyleRight);
            cell(rIdx, 6, r.minor || 0, 'n', dataStyleRight);
            cell(rIdx, 7, r.mayor || 0, 'n', dataStyleRight);
            cell(rIdx, 8, r.u_lama || 0, 'n', dataStyleRight);
            cell(rIdx, 9, r.unsorted || 0, 'n', dataStyleRight);
            cell(rIdx, 10, rowTot, 'n', { ...dataStyleRight, font: { bold: true }, fill: { fgColor: { rgb: "F1F5F9" } } });
            cell(rIdx, 11, (rowTot * r.denom), 'n', { ...dataStyleRight, font: { bold: true, color: { rgb: "1E40AF" } }, fill: { fgColor: { rgb: "DBEAFE" } } });
            rIdx++;
        });

        // ROW: Grand Total
        cell(rIdx, 0, "GRAND TOTAL KESELURUHAN", 's', totalStyle);
        for (let c = 1; c <= 10; c++) cell(rIdx, c, "", 's', totalStyle); 
        cell(rIdx, 11, grandTot, 'n', totalStyle);

        ws['!ref'] = XLSX.utils.encode_range(range);
        
        // Atur Merge Cells (Judul & Teks Total)
        ws['!merges'] = ws['!merges'] || [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }); // Merge Judul
        ws['!merges'].push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: 10 } }); // Merge Grand Total Teks

        // Auto width kolom
        ws['!cols'] = [
            { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 25 }
        ];

        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Khasanah");
        XLSX.writeFile(wb, `Laporan_Khasanah_${this.bankAktifKhasanah}_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    unduhJpgKhasanah: function() {
        if (!this.cekValidasiAkses('khasanah_view')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin Cetak/Export.", "error");

        this.renderCetakKhasanah();
        const el = document.getElementById('cetak-area-khasanah');
        const btn = document.getElementById('btnCetakJpgKhasanah'); const backup = btn.innerHTML;
        btn.innerHTML = "⏳ Memproses..."; btn.disabled = true;
        
        html2canvas(el, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Laporan_Khasanah_${this.bankAktifKhasanah}_${new Date().toISOString().split('T')[0]}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9); link.click();
            btn.innerHTML = backup; btn.disabled = false;
        }).catch(err => {
            Swal.fire('Error', "Gagal memproses gambar.", 'error');
            btn.innerHTML = backup; btn.disabled = false;
        });
    }
});

document.addEventListener('DOMContentLoaded', () => { app.init(); });