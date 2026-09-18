// ==========================================
// FILE: return/return.js
// FUNGSI: Logika Form & Cetak Retur ATM (Terintegrasi RBAC Global)
// ==========================================

const currentUser = typeof AuthHelper !== 'undefined' ? AuthHelper.checkAccess() : null;
window.currentRealtimeAkses = null;

const app = {
    dbAtm: [], dbRetur: [], dbAkses: [], dbKaryawan: [], editReturId: null, currentUser: currentUser,

    init: function() {
        if (!currentUser) return;
        this.database = typeof db !== 'undefined' ? db : (firebase.apps.length ? firebase.database() : null);
        if(!this.database) return alert("Firebase Database Belum Terkoneksi!");

        // Listeners DB
        this.database.ref('lokasi_atm').on('value', snap => { 
            let d = snap.val(); this.dbAtm = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
        });

        this.database.ref('retur_atm').on('value', snap => { 
            let d = snap.val(); this.dbRetur = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if(document.getElementById('menu-retur-daftar') && document.getElementById('menu-retur-daftar').classList.contains('active')) app.renderDaftarRetur(); 
        });

        this.database.ref('hak_akses').on('value', snap => { 
            let d = snap.val(); 
            this.dbAkses = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if (currentUser && currentUser.idKaryawan) {
                window.currentRealtimeAkses = this.dbAkses.find(a => a && a.idKaryawan === currentUser.idKaryawan) || null;
            }
            this.terapkanUIAkses();
        });

        this.database.ref('karyawan').on('value', snap => {
            let d = snap.val(); 
            this.dbKaryawan = Array.isArray(d) ? d : (d ? Object.values(d) : []);
        });

        this.resetSeluruhFormRetur(); 
        this.renderTabelInputRetur();
    },

    // ==========================================
    // SISTEM KEAMANAN & AKSES (RBAC & PIN)
    // ==========================================
    cekValidasiAkses: function(kodeAkses) { 
        if (typeof AuthHelper === 'undefined') return false;
        return AuthHelper.cekAkses(kodeAkses, window.currentRealtimeAkses);
    },

    terapkanUIAkses: function() {
        let canView = this.cekValidasiAkses('return_view') || this.cekValidasiAkses('return_input') || this.cekValidasiAkses('return_edit') || this.cekValidasiAkses('return_hapus');
        let canInput = this.cekValidasiAkses('return_input') || this.cekValidasiAkses('return_edit');

        // Jika tidak punya akses sama sekali
        if (!canView) {
            Swal.fire("Akses Ditolak!", "Anda tidak memiliki hak akses untuk Modul Retur ATM.", "error").then(() => {
                // PERBAIKAN: Rute sweetalert diarahkan ke root Vercel (/index.html)
                window.location.href = '/index.html';
            });
            return;
        }

        let navInput = document.getElementById('nav-retur-input');
        let navDaftar = document.getElementById('nav-retur-daftar');
        
        if (navInput) navInput.style.display = canInput ? 'block' : 'none';
        if (navDaftar) navDaftar.style.display = canView ? 'block' : 'none';

        // Jika user cuma punya hak VIEW tapi halamannya dipaksa di Input (karena state HTML aktif), paksa pindah ke Daftar
        if (!canInput && document.getElementById('menu-retur-input').classList.contains('active')) {
            this.switchMenuRetur('menu-retur-daftar', document.getElementById('nav-retur-daftar'));
        }
    },

    otorisasiAksi: function(callback) {
        if(!this.currentUser) return;
        if(this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN') return callback();
        let myAkses = window.currentRealtimeAkses;
        if(!myAkses) return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak akses sistem.", "error");

        if(myAkses.tanpaPin === true || String(myAkses.tanpaPin) === 'true') {
            return callback(); 
        }

        let pinModul = (myAkses.pinMapping && myAkses.pinMapping.return) ? myAkses.pinMapping.return : 1;
        let kId = this.currentUser.idKaryawan || this.currentUser.id; 
        
        Swal.fire({
            title: 'Otorisasi PIN (Retur)',
            text: `Masukkan PIN ${pinModul} Anda untuk melanjutkan`,
            input: 'password',
            inputAttributes: { autocapitalize: 'off', placeholder: 'Ketik PIN...' },
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Verifikasi',
            showLoaderOnConfirm: true,
            preConfirm: (loginPin) => {
                return new Promise((resolve) => {
                    let myData = this.dbKaryawan.find(k => k && (k.uniqueId === kId || k.idKaryawan === kId));
                    let pinValid = false;
                    
                    if (myData) {
                        if (pinModul == 1 && myData.pin1 === loginPin) pinValid = true;
                        if (pinModul == 2 && myData.pin2 === loginPin) pinValid = true;
                        if (pinModul == 3 && myData.pin3 === loginPin) pinValid = true;
                    }
                    
                    if (!pinValid) {
                        this.database.ref('settings').once('value').then(snap => {
                            let settings = snap.val() || {};
                            if (pinModul == 1 && settings.pin_karyawan_1 === loginPin) pinValid = true;
                            if (pinModul == 2 && settings.pin_karyawan_2 === loginPin) pinValid = true;
                            if (pinModul == 3 && settings.pin_karyawan_3 === loginPin) pinValid = true;
                            
                            if (pinValid) resolve();
                            else Swal.showValidationMessage('PIN Anda Salah!');
                        });
                    } else {
                        resolve();
                    }
                });
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed) {
                callback();
            }
        });
    },

    // ==========================================
    // LOGIKA ANTARMUKA RETUR
    // ==========================================
    switchMenuRetur: function(menuId, el) { 
        if(menuId === 'menu-retur-input' && !this.cekValidasiAkses('return_input') && !this.cekValidasiAkses('return_edit')) {
            return Swal.fire("Akses Ditolak!", "Anda tidak memiliki izin untuk membuat Input Retur Baru.", "error"); 
        }
        
        document.querySelectorAll('#retur-module .section').forEach(s => s.classList.remove('active')); 
        document.getElementById(menuId).classList.add('active'); 
        
        if(el) { 
            document.querySelectorAll('#retur-module .nav-link').forEach(n => n.classList.remove('active')); 
            el.classList.add('active'); 
        } 
        if (menuId === 'menu-retur-daftar') { this.renderDaftarRetur(); } 
        if (menuId === 'menu-retur-input' && !this.editReturId) { this.resetSeluruhFormRetur(); this.renderTabelInputRetur(); } 
        if (window.innerWidth <= 768) { document.querySelector('#retur-module .sidebar').classList.remove('active'); } 
    },
    
    cariWsidRetur: function() { 
        const inputEl = document.getElementById('returWsid'); const val = inputEl.value.trim().toUpperCase(); 
        const listEl = document.getElementById('autocomplete-list'); listEl.innerHTML = ''; 
        const jamMulaiInput = document.getElementById('returJamMulai'); 
        
        if (!val) { if(typeof this.resetSeluruhFormRetur === 'function') this.resetSeluruhFormRetur(); else this.resetFieldLokasiRetur(); return; } 
        if (val.length > 0 && !jamMulaiInput.value && !this.editReturId) { 
            const now = new Date(); jamMulaiInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; 
            document.getElementById('returIdKaryawan').value = this.currentUser ? (this.currentUser.id || this.currentUser.idKaryawan || '') : ''; 
            document.getElementById('returNamaKaryawan').value = this.currentUser ? (this.currentUser.nama || '') : ''; 
            document.getElementById('returTanggal').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; 
        } 
        
        const matches = this.dbAtm.filter(atm => atm && atm.wsid && atm.wsid.trim().toUpperCase().includes(val)); 
        if (matches.length > 0) { 
            listEl.style.display = 'block'; 
            matches.forEach(atm => { 
                let div = document.createElement('div'); div.className = 'autocomplete-item'; 
                div.innerHTML = `<strong>${atm.wsid}</strong><span>${atm.lokasi || '-'} (${atm.bank || '-'})</span>`; 
                div.onclick = () => { inputEl.value = atm.wsid; listEl.style.display = 'none'; app.pilihWsidRetur(atm); }; 
                listEl.appendChild(div); 
            }); 
        } else { 
            listEl.style.display = 'none'; let exactMatch = this.dbAtm.find(atm => atm && atm.wsid && atm.wsid.trim().toUpperCase() === val); 
            if(exactMatch) { app.pilihWsidRetur(exactMatch); } else { this.resetFieldLokasiRetur(); } 
        } 
    },
    
    pilihWsidRetur: function(dataAtm) { 
        document.getElementById('returBank').value = dataAtm.bank || "-"; document.getElementById('returLokasi').value = dataAtm.lokasi || "-"; 
        document.getElementById('returMerkAtm').value = dataAtm.merk || "Belum Ada (Menunggu Update)"; document.getElementById('returDenom').value = dataAtm.denom === 0 ? "Campur (CRM)" : `Rp ${dataAtm.denom.toLocaleString('id-ID')}`; 
    },
    
    resetFieldLokasiRetur: function() { 
        document.getElementById('returBank').value = ""; document.getElementById('returLokasi').value = ""; 
        document.getElementById('returMerkAtm').value = ""; document.getElementById('returDenom').value = ""; 
    },
    
    resetSeluruhFormRetur: function() { 
        if(this.editReturId) return; 
        document.getElementById('returNoMeja').value = ''; document.getElementById('returWsid').value = ''; 
        document.getElementById('returNoMeja').readOnly = false; document.getElementById('returWsid').readOnly = false; 
        this.resetFieldLokasiRetur(); 
        document.getElementById('returIdKaryawan').value = ''; document.getElementById('returNamaKaryawan').value = ''; 
        document.getElementById('returTanggal').value = ''; document.getElementById('returJamMulai').value = ''; document.getElementById('returJamSelesai').value = ''; 
        document.getElementById('autocomplete-list').style.display = 'none'; document.getElementById('areaTabelRetur').style.display = 'none'; 
    },
    
    kunciHeaderRetur: function() { 
        if (!document.getElementById('returNoMeja').value.trim() || !document.getElementById('returWsid').value.trim() || !document.getElementById('returBank').value) return Swal.fire('Oops', 'Lengkapi No Meja dan WS ID yang valid!', 'error'); 
        document.getElementById('returNoMeja').readOnly = true; document.getElementById('returWsid').readOnly = true; 
        document.getElementById('areaTabelRetur').style.display = 'block'; window.scrollTo({ top: document.getElementById('areaTabelRetur').offsetTop, behavior: 'smooth' }); this.renderTabelInputRetur(); 
    },
    
    renderTabelInputRetur: function() { 
        const denoms = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000]; 
        const rowsData = [ { id: 'c1', label: 'C - 1' }, { id: 'c2', label: 'C - 2' }, { id: 'c3', label: 'C - 3' }, { id: 'c4', label: 'C - 4' }, { id: 'div', label: 'DIVERT' }, { id: 'pock', label: 'POCKET' } ]; 
        const tbody = document.getElementById('bodyRincianUang'); tbody.innerHTML = ''; 
        rowsData.forEach(row => { 
            let tr = document.createElement('tr'); let htmlInput = `<td style="padding: 8px 12px; font-weight: bold; background: #f8fafc; text-align: left; color: #475569;">${row.label}</td>`; 
            denoms.forEach(denom => { htmlInput += `<td style="padding: 4px;"><input type="number" min="0" class="input-uang" data-denom="${denom}" data-col="${row.id}" style="width: 100%; text-align: center; border: 1px solid transparent; background: transparent; padding: 6px; font-weight: 600;" placeholder="0" oninput="app.hitungTotalUangRetur()"></td>`; }); 
            htmlInput += `<td id="row-tot-${row.id}" style="padding: 8px; font-weight: bold; color: #1e40af; background: #f1f5f9;">0</td>`; 
            tr.innerHTML = htmlInput; tbody.appendChild(tr); 
        }); 
    },
    
    hitungTotalUangRetur: function() { 
        const rows = ['c1', 'c2', 'c3', 'c4', 'div', 'pock']; const denoms = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000]; 
        let denomTotalLembar = { 100000: 0, 75000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0 }; let grandTotal = 0; 
        rows.forEach(row => { 
            let rowNominal = 0; 
            denoms.forEach(denom => { const inputEl = document.querySelector(`.input-uang[data-denom="${denom}"][data-col="${row}"]`); if(inputEl) { const lembar = parseInt(inputEl.value) || 0; denomTotalLembar[denom] += lembar; rowNominal += (lembar * denom); } }); 
            const rowTotEl = document.getElementById(`row-tot-${row}`); if(rowTotEl) rowTotEl.innerText = rowNominal.toLocaleString('id-ID'); grandTotal += rowNominal; 
        }); 
        denoms.forEach(denom => { const totLembarEl = document.getElementById(`tot-lembar-${denom}`); if(totLembarEl) totLembarEl.innerText = denomTotalLembar[denom].toLocaleString('id-ID'); }); 
        const grandTotEl = document.getElementById('grand-total-retur'); if(grandTotEl) grandTotEl.innerText = "Rp " + grandTotal.toLocaleString('id-ID'); 
    },
    
    // Proses Otorisasi PIN Sebelum Eksekusi Penyimpanan
    prosesSimpanDenganOtorisasi: function() {
        if (!this.editReturId && !document.getElementById('returNoMeja').readOnly) return Swal.fire('Error', 'Kunci Header (⬇️ Lanjut ke Tabel Rincian) terlebih dahulu sebelum Save!', 'error'); 
        if (!document.getElementById('returNoMeja').value.trim() || !document.getElementById('returWsid').value.trim()) return Swal.fire('Error', 'No Meja dan WS ID wajib diisi!', 'error'); 
        
        if (!this.cekValidasiAkses('return_input') && !this.cekValidasiAkses('return_edit')) {
            return Swal.fire('Akses Ditolak', 'Anda tidak memiliki izin menyimpan data Retur.', 'error');
        }
        
        this.otorisasiAksi(() => {
            this.simpanDataRetur();
        });
    },

    simpanDataRetur: function() { 
        const rows = ['c1', 'c2', 'c3', 'c4', 'div', 'pock']; const denoms = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000]; 
        let dataRincian = {}; 
        rows.forEach(row => { dataRincian[row] = {}; denoms.forEach(denom => { const inputEl = document.querySelector(`.input-uang[data-denom="${denom}"][data-col="${row}"]`); dataRincian[row][denom] = inputEl ? (parseInt(inputEl.value) || 0) : 0; }); }); 
        
        const now = new Date(); const jamSelesai = document.getElementById('returJamSelesai').value || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; document.getElementById('returJamSelesai').value = jamSelesai; 
        
        const dataSimpan = { 
            id: this.editReturId || 'RTR-' + Date.now().toString(), tanggal: document.getElementById('returTanggal').value, noMeja: document.getElementById('returNoMeja').value.trim(), 
            wsid: document.getElementById('returWsid').value.trim(), bank: document.getElementById('returBank').value, lokasi: document.getElementById('returLokasi').value, 
            merk: document.getElementById('returMerkAtm').value, denomStr: document.getElementById('returDenom').value, idKaryawan: document.getElementById('returIdKaryawan').value, 
            kasir: document.getElementById('returNamaKaryawan').value, jamMulai: document.getElementById('returJamMulai').value, jamSelesai: jamSelesai, 
            total: document.getElementById('grand-total-retur').innerText, rincian: dataRincian 
        }; 
        
        const btnSimpanRetur = document.getElementById('btnSimpanRetur'); const btnAsliRetur = btnSimpanRetur.innerHTML; btnSimpanRetur.innerHTML = '⏳ Menyimpan...'; btnSimpanRetur.disabled = true; 
        
        if (this.editReturId) {
            const idx = this.dbRetur.findIndex(r => r && r.id === this.editReturId);
            if (idx !== -1) {
                this.dbRetur[idx] = dataSimpan;
            } else {
                this.dbRetur.push(dataSimpan);
            }
        } else {
            this.dbRetur.push(dataSimpan);
        }
        
        this.database.ref('retur_atm').set(this.dbRetur).then(() => { 
            btnSimpanRetur.innerHTML = btnAsliRetur; btnSimpanRetur.disabled = false; 
            Swal.fire({ title: 'Berhasil!', text: this.editReturId ? "Data Retur berhasil di-Update!" : "Data Retur berhasil di-Save!", icon: 'success', timer: 2000, showConfirmButton: false }); 
            if(this.editReturId) { app.batalRevisiRetur(); } else { app.resetSeluruhFormRetur(); } 
            app.renderDaftarRetur(); 
            app.switchMenuRetur('menu-retur-daftar', document.getElementById('nav-retur-daftar')); 
        }).catch(err => { btnSimpanRetur.innerHTML = btnAsliRetur; btnSimpanRetur.disabled = false; Swal.fire('Gagal!', 'Gagal menyimpan data ke server!', 'error'); }); 
    },
    
    renderDaftarRetur: function() { 
        const tbody = document.getElementById('bodyDaftarRetur'); if(!tbody) return; tbody.innerHTML = ''; 
        const filterTanggal = document.getElementById('filterTanggalRetur').value; const filterWsid = document.getElementById('filterWsidRetur').value.trim().toUpperCase(); 
        let dataTampil = this.dbRetur || []; 
        if (filterTanggal) { dataTampil = dataTampil.filter(item => item.tanggal === filterTanggal); } 
        if (filterWsid) { dataTampil = dataTampil.filter(item => item.wsid.toUpperCase().includes(filterWsid)); } 
        if (dataTampil.length === 0) return tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; color: #64748b;">Belum ada data retur sesuai filter pencarian.</td></tr>'; 
        
        let canEdit = this.cekValidasiAkses('return_edit'); 
        let canDelete = this.cekValidasiAkses('return_hapus'); 
        
        dataTampil.forEach((item, index) => { 
            let aksiHTML = `<button class="btn-info" style="padding: 4px 8px; font-size: 11px; height:auto; width: auto; display:inline-block; margin-bottom:2px;" onclick="app.lihatDetailRetur('${item.id}')">👁️ Lihat</button>`; 
            if (canEdit) {
                aksiHTML += ` <button class="btn-warning" style="padding: 4px 8px; font-size: 11px; height:auto; width: auto; display:inline-block; margin-bottom:2px;" onclick="app.revisiRetur('${item.id}')">✏️ Revisi</button>`; 
            }
            if (canDelete) {
                aksiHTML += ` <button class="btn-danger" style="padding: 4px 8px; font-size: 11px; height:auto; width: auto; display:inline-block;" onclick="app.hapusRetur('${item.id}')">🗑️ Del</button>`;
            } 
            tbody.innerHTML += `<tr style="border-bottom: 1px solid #e2e8f0;"> <td>${index + 1}</td> <td>${item.tanggal}</td> <td><b>${item.noMeja}</b></td> <td>${item.wsid}</td> <td>${item.kasir}</td> <td style="color: #ef4444; font-weight: bold;">${item.jamSelesai}</td> <td style="color: #1e40af; font-weight: bold;">${item.total}</td> <td>${aksiHTML}</td> </tr>`; 
        }); 
    },
    
    hapusRetur: function(id) { 
        if (!app.cekValidasiAkses('return_hapus')) return Swal.fire('Akses Ditolak!', 'Anda tidak memiliki izin menghapus Retur.', 'error'); 
        
        Swal.fire({ title: 'Yakin hapus data Retur?', text: "Data laporan yang dihapus tidak dapat dikembalikan!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus Permanen!' }).then((result) => { 
            if (result.isConfirmed) { 
                this.dbRetur = this.dbRetur.filter(x => x && x.id !== id);
                this.database.ref('retur_atm').set(this.dbRetur).then(() => { 
                    Swal.fire('Terhapus!', 'Data Retur berhasil dihapus.', 'success'); 
                    app.renderDaftarRetur(); 
                }).catch(err => { 
                    Swal.fire('Gagal!', 'Gagal menghapus data di server.', 'error'); 
                }); 
            } 
        }); 
    },
    
    revisiRetur: function(id) { 
        if (!app.cekValidasiAkses('return_edit')) return Swal.fire('Akses ditolak!', 'Anda tidak memiliki akses (Edit) ini.', 'error'); 
        
        const data = this.dbRetur.find(x => x.id === id); if (!data) return; 
        this.editReturId = id; document.getElementById('judulFormInput').innerText = "✏️ Mode Revisi Laporan Retur"; document.getElementById('headerReturnForm').classList.add('edit-mode'); document.getElementById('btnSimpanRetur').innerText = "💾 UPDATE DATA"; document.getElementById('btnBatalRevisiRetur').style.display = "inline-flex"; 
        document.getElementById('returNoMeja').value = data.noMeja; document.getElementById('returNoMeja').readOnly = false; document.getElementById('returWsid').value = data.wsid; document.getElementById('returWsid').readOnly = false; document.getElementById('returBank').value = data.bank || ''; document.getElementById('returLokasi').value = data.lokasi || ''; document.getElementById('returMerkAtm').value = data.merk || ''; document.getElementById('returDenom').value = data.denomStr || ''; document.getElementById('returIdKaryawan').value = data.idKaryawan || ''; document.getElementById('returNamaKaryawan').value = data.kasir || ''; document.getElementById('returTanggal').value = data.tanggal; document.getElementById('returJamMulai').value = data.jamMulai; document.getElementById('returJamSelesai').value = data.jamSelesai; 
        this.renderTabelInputRetur(); 
        const rows = ['c1', 'c2', 'c3', 'c4', 'div', 'pock']; const denoms = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000]; 
        rows.forEach(row => { denoms.forEach(denom => { const inputEl = document.querySelector(`.input-uang[data-denom="${denom}"][data-col="${row}"]`); if(inputEl && data.rincian && data.rincian[row] && data.rincian[row][denom] > 0) inputEl.value = data.rincian[row][denom]; }); }); 
        this.hitungTotalUangRetur(); document.getElementById('areaTabelRetur').style.display = 'block'; this.switchMenuRetur('menu-retur-input', document.getElementById('nav-retur-input')); 
    },
    
    batalRevisiRetur: function() { 
        this.editReturId = null; document.getElementById('judulFormInput').innerText = "📝 Form Input Retur ATM"; document.getElementById('headerReturnForm').classList.remove('edit-mode'); document.getElementById('btnSimpanRetur').innerText = "💾 SAVE DATA"; document.getElementById('btnBatalRevisiRetur').style.display = "none"; document.getElementById('returNoMeja').readOnly = false; document.getElementById('returWsid').readOnly = false; document.getElementById('returNoMeja').value = ''; document.getElementById('returWsid').value = ''; document.getElementById('returLokasi').value = ''; document.getElementById('returBank').value = ''; document.getElementById('returMerkAtm').value = ''; document.getElementById('returDenom').value = ''; document.getElementById('returJamMulai').value = ''; document.getElementById('returJamSelesai').value = ''; document.getElementById('areaTabelRetur').style.display = 'none'; this.renderTabelInputRetur(); this.hitungTotalUangRetur(); 
    },
    
    lihatDetailRetur: function(id) { 
        const data = this.dbRetur.find(x => x.id === id); if (!data) return; 
        document.getElementById('detNoMeja').value = data.noMeja; document.getElementById('detWsid').value = data.wsid; document.getElementById('detBank').value = data.bank || '-'; document.getElementById('detLokasi').value = data.lokasi || '-'; document.getElementById('detMerk').value = data.merk || '-'; document.getElementById('detDenom').value = data.denomStr || '-'; document.getElementById('detIdKaryawan').value = data.idKaryawan || '-'; document.getElementById('detKasir').value = data.kasir; document.getElementById('detTanggal').value = data.tanggal; document.getElementById('detJamMulai').value = data.jamMulai; document.getElementById('detJamSelesai').value = data.jamSelesai; 
        const denoms = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000]; const rowsData = [ { id: 'c1', label: 'C - 1' }, { id: 'c2', label: 'C - 2' }, { id: 'c3', label: 'C - 3' }, { id: 'c4', label: 'C - 4' }, { id: 'div', label: 'DIVERT' }, { id: 'pock', label: 'POCKET' } ]; 
        const tbody = document.getElementById('bodyDetailUang'); tbody.innerHTML = ''; let denomTotalLembar = { 100000: 0, 75000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0 }; 
        rowsData.forEach(row => { 
            let tr = document.createElement('tr'); let htmlInput = `<td style="padding: 8px 12px; font-weight: bold; background: #f8fafc; text-align: left; color: #475569;">${row.label}</td>`; let rowNominal = 0; 
            denoms.forEach(denom => { let lembar = (data.rincian && data.rincian[row.id] && data.rincian[row.id][denom]) ? data.rincian[row.id][denom] : 0; denomTotalLembar[denom] += lembar; rowNominal += (lembar * denom); htmlInput += `<td style="font-weight: 600;">${lembar > 0 ? lembar : '-'}</td>`; }); 
            htmlInput += `<td style="font-weight: bold; color: #1e40af; background: #f1f5f9;">${rowNominal.toLocaleString('id-ID')}</td>`; tr.innerHTML = htmlInput; tbody.appendChild(tr); 
        }); 
        denoms.forEach(denom => { document.getElementById(`det-lembar-${denom}`).innerText = denomTotalLembar[denom].toLocaleString('id-ID'); }); document.getElementById('det-grand-total').innerText = data.total; document.getElementById('modalDetailRetur').style.display = 'flex'; 
    },
    
    simpanJpgRetur: function(btnElement) { 
        if (!app.cekValidasiAkses('return_view')) return Swal.fire('Akses Ditolak!', 'Anda tidak memiliki izin mencetak Laporan Retur.', 'error');

        const elemenTujuan = document.getElementById('areaCetakJPG'); const wsid = document.getElementById('detWsid').value || 'WSID'; const bank = document.getElementById('detBank').value || 'BANK'; const tanggal = document.getElementById('detTanggal').value || 'TGL'; 
        const btn = btnElement || document.getElementById('btnSimpanJpgRetur'); const btnBackup = btn.innerHTML; btn.innerHTML = "⏳ Memproses..."; btn.disabled = true; 
        html2canvas(elemenTujuan, { scale: 2, backgroundColor: "#ffffff", useCORS: true }).then(canvas => { 
            const link = document.createElement('a'); link.download = `Retur_ATM_${wsid}_${bank}_${tanggal}.jpg`; link.href = canvas.toDataURL('image/jpeg', 0.9); link.click(); btn.innerHTML = btnBackup; btn.disabled = false; 
        }).catch(err => { Swal.fire('Error', "Gagal memproses: " + err, 'error'); btn.innerHTML = btnBackup; btn.disabled = false; }); 
    }
};

document.addEventListener('DOMContentLoaded', () => { app.init(); });