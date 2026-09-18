// ==========================================
// FILE: kas/kas.js
// FUNGSI: Logika Buku Kas & Ceklis Iuran (Terintegrasi RBAC Global)
// ==========================================

const currentUser = typeof AuthHelper !== 'undefined' ? AuthHelper.checkAccess() : null;
window.currentRealtimeAkses = null;

const app = {
    dbKaryawan: [], dbAkses: [], dbKasKategori: [], dbKasAturan: [], dbKasTransaksi: [], 
    currentUser: currentUser,

    init: function() {
        if (!this.currentUser) return;
        
        // Memastikan firebase DB dipanggil
        this.database = typeof db !== 'undefined' ? db : (firebase.apps.length ? firebase.database() : null);
        if(!this.database) return alert("Firebase Database Belum Terkoneksi!");

        let todayStr = new Date().toISOString().split('T')[0];
        if(document.getElementById('inTanggal')) document.getElementById('inTanggal').value = todayStr;
        if(document.getElementById('newIurTgl')) document.getElementById('newIurTgl').value = todayStr;
        if(document.getElementById('filterTahunIuran')) document.getElementById('filterTahunIuran').value = new Date().getFullYear();

        this.loadData();
    },

    loadData: function() {
        this.database.ref('hak_akses').on('value', snap => { 
            let d = snap.val(); 
            this.dbAkses = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if (this.currentUser && this.currentUser.idKaryawan) {
                window.currentRealtimeAkses = this.dbAkses.find(a => a && a.idKaryawan === this.currentUser.idKaryawan) || null;
            }
            this.terapkanUIAkses(); 
        });
        
        this.database.ref('karyawan').on('value', snap => {
            let d = snap.val(); this.dbKaryawan = Array.isArray(d) ? d : (d ? Object.values(d) : []);
            if(document.getElementById('master-iuran').classList.contains('active')) this.renderTabelIuran();
        });
        
        this.database.ref('kas_kategori').on('value', snap => { 
            let d = snap.val(); this.dbKasKategori = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.renderDropdownKategoriKas(); this.kalkulasiKeuanganKas(); this.renderMasterKategoriKas(); 
        });

        this.database.ref('kas_aturan').on('value', snap => { 
            let d = snap.val(); this.dbKasAturan = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.renderMasterAturanKas(); 
            if(document.getElementById('master-iuran').classList.contains('active')) this.renderTabelIuran(); 
        });

        this.database.ref('kas_transaksi').on('value', snap => { 
            let d = snap.val(); this.dbKasTransaksi = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.kalkulasiKeuanganKas(); 
            if(document.getElementById('master-iuran').classList.contains('active')) this.renderTabelIuran(); 
        });
    },

    // ==========================================
    // SISTEM AKSES & OTORISASI PIN
    // ==========================================
    cekValidasiAkses: function(kodeAkses) { 
        if (typeof AuthHelper === 'undefined') return false;
        return AuthHelper.cekAkses(kodeAkses, window.currentRealtimeAkses);
    },

    getAksesKatKas: function() { 
        if (!this.currentUser) return []; 
        if (this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN') return this.dbKasKategori.map(k => k.kode); 
        if (window.currentRealtimeAkses && window.currentRealtimeAkses.aksesKategoriKas) return window.currentRealtimeAkses.aksesKategoriKas; 
        return []; 
    },

    otorisasiAksi: function(callback, callbackBatal) {
        if(this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN') return callback();
        let kId = this.currentUser.idKaryawan || this.currentUser.id; 
        let myAkses = window.currentRealtimeAkses;
        if(!myAkses) {
            if (callbackBatal) callbackBatal();
            return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak akses sistem.", "error");
        }

        if(myAkses.tanpaPin === true || String(myAkses.tanpaPin) === 'true') {
            return callback(); // Bypass PIN
        }

        let pinModul = (myAkses.pinMapping && myAkses.pinMapping.kas) ? myAkses.pinMapping.kas : 1;
        
        Swal.fire({
            title: 'Otorisasi PIN (Kas)',
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
            } else if (result.isDismissed && callbackBatal) {
                callbackBatal();
            }
        });
    },

    terapkanUIAkses: function() {
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        
        const toggleMenu = (idHTML, requiredCodes) => { 
            let el = document.getElementById(idHTML); 
            if(el) { 
                let hasAccess = isSuper || requiredCodes.some(code => this.cekValidasiAkses(code));
                el.style.display = hasAccess ? 'block' : 'none'; 
            }
        };

        toggleMenu('nav-kas-buku', ['kas_view', 'kas_input', 'kas_edit']); 
        toggleMenu('nav-kas-ceklis', ['kas_ceklis_view', 'kas_ceklis_input']); 
        toggleMenu('nav-kas-master', ['kas_master']);
        
        let divOperasional = document.getElementById('div-kas-operasional');
        if(divOperasional) {
            let opsAccess = isSuper || this.cekValidasiAkses('kas_view') || this.cekValidasiAkses('kas_edit') || this.cekValidasiAkses('kas_input') || this.cekValidasiAkses('kas_ceklis_view') || this.cekValidasiAkses('kas_ceklis_input');
            divOperasional.style.display = opsAccess ? 'block' : 'none';
        }
        
        let divPengaturan = document.getElementById('div-kas-pengaturan');
        if(divPengaturan) divPengaturan.style.display = (isSuper || this.cekValidasiAkses('kas_master')) ? 'block' : 'none';
        
        if (!isSuper && !this.cekValidasiAkses('kas_view') && !this.cekValidasiAkses('kas_edit') && !this.cekValidasiAkses('kas_ceklis_view') && !this.cekValidasiAkses('kas_input')) {
            Swal.fire("Akses Ditolak!", "Anda tidak memiliki hak akses untuk Modul Buku Kas.", "error").then(() => {
                window.location.href = '../portal/index.html';
            });
            return;
        }

        let btnInput = document.getElementById('btnInputBaru');
        if(btnInput) btnInput.style.display = (isSuper || this.cekValidasiAkses('kas_edit') || this.cekValidasiAkses('kas_input')) ? 'block' : 'none';
    },

    switchTabKas: function(tabId, el) { 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';

        if(tabId === 'buku-kas' && !isSuper && !this.cekValidasiAkses('kas_view') && !this.cekValidasiAkses('kas_edit') && !this.cekValidasiAkses('kas_input')) return Swal.fire("Akses Ditolak!", "Anda tidak memiliki izin membuka Buku Kas.", "error"); 
        if(tabId === 'master-iuran' && !isSuper && !this.cekValidasiAkses('kas_ceklis_view') && !this.cekValidasiAkses('kas_ceklis_input')) return Swal.fire("Akses Ditolak!", "Anda tidak memiliki izin melihat Ceklis Penarikan.", "error"); 
        if(tabId === 'setting-master' && !isSuper && !this.cekValidasiAkses('kas_master')) return Swal.fire("Akses Ditolak!", "Anda tidak punya izin ke Master Kas.", "error"); 
        
        document.querySelectorAll('#kas-module .section').forEach(s => s.classList.remove('active')); 
        document.getElementById(tabId).classList.add('active'); 
        
        if(el) { 
            document.querySelectorAll('#kas-module .nav-link').forEach(l => l.classList.remove('active')); 
            el.classList.add('active'); 
            
            // Ganti Judul Topbar Sesuai Menu yang Aktif
            if(document.getElementById('topbar-title')) {
                document.getElementById('topbar-title').innerText = el.innerText.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu, '').trim().toUpperCase();
            }
        } 
        
        if (tabId === 'master-iuran') this.renderTabelIuran(); 
        else if (tabId === 'buku-kas') { this.kalkulasiKeuanganKas(); this.renderDropdownKategoriKas(); } 
        else if (tabId === 'setting-master') { 
            this.renderMasterKategoriKas(); this.renderMasterAturanKas(); this.renderDropdownKategoriKas(); 
            let canMaster = isSuper || this.cekValidasiAkses('kas_master'); 
            document.querySelectorAll('#setting-master .flex-row').forEach(row => { row.style.display = canMaster ? 'flex' : 'none'; }); 
        } 
        if (window.innerWidth <= 768) { document.querySelector('#kas-module .sidebar').classList.remove('active'); } 
    },

    // ==========================================
    // UTILITY
    // ==========================================
    formatRpKas: function(angka) { 
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka); 
    },

    formatTanggal: function(tglStr) { 
        if (!tglStr) return '-'; 
        const d = new Date(tglStr); 
        if (isNaN(d.getTime())) return tglStr; 
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`; 
    },

    // ==========================================
    // LOGIKA BUKU KAS & REKAP
    // ==========================================
    renderDropdownKategoriKas: function() { 
        let allowedKats = this.getAksesKatKas(); 
        let htmlAllowed = ''; 
        let htmlAll = ''; 
        this.dbKasKategori.forEach(k => { 
            let optionHtml = `<option value="${k.kode}">${k.kode} - ${k.nama}</option>`;
            if(allowedKats.includes(k.kode)) { htmlAllowed += optionHtml; } 
            htmlAll += optionHtml; 
        }); 
        if(document.getElementById('inKode')) document.getElementById('inKode').innerHTML = htmlAllowed; 
        if(document.getElementById('newIurKat')) document.getElementById('newIurKat').innerHTML = htmlAll; 
    },

    kalkulasiKeuanganKas: function() { 
        if(!document.getElementById('buku-kas').classList.contains('active')) return; 
        let allowedKats = this.getAksesKatKas(); let grandIn = 0, grandOut = 0; let rekapKat = {}; 
        
        this.dbKasKategori.forEach(k => { 
            if(allowedKats.includes(k.kode)) rekapKat[k.kode] = { nama: k.nama, pemasukan: 0, pengeluaran: 0 }; 
        }); 
        
        this.dbKasTransaksi.forEach(t => { 
            if(!allowedKats.includes(t.kode)) return; 
            let nom = parseFloat(t.nominal) || 0; 
            if(t.tipe === 'IN') { 
                grandIn += nom; if(rekapKat[t.kode]) rekapKat[t.kode].pemasukan += nom; 
            } else { 
                grandOut += nom; if(rekapKat[t.kode]) rekapKat[t.kode].pengeluaran += nom; 
            } 
        }); 
        
        document.getElementById('statPemasukan').innerText = this.formatRpKas(grandIn); 
        document.getElementById('statPengeluaran').innerText = this.formatRpKas(grandOut); 
        document.getElementById('statSaldo').innerText = this.formatRpKas(grandIn - grandOut); 
        
        let htmlBiru = ''; 
        this.dbKasKategori.forEach(k => { 
            if(!allowedKats.includes(k.kode)) return; 
            let data = rekapKat[k.kode]; let saldo = data.pemasukan - data.pengeluaran; 
            htmlBiru += `<tr><td class="text-center" width="60"><b>${k.kode}</b></td><td>${data.nama}</td><td class="text-right">${this.formatRpKas(data.pemasukan)}</td><td class="text-right">${this.formatRpKas(data.pengeluaran)}</td><td class="text-right"><b>${this.formatRpKas(saldo)}</b></td></tr>`; 
        }); 
        document.getElementById('tbodyKategori').innerHTML = htmlBiru; 
        
        let htmlOrange = ''; 
        let sortedTrx = [...this.dbKasTransaksi].sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal)); 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        let canDeleteKas = isSuper || this.cekValidasiAkses('kas_hapus'); 
        let canEditKas = isSuper || this.cekValidasiAkses('kas_edit');
        let kataKunci = ''; 
        
        if(document.getElementById('cariTrxKas')) { kataKunci = document.getElementById('cariTrxKas').value.trim().toUpperCase(); } 
        if (kataKunci) { 
            sortedTrx = sortedTrx.filter(t => 
                (t.deskripsi && t.deskripsi.toUpperCase().includes(kataKunci)) ||
                (t.tanggal && t.tanggal.includes(kataKunci)) ||
                (t.kode && t.kode.toUpperCase().includes(kataKunci)) ||
                (t.tipe && t.tipe.toUpperCase().includes(kataKunci))
            ); 
        } 
        
        sortedTrx.forEach(t => { 
            if(!allowedKats.includes(t.kode)) return; 
            
            // CEK APAKAH TRANSAKSI DARI CEKLIS (AUTO_)
            let isAutoTrx = t.id && String(t.id).startsWith('AUTO_');
            
            // JIKA DARI CEKLIS, TOMBOL EDIT DIHILANGKAN
            let btnEdit = (canEditKas && !isAutoTrx) ? `<button class="btn-primary" style="padding: 4px 8px; font-size:10px; width:auto; display:inline; margin-right:4px;" onclick='app.bukaEditKas(${JSON.stringify(t)})'>Edit</button>` : ''; 
            
            let btnHapus = canDeleteKas ? `<button class="btn-danger" style="padding: 4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.hapusTransaksiKas('${t.id}')">Del</button>` : ''; 
            let aksiCol = (btnEdit || btnHapus) ? (btnEdit + btnHapus) : '-';

            htmlOrange += `<tr><td class="text-center">${this.formatTanggal(t.tanggal)}</td><td class="text-right">${this.formatRpKas(t.nominal)}</td><td class="text-center"><b>${t.tipe}</b></td><td class="text-center">${t.kode}</td><td>${t.deskripsi}</td><td class="text-center">${aksiCol}</td></tr>`; 
        }); 
        
        if(htmlOrange === '') htmlOrange = `<tr><td colspan="6" class="text-center">Belum ada transaksi sesuai kriteria pencarian / belum ada data</td></tr>`; 
        document.getElementById('tbodyTransaksi').innerHTML = htmlOrange; 
    },

    // ==========================================
    // MODAL & SIMPAN KAS
    // ==========================================
    openModalKas: function() {
        document.getElementById('modalInputKas').style.display = 'block';
        document.getElementById('modalTitleKas').innerText = 'Input Transaksi Baru';
        document.getElementById('inIdTrx').value = '';
        document.getElementById('inNominal').value = '';
        document.getElementById('inDeskripsi').value = '';
        document.getElementById('inTanggal').value = new Date().toISOString().split('T')[0];
    },

    closeModalKas: function() {
        document.getElementById('modalInputKas').style.display = 'none';
    },

    bukaEditKas: function(dataTrx) {
        document.getElementById('modalInputKas').style.display = 'block';
        document.getElementById('modalTitleKas').innerText = 'Edit Transaksi Kas';
        document.getElementById('inIdTrx').value = dataTrx.id;
        document.getElementById('inTanggal').value = dataTrx.tanggal;
        document.getElementById('inNominal').value = dataTrx.nominal;
        document.getElementById('inTipe').value = dataTrx.tipe;
        document.getElementById('inKode').value = dataTrx.kode;
        document.getElementById('inDeskripsi').value = dataTrx.deskripsi;
    },

    prosesSimpanTransaksiDenganOtorisasi: function() {
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        if(!isSuper && !this.cekValidasiAkses('kas_edit') && !this.cekValidasiAkses('kas_input')) {
            return Swal.fire('Akses Ditolak!', 'Anda tidak memiliki izin (Input/Edit Transaksi).', 'error'); 
        }

        this.otorisasiAksi(() => {
            this.simpanTransaksiKas();
        });
    },

    simpanTransaksiKas: function() { 
        const idTrx = document.getElementById('inIdTrx').value;
        const tgl = document.getElementById('inTanggal').value; 
        const nom = document.getElementById('inNominal').value; 
        const tipe = document.getElementById('inTipe').value; 
        const kode = document.getElementById('inKode').value; 
        const desk = document.getElementById('inDeskripsi').value.trim(); 
        
        if(!tgl || !nom || !desk) return Swal.fire('Error!', 'Lengkapi Form Transaksi!', 'error'); 
        if(!this.getAksesKatKas().includes(kode)) return Swal.fire('Akses Ditolak!', 'Anda tidak punya akses ke kategori ini!', 'error'); 
        
        const btn = document.getElementById('btnSimpanKas'); 
        const btnAsli = btn.innerHTML; 
        btn.innerHTML = '⏳ Menyimpan...'; btn.disabled = true; 
        
        const idSimpan = idTrx ? idTrx : 'TRX-' + Date.now(); 
        const dataBaru = { id: idSimpan, tanggal: tgl, nominal: parseFloat(nom), tipe: tipe, kode: kode, deskripsi: desk.toUpperCase() }; 
        
        this.database.ref('kas_transaksi/' + idSimpan).set(dataBaru).then(() => { 
            btn.innerHTML = btnAsli; btn.disabled = false; 
            this.closeModalKas();
            Swal.fire({ title: 'Berhasil!', text: idTrx ? 'Transaksi berhasil diperbarui.' : 'Transaksi Kas berhasil disimpan.', icon: 'success', timer: 1500, showConfirmButton: false }); 
        }).catch(err => { 
            btn.innerHTML = btnAsli; btn.disabled = false; Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan ke server.', 'error'); 
        }); 
    },

    hapusTransaksiKas: function(id) { 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        if(!isSuper && !this.cekValidasiAkses('kas_hapus')) return Swal.fire('Akses Ditolak!', 'Anda tidak memiliki izin untuk menghapus transaksi kas.', 'error'); 
        Swal.fire({ title: 'Hapus transaksi ini?', text: "Data akan hilang dari Buku Kas!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus' }).then((result) => { 
            if (result.isConfirmed) { 
                this.database.ref('kas_transaksi/' + id).remove().then(() => { 
                    Swal.fire('Terhapus!', 'Transaksi berhasil dihapus.', 'success'); 
                }).catch(err => { 
                    Swal.fire('Gagal!', 'Gagal menghapus data di server.', 'error'); 
                }); 
            } 
        }); 
    },

    // ==========================================
    // LOGIKA CEKLIS PENARIKAN (IURAN)
    // ==========================================
    renderTabelIuran: function() { 
        const tahunDipilih = document.getElementById('filterTahunIuran').value; let allowedKats = this.getAksesKatKas(); 
        let aturanTahunIni = this.dbKasAturan.filter(a => a.tanggal.startsWith(tahunDipilih) && allowedKats.includes(a.kodeKat)).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)); 
        
        if(aturanTahunIni.length === 0) { 
            document.getElementById('theadIuran').innerHTML = `<tr><th>Belum ada Jadwal Penarikan di Tahun ${tahunDipilih} untuk kategori Anda.</th></tr>`; 
            document.getElementById('tbodyIuran').innerHTML = ''; return; 
        } 
        
        let thHtml = `<tr><th width="40" class="text-center">NO</th><th style="min-width: 150px;">NAMA KARYAWAN</th>`; 
        aturanTahunIni.forEach(a => { 
            thHtml += `<th class="text-center" style="min-width:100px; background:#f8fafc; border-right:1px solid #cbd5e1;"> <div style="font-size:12px; font-weight:700;">${a.nama}</div> <div style="font-size:10px; color:#64748b; margin-top:3px;">${this.formatTanggal(a.tanggal)}</div> </th>`; 
        }); 
        thHtml += `<th class="text-right" style="background:#e0e7ff;">TOTAL DIBAYAR</th></tr>`; 
        document.getElementById('theadIuran').innerHTML = thHtml; 
        
        let today = new Date(); today.setHours(0,0,0,0); 
        let karyawanFiltered = this.dbKaryawan.filter(k => k !== null && k !== undefined); 
        let karyawanSorted = [...karyawanFiltered].sort((a, b) => { 
            let aDate = a.tglTerminate || a.tglAkhir ? new Date(a.tglTerminate || a.tglAkhir) : new Date(8640000000000000); 
            let bDate = b.tglTerminate || b.tglAkhir ? new Date(b.tglTerminate || b.tglAkhir) : new Date(8640000000000000); 
            let aExpired = aDate < today; let bExpired = bDate < today; 
            if (aExpired && !bExpired) return 1; if (!aExpired && bExpired) return -1; return 0; 
        }); 
        
        let tbHtml = ''; let noUrut = 1; 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        let canCheck = isSuper || this.cekValidasiAkses('kas_ceklis_input') || this.cekValidasiAkses('kas_edit'); 
        
        karyawanSorted.forEach((kar) => { 
            let rowTot = 0; let tds = ''; let isCompletelyHidden = true; let karClass = ''; 
            let namaTampil = `<b>${kar.nama}</b><br><span style="font-size:10px; color:#64748b;">${kar.nik || kar.attendanceId || '-'}</span>`; 
            let karId = kar.uniqueId || kar.idKaryawan; 
            
            aturanTahunIni.forEach(aturan => { 
                let autoId = `AUTO_${karId}_${aturan.id}`; let isPaid = this.dbKasTransaksi.some(trx => trx.id === autoId); 
                let ruleDate = new Date(aturan.tanggal); let expDate = kar.tglTerminate || kar.tglAkhir ? new Date(kar.tglTerminate || kar.tglAkhir) : new Date(8640000000000000); 
                let isExpiredOnRuleDate = expDate < ruleDate; 
                if(isPaid) rowTot += aturan.nominal; 
                
                if (isExpiredOnRuleDate && !isPaid) { 
                    tds += `<td class="text-center" style="border-right:1px solid #cbd5e1; background: #f1f5f9; color: #94a3b8; font-weight:bold;">-</td>`; 
                } else { 
                    isCompletelyHidden = false; let disableCeklis = !canCheck ? "disabled" : ""; 
                    tds += `<td class="text-center" style="border-right:1px solid #cbd5e1;"><input type="checkbox" class="check-iuran" ${isPaid ? 'checked' : ''} ${disableCeklis} onchange="app.toggleIuranKas(this, '${karId}', '${kar.nama}', '${aturan.id}')"></td>`; 
                } 
            }); 
            
            if (isCompletelyHidden) return; 
            
            let currentExpDate = kar.tglTerminate || kar.tglAkhir ? new Date(kar.tglTerminate || kar.tglAkhir) : new Date(8640000000000000); 
            if (currentExpDate < today) { 
                karClass = 'row-expired'; namaTampil = `<b style="text-decoration: line-through;">${kar.nama}</b> <br><span style="font-size:10px; color:#ef4444;">Nonaktif: ${this.formatTanggal(kar.tglTerminate || kar.tglAkhir)}</span>`; 
            } 
            
            tbHtml += `<tr class="${karClass}"><td class="text-center">${noUrut++}</td><td style="text-align:left;">${namaTampil}</td>${tds}<td class="text-right" style="background:#e0e7ff; color:#334155;"><b>${this.formatRpKas(rowTot)}</b></td></tr>`; 
        }); 
        
        if(tbHtml === '') tbHtml = `<tr><td colspan="${aturanTahunIni.length + 3}" class="text-center">Tidak ada karyawan yang relevan.</td></tr>`; 
        document.getElementById('tbodyIuran').innerHTML = tbHtml; 
    },

    toggleIuranKas: function(checkbox, karId, karNama, aturanId) { 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        if(!isSuper && !this.cekValidasiAkses('kas_edit') && !this.cekValidasiAkses('kas_ceklis_input')) { 
            checkbox.checked = !checkbox.checked; 
            return Swal.fire('Akses Ditolak!', 'Anda hanya memiliki izin melihat, tidak diizinkan mengubah iuran.', 'error'); 
        } 

        let autoId = `AUTO_${karId}_${aturanId}`; 
        let aturan = this.dbKasAturan.find(a => a.id === aturanId); 
        
        if(checkbox.checked) { 
            const dataMasuk = { id: autoId, tanggal: aturan.tanggal, nominal: aturan.nominal, tipe: 'IN', kode: aturan.kodeKat, deskripsi: `${karNama} (${aturan.nama})` }; 
            this.database.ref('kas_transaksi/' + autoId).set(dataMasuk);
        } else { 
            this.database.ref('kas_transaksi/' + autoId).remove();
        } 
    },

    // ==========================================
    // LOGIKA MASTER KATEGORI & JADWAL
    // ==========================================
    tambahKategoriKas: function() { 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        if(!isSuper && !this.cekValidasiAkses('kas_master')) return Swal.fire("Akses Ditolak!", "Anda tidak memiliki izin mengubah Master Kategori.", "error"); 
        let kode = document.getElementById('newKatKode').value.trim().toUpperCase(); let nama = document.getElementById('newKatNama').value.trim().toUpperCase(); 
        if(!kode || !nama) return Swal.fire("Error", "Kode dan Nama Kategori wajib diisi!", "error"); 
        if(this.dbKasKategori.some(k => k.kode === kode)) return Swal.fire("Error", "Kode Kategori sudah digunakan!", "error"); 
        this.dbKasKategori.push({ kode, nama }); 
        this.database.ref('kas_kategori').set(this.dbKasKategori).then(() => { document.getElementById('newKatKode').value = ''; document.getElementById('newKatNama').value = ''; Swal.fire("Berhasil", "Kategori Kas Berhasil Ditambahkan", "success"); }); 
    },

    hapusKategoriKas: function(kode) { 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        if(!isSuper && !this.cekValidasiAkses('kas_master')) return Swal.fire("Akses Ditolak!", "Anda tidak punya izin.", "error"); 
        Swal.fire({ title: 'Hapus kategori ini?', text: "Menghapus kategori bisa berdampak pada riwayat kas.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus' }).then((result) => { 
            if(result.isConfirmed) { this.dbKasKategori = this.dbKasKategori.filter(k => k.kode !== kode); this.database.ref('kas_kategori').set(this.dbKasKategori).then(() => { Swal.fire("Terhapus", "Kategori Kas Berhasil Dihapus", "success"); }); } 
        }); 
    },

    renderMasterKategoriKas: function() { 
        let html = ''; 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        let canEditMaster = isSuper || this.cekValidasiAkses('kas_master'); 
        this.dbKasKategori.forEach(k => { 
            let btnHapus = canEditMaster ? `<button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.hapusKategoriKas('${k.kode}')">Del</button>` : '-'; 
            html += `<tr><td class="text-center"><b>${k.kode}</b></td><td style="text-align:left;">${k.nama}</td><td class="text-center">${btnHapus}</td></tr>`; 
        }); 
        if(document.getElementById('tbodyMasterKategori')) document.getElementById('tbodyMasterKategori').innerHTML = html; 
    },

    tambahAturanIuran: function() { 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        if(!isSuper && !this.cekValidasiAkses('kas_master')) return Swal.fire("Akses Ditolak!", "Anda tidak memiliki izin mengubah Master Aturan Iuran.", "error"); 
        let nama = document.getElementById('newIurNama').value.trim().toUpperCase(); let nom = parseFloat(document.getElementById('newIurNominal').value); let tgl = document.getElementById('newIurTgl').value; let kat = document.getElementById('newIurKat').value; 
        if(!nama || !nom || !tgl || !kat) return Swal.fire("Error", "Lengkapi form aturan penarikan!", "error"); 
        this.dbKasAturan.push({ id: 'IUR-' + Date.now(), nama: nama, nominal: nom, tanggal: tgl, kodeKat: kat }); 
        this.database.ref('kas_aturan').set(this.dbKasAturan).then(() => { document.getElementById('newIurNama').value = ''; document.getElementById('newIurNominal').value = ''; Swal.fire("Berhasil", "Aturan Iuran Berhasil Ditambahkan", "success"); }); 
    },

    hapusAturanIuran: function(id) { 
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        if(!isSuper && !this.cekValidasiAkses('kas_master')) return Swal.fire("Akses Ditolak!", "Anda tidak punya izin.", "error"); 
        Swal.fire({ title: 'Hapus jadwal penarikan ini?', text: "(Transaksi yang sudah masuk TIDAK terhapus otomatis)", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus' }).then((result) => { 
            if(result.isConfirmed) { this.dbKasAturan = this.dbKasAturan.filter(a => a.id !== id); this.database.ref('kas_aturan').set(this.dbKasAturan).then(() => { Swal.fire("Terhapus", "Jadwal Penarikan Berhasil Dihapus", "success"); }); } 
        }); 
    },

    renderMasterAturanKas: function() { 
        let allowedKats = this.getAksesKatKas(); let html = ''; 
        let sortedAturan = [...this.dbKasAturan].filter(a => allowedKats.includes(a.kodeKat)).sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal)); 
        
        let isSuper = this.currentUser.role === 'SUPERADMIN' || this.currentUser.role === 'SUPER_ADMIN';
        let canEditMaster = isSuper || this.cekValidasiAkses('kas_master'); 
        
        sortedAturan.forEach(a => { 
            let kat = this.dbKasKategori.find(k => k.kode === a.kodeKat); let namaKat = kat ? kat.nama : a.kodeKat; 
            let btnHapus = canEditMaster ? `<button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.hapusAturanIuran('${a.id}')">Del</button>` : '-'; 
            html += `<tr><td style="text-align:left;"><b>${a.nama}</b></td><td class="text-right">${this.formatRpKas(a.nominal)}</td><td class="text-center">${this.formatTanggal(a.tanggal)}</td><td><span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:10px;">${a.kodeKat} - ${namaKat}</span></td><td class="text-center">${btnHapus}</td></tr>`; 
        }); 
        if(sortedAturan.length === 0) html = `<tr><td colspan="5" class="text-center">Belum ada aturan jadwal penarikan untuk kategori Anda</td></tr>`; 
        if(document.getElementById('tbodyMasterIuran')) document.getElementById('tbodyMasterIuran').innerHTML = html; 
    }
};

document.addEventListener('DOMContentLoaded', () => { app.init(); });