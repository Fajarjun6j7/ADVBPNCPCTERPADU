// ==========================================
// FILE: roster/roster.js
// FUNGSI: Logika Khusus Modul Roster & Cuti (Terintegrasi RBAC Global)
// ==========================================

const currentUser = typeof AuthHelper !== 'undefined' ? AuthHelper.checkAccess() : null;
window.currentRealtimeAkses = null;

const app = {
    dbKaryawan: [], dbShift: [], dbRoster: [], dbCutiBulanan: [], dbAkses: [],
    currentRosterTipe: 'all', rosterSedangDiedit: null, sortableInstance: null,
    rosterViewMode: 'app', showEkstraHari: true,
    
    hariLiburNasional: { "2026-01-01": "Tahun Baru Masehi", "2026-02-17": "Isra Mikraj", "2026-03-03": "Hari Suci Nyepi", "2026-03-20": "Wafat Isa", "2026-04-23": "Cuti Bersama", "2026-04-24": "Idul Fitri", "2026-04-25": "Idul Fitri", "2026-05-01": "Hari Buruh", "2026-05-14": "Kenaikan Isa", "2026-06-01": "Pancasila", "2026-08-17": "Kemerdekaan RI", "2026-12-25": "Natal" },

    init: function() {
        if (!currentUser) return;
        this.database = typeof db !== 'undefined' ? db : (firebase.apps.length ? firebase.database() : null);
        if(!this.database) return alert("Database gagal dimuat!");
        
        let now = new Date(); 
        document.getElementById('filterCutiBulan').value = now.getMonth() + 1; 
        document.getElementById('filterCutiTahun').value = now.getFullYear();
        document.getElementById('rosterBulan').value = now.getMonth() + 1; 
        document.getElementById('rosterTahun').value = now.getFullYear();

        this.loadData();
    },

    loadData: function() {
        this.database.ref('hak_akses').on('value', snap => {
            let d = snap.val(); 
            this.dbAkses = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if (currentUser && currentUser.idKaryawan) {
                window.currentRealtimeAkses = this.dbAkses.find(a => a && a.idKaryawan === currentUser.idKaryawan) || null;
            }
            this.terapkanUIAkses(); 
        });
        this.database.ref('karyawan').on('value', snap => {
            let d = snap.val(); this.dbKaryawan = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if(document.getElementById('menu-input-roster').classList.contains('active') && this.rosterSedangDiedit) this.loadTabelRoster();
        });
        this.database.ref('shift').on('value', snap => {
            let d = snap.val(); this.dbShift = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if(document.getElementById('menu-input-roster').classList.contains('active') && this.rosterSedangDiedit) this.loadTabelRoster();
        });
        this.database.ref('roster').on('value', snap => {
            let d = snap.val(); this.dbRoster = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if(document.getElementById('menu-daftar-roster').classList.contains('active')) this.renderDaftarRoster();
        });
        this.database.ref('pengajuan_cuti').on('value', snap => {
            let d = snap.val(); this.dbCutiBulanan = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            if(document.getElementById('menu-pengajuan-cuti').classList.contains('active')) this.renderTabelPengajuanCuti();
        });
    },

    // ==========================================
    // SISTEM KEAMANAN & AKSES (RBAC & PIN)
    // ==========================================
    cekValidasiAkses: function(kodeAkses) { 
        if (typeof AuthHelper === 'undefined') return false;
        return AuthHelper.cekAkses(kodeAkses, window.currentRealtimeAkses);
    },
    
    isLeader: function(jabatan) { 
        let j = (jabatan || "").toLowerCase(); 
        return j.includes('team leader') || j.includes('pic') || j.includes('tl') || j.includes('leader'); 
    },

    terapkanUIAkses: function() {
        let canView = this.cekValidasiAkses('roster_view') || this.cekValidasiAkses('roster_umum') || this.cekValidasiAkses('roster_pic') || this.cekValidasiAkses('roster_edit') || this.cekValidasiAkses('roster_cuti');
        let canEdit = this.cekValidasiAkses('roster_edit') || this.cekValidasiAkses('roster_input');
        let canViewUmum = this.cekValidasiAkses('roster_view') || this.cekValidasiAkses('roster_umum');
        let canViewPic = this.cekValidasiAkses('roster_view') || this.cekValidasiAkses('roster_pic');
        let canViewCuti = this.cekValidasiAkses('roster_cuti');

        if (!canView) {
            Swal.fire("Akses Ditolak!", "Anda tidak memiliki hak akses untuk Modul Roster.", "error").then(() => {
                window.location.href = '../portal/index.html';
            });
            return;
        }

        const toggleMenu = (idHTML, punyaHak) => { 
            let el = document.getElementById(idHTML); 
            if(el) el.style.display = punyaHak ? 'block' : 'none'; 
        };

        toggleMenu('nav-roster-cuti', canViewCuti); 
        toggleMenu('nav-roster-global-input', canEdit); 
        toggleMenu('nav-roster-global-daftar', canView); 
        toggleMenu('nav-roster-umum', canViewUmum); 
        toggleMenu('nav-roster-pic', canViewPic);

        let divOpr = document.getElementById('div-roster-operasional');
        if(divOpr) divOpr.style.display = canViewCuti ? 'block' : 'none';
        
        let divGlobal = document.getElementById('div-roster-global');
        if(divGlobal) divGlobal.style.display = (canEdit || canView) ? 'block' : 'none';
        
        let divKar = document.getElementById('div-roster-karyawan');
        if(divKar) divKar.style.display = (canViewUmum || canViewPic) ? 'block' : 'none';

        if (!canEdit) {
            let btnSave = document.getElementById('btnSaveRoster');
            let btnUpload = document.getElementById('btnUploadRosterWrapper');
            if(btnSave) btnSave.style.display = 'none';
            if(btnUpload) btnUpload.style.display = 'none';
        }

        if(!canEdit && document.getElementById('menu-input-roster').classList.contains('active')) {
            this.switchMenuRoster('menu-daftar-roster');
        }
        
        if (!canEdit && !canViewCuti && document.getElementById('menu-pengajuan-cuti').classList.contains('active')) {
            if (canViewUmum) this.bukaDaftarRoster('karyawan', document.getElementById('nav-roster-umum'));
            else if (canViewPic) this.aksesDaftarManajemen(document.getElementById('nav-roster-pic'));
            else this.switchMenuRoster('menu-daftar-roster');
        }
    },

    otorisasiAksi: function(callback) {
        if (!currentUser) return;
        if(currentUser.role === 'SUPERADMIN' || currentUser.role === 'SUPER_ADMIN') return callback();
        let myAkses = window.currentRealtimeAkses;
        if(!myAkses) return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak akses sistem.", "error");

        if(myAkses.tanpaPin === true || String(myAkses.tanpaPin) === 'true') {
            return callback(); 
        }

        let pinModul = (myAkses.pinMapping && myAkses.pinMapping.roster) ? myAkses.pinMapping.roster : 1;
        
        Swal.fire({
            title: 'Otorisasi PIN (Roster)',
            text: `Masukkan PIN ${pinModul} Anda untuk melanjutkan`,
            input: 'password',
            inputAttributes: { autocapitalize: 'off', placeholder: 'Ketik PIN...' },
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Verifikasi',
            showLoaderOnConfirm: true,
            preConfirm: (loginPin) => {
                return new Promise((resolve) => {
                    let myData = this.dbKaryawan.find(k => k && (k.uniqueId === currentUser.idKaryawan || k.idKaryawan === currentUser.idKaryawan));
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
    // NAVIGASI & WORKSPACE MODE (FULLSCREEN)
    // ==========================================
    toggleFullscreen: function(isFull) {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const formBuat = document.getElementById('form-buat-roster');
        const topbarContainer = document.getElementById('topbar-container');
        
        if (isFull) {
            if(sidebar) sidebar.style.display = 'none';
            if(formBuat) formBuat.style.display = 'none';
            if(topbarContainer) topbarContainer.style.display = 'none';
            if(mainContent) {
                mainContent.style.marginLeft = '0';
                mainContent.style.width = '100%';
                mainContent.style.padding = '0';
            }
            document.getElementById('areaTabelRoster').style.display = 'block';
            
            const blnList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const bln = parseInt(document.getElementById('rosterBulan').value);
            const thn = document.getElementById('rosterTahun').value;
            let modeText = (this.cekValidasiAkses('roster_edit') || this.cekValidasiAkses('roster_input')) ? "Mode Edit" : "Mode Lihat";
            document.getElementById('fs-title').innerText = `📝 WORKSPACE ROSTER - ${blnList[bln-1]} ${thn} (${modeText})`;
        } else {
            if(sidebar) sidebar.style.display = 'flex';
            if(formBuat) formBuat.style.display = 'block';
            if(topbarContainer) topbarContainer.style.display = 'flex';
            if(mainContent) {
                mainContent.style.marginLeft = window.innerWidth > 768 ? '220px' : '0';
                mainContent.style.width = window.innerWidth > 768 ? 'calc(100% - 220px)' : '100%';
                mainContent.style.padding = '20px';
            }
            document.getElementById('areaTabelRoster').style.display = 'none';
            
            if(this.rosterSedangDiedit) {
                this.rosterSedangDiedit = null; // Bersihkan state edit/view
                this.switchMenuRoster('menu-daftar-roster');
            } else {
                this.switchMenuRoster('menu-input-roster');
            }
        }
    },

    toggleEkstraHari: function() {
        this.showEkstraHari = !this.showEkstraHari;
        const btn = document.getElementById('btnToggleEkstra');
        const styleId = 'ekstra-hari-style';
        let styleEl = document.getElementById(styleId);
        
        if (!this.showEkstraHari) {
            btn.innerHTML = "👁️ Tampilkan Ekstra";
            btn.classList.replace('btn-warning', 'btn-info');
            btn.style.backgroundColor = '#0ea5e9';
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.innerHTML = `.col-ekstra { display: none !important; }`;
        } else {
            btn.innerHTML = "👁️ Sembunyikan Ekstra";
            btn.classList.replace('btn-info', 'btn-warning');
            btn.style.backgroundColor = '#f59e0b';
            if (styleEl) styleEl.innerHTML = '';
        }
    },

    ubahViewMode: function(mode) {
        this.rosterViewMode = mode;
        const btnApp = document.getElementById('btnViewApp');
        const btnExcel = document.getElementById('btnViewExcel');
        if(btnApp && btnExcel) {
            btnApp.style.backgroundColor = mode === 'app' ? '#0ea5e9' : '#64748b';
            btnExcel.style.backgroundColor = mode === 'excel' ? '#0ea5e9' : '#64748b';
        }
        
        if (document.getElementById('areaTabelRoster').style.display === 'block') {
            const shiftMap = new Map();
            this.dbShift.forEach(sh => {
                if(sh) shiftMap.set(sh.kode, (mode === 'excel' && sh.kodeExcel) ? sh.kodeExcel : sh.kode);
            });

            const selects = document.querySelectorAll('#bodyRoster .shift-select');
            selects.forEach(sel => {
                for (let i = 0; i < sel.options.length; i++) {
                    let opt = sel.options[i];
                    if (opt.value && shiftMap.has(opt.value)) {
                        opt.text = shiftMap.get(opt.value);
                    }
                }
            });
        }
    },
    
    switchMenuRoster: function(menuId, el) { 
        let isSuper = currentUser.role === 'SUPERADMIN' || currentUser.role === 'SUPER_ADMIN';

        if(menuId === 'menu-input-roster') {
            let canEdit = isSuper || this.cekValidasiAkses('roster_edit') || this.cekValidasiAkses('roster_input');
            let canView = isSuper || this.cekValidasiAkses('roster_view') || this.cekValidasiAkses('roster_umum') || this.cekValidasiAkses('roster_pic');
            
            if (!canEdit && !canView) {
                Swal.fire("Akses Ditolak", "Anda tidak memiliki hak akses.", "error"); 
                return false;
            }
            
            // JIKA HANYA VIEW: Cegah jika mencoba membuat roster baru (rosterSedangDiedit kosong)
            if (!canEdit && !this.rosterSedangDiedit) {
                Swal.fire("Akses Ditolak", "Anda tidak memiliki izin membuat Roster Baru.", "error"); 
                return false;
            }
        }
        
        if(menuId === 'menu-daftar-roster' && !this.cekValidasiAkses('roster_view') && !this.cekValidasiAkses('roster_edit') && !this.cekValidasiAkses('roster_umum') && !this.cekValidasiAkses('roster_pic') && !isSuper) {
            Swal.fire("Akses Ditolak", "Anda tidak memiliki izin melihat daftar roster.", "error"); 
            return false;
        }
        if(menuId === 'menu-pengajuan-cuti' && !this.cekValidasiAkses('roster_cuti') && !isSuper) {
            Swal.fire("Akses Ditolak", "Anda tidak memiliki izin Approval Cuti.", "error"); 
            return false;
        }
        
        document.querySelectorAll('#roster-module .section').forEach(s => s.classList.remove('active')); 
        document.getElementById(menuId).classList.add('active'); 
        
        if(el) { 
            document.querySelectorAll('#roster-module .nav-link').forEach(n => n.classList.remove('active')); 
            el.classList.add('active'); 
            
            // Update Teks Judul Topbar
            if(document.getElementById('topbar-title')) {
                document.getElementById('topbar-title').innerText = el.innerText.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu, '').trim().toUpperCase();
            }
        } 
        
        if (menuId === 'menu-daftar-roster') this.renderDaftarRoster(); 
        if (menuId === 'menu-input-roster' && !this.rosterSedangDiedit) { 
            document.getElementById('rosterBulan').disabled = false; document.getElementById('rosterTahun').disabled = false; 
            document.getElementById('rosterEkstraHari').disabled = false; document.getElementById('rosterEkstraHari').value = 0;
            document.getElementById('rosterEkstraHariSebelum').disabled = false; document.getElementById('rosterEkstraHariSebelum').value = 0;
            document.getElementById('containerBtnBuatTabel').style.display = 'block'; 
            document.getElementById('judul-form-roster').innerText = "✏️ Form Set-Up Roster"; 
        } 
        if (menuId === 'menu-pengajuan-cuti') this.renderTabelPengajuanCuti(); 
        if (window.innerWidth <= 768) { document.querySelector('.sidebar').classList.remove('active'); } 
        
        return true;
    },

    bukaInputRoster: function(tipe, el) { 
        this.currentRosterTipe = tipe; 
        this.rosterSedangDiedit = null; 
        this.switchMenuRoster('menu-input-roster', el); 
    },

    bukaDaftarRoster: function(tipe, el) { 
        this.currentRosterTipe = tipe; 
        this.switchMenuRoster('menu-daftar-roster', el); 
    },

    aksesDaftarManajemen: function(el) { 
        let isSuper = currentUser.role === 'SUPERADMIN' || currentUser.role === 'SUPER_ADMIN';
        if(!isSuper && !this.cekValidasiAkses('roster_view') && !this.cekValidasiAkses('roster_edit') && !this.cekValidasiAkses('roster_pic')) {
            return Swal.fire("Akses Ditolak", "Hak akses melihat Roster Leader ditolak.", "error"); 
        }
        this.currentRosterTipe = 'manajemen'; 
        this.switchMenuRoster('menu-daftar-roster', el); 
    },

    // ==========================================
    // LOGIKA RENDER & INPUT ROSTER
    // ==========================================
    loadTabelRoster: function() { 
        const b = parseInt(document.getElementById('rosterBulan').value); 
        const t = parseInt(document.getElementById('rosterTahun').value); 
        let eH_sebelum = parseInt(document.getElementById('rosterEkstraHariSebelum').value) || 0;
        if(!b || !t) return Swal.fire("Oops", "Pilih bulan/tahun", "warning"); 
        
        if (eH_sebelum > 0) {
            let prevB = b - 1; let prevT = t;
            if (prevB < 1) { prevB = 12; prevT -= 1; }
            let prevRId = `${prevT}-${prevB}`;
            let prevRoster = this.dbRoster.find(x => x && String(x.id) === String(prevRId));
            
            if (!prevRoster) {
                Swal.fire("Info Sistem", `Roster bulan sebelumnya (${prevB}/${prevT}) belum dibuat!\nFitur memunculkan tanggal sebelumnya dibatalkan otomatis.`, "info");
                document.getElementById('rosterEkstraHariSebelum').value = 0;
                eH_sebelum = 0;
            }
        }

        const rId = `${t}-${b}`; 
        let dTersimpan = this.dbRoster.find(x => x && String(x.id) === String(rId)); 
        
        // Pengecekan sebelum masuk tabel (Hanya view atau boleh buat baru?)
        let isSuper = currentUser.role === 'SUPERADMIN' || currentUser.role === 'SUPER_ADMIN';
        let canEdit = isSuper || this.cekValidasiAkses('roster_edit') || this.cekValidasiAkses('roster_input');
        
        if (!dTersimpan && !canEdit) {
            return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin membuat Roster baru.", "error");
        }
        
        this.rosterSedangDiedit = dTersimpan ? dTersimpan.id : rId; 
        
        if (!this.showEkstraHari) this.toggleEkstraHari();

        this.buildTabelRoster(dTersimpan); 
        this.toggleFullscreen(true);
    },

    buildTabelRoster: function(dataTersimpan = null) { 
        try { 
            if (this.dbKaryawan.length === 0) return Swal.fire("Error", "Karyawan kosong! Data Pusat belum diisi.", "error"); 
            const b = parseInt(document.getElementById('rosterBulan').value); 
            const t = parseInt(document.getElementById('rosterTahun').value); 
            const eH_sebelum = parseInt(document.getElementById('rosterEkstraHariSebelum').value) || 0;
            const ekstraHari = parseInt(document.getElementById('rosterEkstraHari').value) || 0;
            
            if(!b || !t) return; 
            const jmlHari = new Date(t, b, 0).getDate(); 
            const rosterStartDate = new Date(t, b - 1, 1);
            
            let prevB = b - 1; let prevT = t; 
            if (prevB < 1) { prevB = 12; prevT -= 1; }
            let jmlHariPrev = new Date(prevT, prevB, 0).getDate();
            let prevRId = `${prevT}-${prevB}`;
            let prevRoster = this.dbRoster.find(x => x && String(x.id) === String(prevRId));
            let prevKsArray = (prevRoster && prevRoster.karyawanShift) ? (Array.isArray(prevRoster.karyawanShift) ? prevRoster.karyawanShift : Object.values(prevRoster.karyawanShift)) : [];

            // UI Access Control - Mengunci tabel jika user hanya VIEW
            let isGlobalEditor = this.cekValidasiAkses('roster_edit') || this.cekValidasiAkses('roster_input') || currentUser.role === 'SUPER_ADMIN'; 
            let baseDisAttr = !isGlobalEditor ? 'disabled' : ''; 
            
            let btnSave = document.getElementById('btnSaveRoster');
            let btnUpload = document.getElementById('btnUploadRosterWrapper');
            if(btnSave) btnSave.style.display = isGlobalEditor ? 'inline-block' : 'none';
            if(btnUpload) btnUpload.style.display = isGlobalEditor ? 'inline-block' : 'none';

            const headerRow = document.getElementById('headerRoster'); 
            const tbody = document.getElementById('bodyRoster'); 
            if (this.sortableInstance) { this.sortableInstance.destroy(); this.sortableInstance = null; } 
            
            const namaHariList = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]; 
            const namaBulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; 
            
            let headerHtml = `<th>NO</th><th class="sticky-col-nama">NAMA</th><th>JABATAN</th>`; 
            let htmlListLibur = ""; let adaLiburNasional = false; 
            
            for (let i = 1 - eH_sebelum; i <= jmlHari + ekstraHari; i++) { 
                let curB = b; let curT = t; let tgl = i;
                
                if (i < 1) {
                    tgl = jmlHariPrev + i; curB = prevB; curT = prevT;
                } else if (i > jmlHari) { 
                    tgl = i - jmlHari; curB += 1; if(curB > 12) { curB = 1; curT += 1; } 
                }
                
                let tglDate = new Date(curT, curB - 1, tgl); let hariIndex = tglDate.getDay(); let nHari = namaHariList[hariIndex]; 
                let nmBulan = namaBulanList[curB - 1];
                let tglFormat = `${curT}-${String(curB).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`; 
                let isLiburNasional = this.hariLiburNasional[tglFormat]; 
                
                let isEkstra = (i < 1 || i > jmlHari);
                let headerClass = isEkstra ? "col-ekstra " : ""; 
                
                if(isLiburNasional) { headerClass += "header-libur "; adaLiburNasional = true; htmlListLibur += `<li>${isLiburNasional} (Tanggal ${tgl} ${nmBulan} ${curT})</li>`; } 
                else if(hariIndex === 0) { headerClass += "header-minggu "; } 
                if (i < 1) { headerClass += "header-prev "; } 
                
                let labelKolom = isEkstra ? `${tgl}<br><span style="font-size:9px;">${nmBulan.substring(0,3)}</span>` : tgl;
                headerHtml += `<th class="${headerClass.trim()}">${labelKolom}<br><span style="font-size:9px; font-weight:normal;">${nHari}</span></th>`; 
            } 
            headerRow.innerHTML = headerHtml; 
            
            const wadahLibur = document.getElementById('keteranganLiburNasional'); const ulLibur = document.getElementById('listLiburNasional'); 
            if(adaLiburNasional) { ulLibur.innerHTML = htmlListLibur; wadahLibur.style.display = 'block'; } else { wadahLibur.style.display = 'none'; ulLibur.innerHTML = ""; } 
            
            let filtered = this.dbKaryawan.filter(k => {
                if(!k) return false;
                let tglAkhir = k.tglAkhir ? new Date(k.tglAkhir) : null;
                let tglTerm = k.tglTerminate ? new Date(k.tglTerminate) : null;
                let isInactive = false;
                if (tglTerm && tglTerm < rosterStartDate) isInactive = true;
                else if (tglAkhir && tglAkhir < rosterStartDate) isInactive = true;
                
                if (isInactive) { if (k.idBaru && k.tglMulaiBaru) return true; return false; }
                return true; 
            }); 
            
            if (this.currentRosterTipe === 'karyawan') { filtered = filtered.filter(k => !this.isLeader(k.jabatan)); } 
            else if (this.currentRosterTipe === 'manajemen') { filtered = filtered.filter(k => this.isLeader(k.jabatan)); } 
            
            let ksArray = []; if (dataTersimpan && dataTersimpan.karyawanShift) ksArray = Array.isArray(dataTersimpan.karyawanShift) ? dataTersimpan.karyawanShift : Object.values(dataTersimpan.karyawanShift); 
            let urutan = []; 
            if (ksArray.length > 0) { 
                ksArray.forEach(ks => { if(!ks) return; let f = filtered.find(k => k.uniqueId === ks.id || k.idKaryawan === ks.id); if(f) urutan.push(f); }); 
                filtered.forEach(k => { if(!urutan.find(u => u.uniqueId === k.uniqueId)) urutan.push(k); }); 
            } else urutan = [...filtered]; 
            
            const shiftMap = new Map(); this.dbShift.forEach(sh => { if(sh) shiftMap.set(sh.kode, { bg: sh.warnaBg, text: sh.warnaTeks }); }); 
            
            const fragment = document.createDocumentFragment(); 
            urutan.forEach((k, indexRow) => { 
                let kId = k.uniqueId || k.idKaryawan; let tr = document.createElement('tr'); tr.dataset.kId = kId; 
                let iconDrag = isGlobalEditor ? `<span class="drag-handle" title="Tarik untuk memindah urutan">☰</span>` : ''; 
                
                let displayNama = k.idBaru ? `${k.nama} <span style="color:#ef4444; font-size:9px;">(Pembaruan)</span>` : k.nama;
                let html = `<td>${indexRow + 1}</td><td class="sticky-col-nama">${iconDrag} <b>${displayNama}</b></td><td style="font-size:11px;">${k.jabatan || "-"}</td>`; 
                
                let sData = []; let sTersimpan = ksArray.find(s => s && s.id === kId); 
                if (sTersimpan && sTersimpan.shifts) sData = Array.isArray(sTersimpan.shifts) ? sTersimpan.shifts : Object.values(sTersimpan.shifts); 
                let skip = 0; 
                
                for (let i = 1 - eH_sebelum; i <= jmlHari + ekstraHari; i++) { 
                    if (skip > 0) { skip--; continue; } 
                    
                    let curB = b; let curT = t; let tgl = i;
                    let isPrev = (i < 1);
                    let isEkstra = (i < 1 || i > jmlHari);
                    let extClass = isEkstra ? 'col-ekstra ' : '';
                    
                    if (isPrev) {
                        tgl = jmlHariPrev + i; curB = prevB; curT = prevT;
                    } else if (i > jmlHari) { 
                        tgl = i - jmlHari; curB += 1; if(curB > 12) { curB = 1; curT += 1; } 
                    }
                    
                    let curDateObj = new Date(curT, curB - 1, tgl);
                    let val = "";
                    
                    if (isPrev) {
                        let pData = []; let pTersimpan = prevKsArray.find(s => s && s.id === kId);
                        if (pTersimpan && pTersimpan.shifts) pData = Array.isArray(pTersimpan.shifts) ? pTersimpan.shifts : Object.values(pTersimpan.shifts);
                        val = pData[tgl - 1] || "";
                    } else {
                        val = sData[i - 1] || ""; 
                    }
                    
                    let overrideStatus = "";
                    let tTerm = k.tglTerminate ? new Date(k.tglTerminate) : null;
                    let tAkhir = k.tglAkhir ? new Date(k.tglAkhir) : null;
                    let tMulaiBaru = k.tglMulaiBaru ? new Date(k.tglMulaiBaru) : null;
                    
                    if (tTerm && curDateObj > tTerm) { overrideStatus = k.jenisNonAktif || "TERMINATE"; } 
                    else if (!tMulaiBaru && tAkhir && curDateObj > tAkhir) { overrideStatus = k.jenisNonAktif || "HABIS KONTRAK"; } 
                    else if (tMulaiBaru && curDateObj < tMulaiBaru) { overrideStatus = k.jenisNonAktif || "NON-AKTIF"; }
                    
                    if (overrideStatus) val = overrideStatus;
                    let isBerhenti = ['Habis Kontrak', 'Resign', 'C5', 'HABIS KONTRAK', 'RESIGN', 'TERMINATE', 'NON-AKTIF'].includes(val);

                    if (isBerhenti) { 
                        let span = 1; 
                        for (let j = i + 1; j <= jmlHari + ekstraHari; j++) { 
                            let nextB = b; let nextT = t; let nextTgl = j;
                            if (j < 1) { nextTgl = jmlHariPrev + j; nextB = prevB; nextT = prevT; }
                            else if (j > jmlHari) { nextTgl = j - jmlHari; nextB += 1; if(nextB > 12) { nextB = 1; nextT += 1; } }
                            let nextDateObj = new Date(nextT, nextB - 1, nextTgl);
                            
                            let nextVal = "";
                            if (j < 1) {
                                let pTersimpan = prevKsArray.find(s => s && s.id === kId);
                                nextVal = pTersimpan && pTersimpan.shifts ? pTersimpan.shifts[jmlHariPrev + j - 1] : "";
                            } else { nextVal = sData[j - 1] || ""; }
                            
                            let nextOverride = "";
                            if (tTerm && nextDateObj > tTerm) nextOverride = k.jenisNonAktif || "TERMINATE";
                            else if (!tMulaiBaru && tAkhir && nextDateObj > tAkhir) nextOverride = k.jenisNonAktif || "HABIS KONTRAK";
                            else if (tMulaiBaru && nextDateObj < tMulaiBaru) nextOverride = k.jenisNonAktif || "NON-AKTIF";
                            
                            if (nextOverride) nextVal = nextOverride;
                            if (nextVal.toUpperCase() === val.toUpperCase()) span++; else break; 
                        } 
                        html += `<td colspan="${span}" class="cell-berhenti" data-status="${val}">${val.toUpperCase()}</td>`; 
                        skip = span - 1; 
                    } else { 
                        let tglFormat = `${curT}-${String(curB).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`; 
                        let isLiburNasional = this.hariLiburNasional[tglFormat]; 
                        let tdClass = (isLiburNasional ? "cell-libur " : "") + extClass; 
                        
                        let disabledAttr = isPrev ? 'disabled' : baseDisAttr; 
                        
                        if (!isGlobalEditor && !isPrev && val === 'CUTI') { 
                            let objCuti = this.dbCutiBulanan.find(c => c && c.idKaryawan === kId && c.tanggal === tglFormat); 
                            if (objCuti) { if (objCuti.status !== 'Approved') { val = objCuti.shiftAsli || 'OFF'; } } else { val = 'OFF'; } 
                        } 
                        
                        let selectStyle = "";
                        if(val && shiftMap.has(val)) { 
                            let sObj = shiftMap.get(val); 
                            selectStyle = `background-color: ${sObj.bg} !important; color: ${sObj.text} !important; border-color: ${sObj.text} !important;`; 
                        } else {
                            selectStyle = `background-color: ${isLiburNasional ? '#fee2e2' : 'transparent'} !important; color: #1e293b !important; border-color: #cbd5e1 !important;`;
                        }

                        if (isPrev) {
                            selectStyle += " opacity: 1 !important; font-weight: 700; cursor: not-allowed;";
                        }

                        let opts = `<option value="">-</option>`; 
                        this.dbShift.forEach(sh => { 
                            if(!sh) return; 
                            let labelKode = (app.rosterViewMode === 'excel' && sh.kodeExcel) ? sh.kodeExcel : sh.kode;
                            opts += `<option value="${sh.kode}" ${val===sh.kode?'selected':''}>${labelKode}</option>`; 
                        }); 
                        html += `<td class="${tdClass.trim()}"><select class="shift-select" onchange="app.warnaSelect(this, '${isLiburNasional ? '#fee2e2' : 'transparent'})" ${disabledAttr} style="${selectStyle}">${opts}</select></td>`; 
                    } 
                } 
                tr.innerHTML = html; fragment.appendChild(tr); 
            }); 
            
            tbody.innerHTML = ''; tbody.appendChild(fragment); 
            this.kalkulasiTotal(eH_sebelum, jmlHari, ekstraHari); 
            
            // Drag and Drop (Hanya untuk Editor)
            if (typeof Sortable !== 'undefined' && isGlobalEditor) { 
                this.sortableInstance = new Sortable(tbody, { 
                    handle: '.drag-handle', animation: 150, 
                    onEnd: function() { 
                        const rows = tbody.querySelectorAll('tr'); 
                        rows.forEach((row, index) => { if(row.children[0]) row.children[0].innerText = index + 1; }); 
                    } 
                }); 
            } 
        } catch(e) { console.error(e); Swal.fire("Error Tabel", e.message, "error"); } 
    },

    warnaSelect: function(el, defaultBgColor) { 
        const v = el.value; const s = this.dbShift.find(x => x && x.kode === v); 
        if(s) { 
            el.style.setProperty('background-color', s.warnaBg, 'important'); 
            el.style.setProperty('color', s.warnaTeks, 'important'); 
            el.style.setProperty('border-color', s.warnaTeks, 'important'); 
        } 
        else { 
            el.style.setProperty('background-color', defaultBgColor, 'important'); 
            el.style.setProperty('color', '#1e293b', 'important'); 
            el.style.setProperty('border-color', '#cbd5e1', 'important'); 
        } 
        
        const b = parseInt(document.getElementById('rosterBulan').value); 
        const t = parseInt(document.getElementById('rosterTahun').value); 
        const eH_sebelum = parseInt(document.getElementById('rosterEkstraHariSebelum').value) || 0;
        const ekstraHari = parseInt(document.getElementById('rosterEkstraHari').value) || 0;
        const jmlHari = new Date(t, b, 0).getDate(); 
        
        this.kalkulasiTotal(eH_sebelum, jmlHari, ekstraHari); 
    },

    kalkulasiTotal: function(eH_sebelum, jmlHari, ekstraHari) { 
        const tf = document.getElementById('footerRoster'); tf.innerHTML = ''; 
        this.dbShift.forEach(sh => { 
            if(!sh) return; 
            let r = document.createElement('tr'); 
            r.innerHTML = `<td colspan="3" style="background:#f1f5f9; font-size:11px; text-align:right;">Jml <b>${sh.kode}</b></td>`; 
            for(let i = 1 - eH_sebelum; i <= jmlHari + ekstraHari; i++) { 
                let extClass = (i < 1 || i > jmlHari) ? 'col-ekstra' : '';
                r.innerHTML += `<td id="st-${sh.kode}-${i}" class="${extClass}" style="border-top:1px solid #cbd5e1;">0</td>`; 
            }
            tf.appendChild(r); 
        }); 
        
        let rt = document.createElement('tr'); 
        rt.innerHTML = `<td colspan="3" style="background:#dbeafe; color:#1e40af; border-top:2px solid #1e40af; text-align:right;"><b>TOTAL MASUK</b></td>`; 
        for(let i = 1 - eH_sebelum; i <= jmlHari + ekstraHari; i++) { 
            let extClass = (i < 1 || i > jmlHari) ? 'col-ekstra' : '';
            rt.innerHTML += `<td id="st-total-${i}" class="${extClass}" style="background:#dbeafe; color:#1e40af; font-weight:700; border-top:2px solid #1e40af;">0</td>`; 
        }
        tf.appendChild(rt); 
        
        document.querySelectorAll('#bodyRoster tr').forEach(tr => { 
            let idx = 1 - eH_sebelum; 
            let tds = tr.children; 
            for(let j=3; j<tds.length; j++) { 
                let td = tds[j]; 
                let sel = td.querySelector('select'); 
                let k = td.classList.contains('cell-berhenti') ? td.dataset.status : (sel ? sel.value : "");
                
                if(k) { 
                    let el = document.getElementById(`st-${k}-${idx}`); if(el) el.innerText = parseInt(el.innerText) + 1; 
                    if(k !== 'OFF' && k !== 'CUTI' && !['Habis Kontrak', 'Resign', 'C5', 'HABIS KONTRAK', 'RESIGN', 'TERMINATE', 'NON-AKTIF'].includes(k)) { 
                        let et = document.getElementById(`st-total-${idx}`); if(et) et.innerText = parseInt(et.innerText) + 1; 
                    } 
                } 
                idx++; 
            } 
        }); 
    },

    // ==========================================
    // LOGIKA PENYIMPANAN & SINKRONISASI (DENGAN PIN)
    // ==========================================
    extractCurrentTableData: function() { 
        const bln = parseInt(document.getElementById('rosterBulan').value); 
        const thn = parseInt(document.getElementById('rosterTahun').value); 
        const eH_sebelum = parseInt(document.getElementById('rosterEkstraHariSebelum').value) || 0;
        const ekstra = parseInt(document.getElementById('rosterEkstraHari').value) || 0;
        const rId = this.rosterSedangDiedit || `${thn}-${bln}`; 
        
        let existingRoster = this.dbRoster.find(r => String(r.id) === String(rId)); 
        let newS = []; 
        if (existingRoster && existingRoster.karyawanShift) { newS = Array.isArray(existingRoster.karyawanShift) ? [...existingRoster.karyawanShift] : Object.values(existingRoster.karyawanShift); } 
        
        Array.from(document.getElementById('bodyRoster').rows).forEach(tr => { 
            let sh = []; let tds = tr.children; 
            let colIndex = 1 - eH_sebelum;

            for(let i=3; i<tds.length; i++) { 
                let val = "";
                if(tds[i].classList.contains('cell-berhenti')) { val = tds[i].dataset.status; } 
                else { let sel = tds[i].querySelector('select'); val = sel ? sel.value : ""; } 
                
                if (colIndex >= 1) { sh.push(val); } 
                colIndex++;
            } 
            let empId = tr.dataset.kId; let existingEmpIdx = newS.findIndex(x => x.id === empId); 
            if (existingEmpIdx >= 0) { newS[existingEmpIdx] = { id: empId, shifts: sh }; } 
            else { newS.push({ id: empId, shifts: sh }); } 
        }); 
        return { id: rId, bulan: bln, tahun: thn, ekstraHariSebelum: eH_sebelum, ekstraHari: ekstra, karyawanShift: newS }; 
    },

    syncCutiDariRoster: function(allRosters) { 
        const validIds = this.dbKaryawan.map(k => k ? (k.uniqueId || k.idKaryawan) : null).filter(id => id); 
        let cutiUpdates = this.dbCutiBulanan.filter(c => validIds.includes(c.idKaryawan)); let changed = false; 
        
        allRosters.forEach(r => { 
            let b = parseInt(r.bulan); let t = parseInt(r.tahun); let eKs = r.karyawanShift ? (Array.isArray(r.karyawanShift) ? r.karyawanShift : Object.values(r.karyawanShift)) : []; 
            let jmlHari = new Date(t, b, 0).getDate();
            eKs.forEach(emp => { 
                if (!emp || !emp.shifts) return; 
                emp.shifts.forEach((sh, idx) => { 
                    let curB = b; let curT = t; let tgl = idx + 1;
                    if (tgl > jmlHari) { tgl = tgl - jmlHari; curB += 1; if(curB > 12) { curB = 1; curT += 1; } }
                    let tglFormat = `${curT}-${String(curB).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`; 
                    let cIdx = cutiUpdates.findIndex(c => c.idKaryawan === emp.id && c.tanggal === tglFormat); 
                    
                    if (sh === 'CUTI') { 
                        if (cIdx === -1) { cutiUpdates.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 5), idKaryawan: emp.id, tanggal: tglFormat, shiftAsli: 'OFF', status: 'Pending' }); changed = true; } 
                    } else { 
                        if (cIdx !== -1) { cutiUpdates.splice(cIdx, 1); changed = true; } 
                    } 
                }); 
            }); 
        }); 
        if (changed || cutiUpdates.length !== this.dbCutiBulanan.length) { this.dbCutiBulanan = cutiUpdates; db.ref('pengajuan_cuti').set(this.dbCutiBulanan); } 
    },

    prosesSimpanDenganOtorisasi: function() {
        if(!this.cekValidasiAkses('roster_edit')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin menyimpan (Edit) Roster.", "error"); 
        this.otorisasiAksi(() => {
            this.simpanRoster();
        });
    },

    simpanRoster: function() { 
        let btn = document.getElementById('btnSaveRoster'); let btnAsli = btn ? btn.innerHTML : '💾 Save Online'; 
        if(btn) { btn.innerHTML = '⏳ Saving...'; btn.disabled = true; } 
        
        let cData = this.extractCurrentTableData(); const rId = cData.id; const idx = this.dbRoster.findIndex(r => r && String(r.id) === String(rId)); 
        if (idx >= 0) this.dbRoster[idx] = cData; else this.dbRoster.push(cData); 
        
        this.syncCutiDariRoster(this.dbRoster); 
        db.ref('roster').set(this.dbRoster).then(() => { 
            if(btn) { btn.innerHTML = btnAsli; btn.disabled = false; } 
            Swal.fire({ title: 'Tersimpan!', text: 'Roster & Urutan Terbaru Berhasil Tersimpan!', icon: 'success', timer: 2000, showConfirmButton: false }); 
        }).catch(err => { 
            if(btn) { btn.innerHTML = btnAsli; btn.disabled = false; } 
            Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan.', 'error'); 
        }); 
    },

    // ==========================================
    // LOGIKA LAPORAN DAN EKSPOR
    // ==========================================
    renderDaftarRoster: function() { 
        try { 
            const tb = document.getElementById('tabelDaftarRoster'); tb.innerHTML = ''; 
            if(this.dbRoster.length === 0) return tb.innerHTML = `<tr><td colspan="6">Belum ada roster di server.</td></tr>`; 
            const nb = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; 
            const kMap = new Map(); this.dbKaryawan.forEach(k => { if(k) { kMap.set(k.uniqueId, k); kMap.set(k.idKaryawan, k); } }); 
            let html = ''; 
            
            this.dbRoster.forEach((r, i) => { 
                if(!r || !r.id) return; let eKs = r.karyawanShift ? (Array.isArray(r.karyawanShift) ? r.karyawanShift : Object.values(r.karyawanShift)) : []; let jmlS = 0; 
                eKs.forEach(ks => { 
                    if(!ks) return; let kInfo = kMap.get(ks.id); 
                    if (kInfo) { let isReg = !this.isLeader(kInfo.jabatan); if(this.currentRosterTipe === 'all' || (this.currentRosterTipe === 'karyawan' && isReg) || (this.currentRosterTipe === 'manajemen' && !isReg)) jmlS++; } 
                }); 
                
                let eHSblm = r.ekstraHariSebelum || 0; let eHSsdh = r.ekstraHari || 0;
                let isGlobalEditor = this.cekValidasiAkses('roster_edit') || currentUser.role === 'SUPER_ADMIN';
                
                let btn = '';
                if (!isGlobalEditor) {
                    btn = `<button class="btn-primary" style="padding:4px 8px; font-size:11px; display:inline; width:auto;" onclick="app.editRoster('${r.id}')">👁️ Lihat</button>`;
                } else {
                    btn = `<button class="btn-warning" style="padding:4px 8px; font-size:11px; display:inline; width:auto;" onclick="app.editRoster('${r.id}')">✏️ Edit</button> 
                           <button class="btn-danger" style="padding:4px 8px; font-size:11px; display:inline; width:auto;" onclick="app.hapusRoster('${r.id}')">🗑️ Del</button>`;
                }
                
                html += `<tr><td>${i+1}</td><td><b>${nb[parseInt(r.bulan)-1] || r.bulan}</b></td><td>${r.tahun}</td><td>-${eHSblm} | +${eHSsdh}</td><td>${jmlS} Orang</td><td>${btn}</td></tr>`; 
            }); 
            tb.innerHTML = html; 
        } catch(e) { console.error("Render Roster Error:", e); } 
    },

    editRoster: function(id) { 
        const r = this.dbRoster.find(x => x && String(x.id) === String(id)); if(!r) return Swal.fire("Oops", "Roster tidak ditemukan.", "error"); 
        
        // Simpan id roster terlebih dahulu sebelum memanggil switchMenuRoster
        this.rosterSedangDiedit = r.id; 
        
        document.getElementById('rosterBulan').value = String(parseInt(r.bulan)); 
        document.getElementById('rosterTahun').value = String(parseInt(r.tahun)); 
        document.getElementById('rosterEkstraHariSebelum').value = r.ekstraHariSebelum || 0;
        document.getElementById('rosterEkstraHari').value = r.ekstraHari || 0;
        
        document.getElementById('rosterBulan').disabled = true; document.getElementById('rosterTahun').disabled = true; 
        document.getElementById('rosterEkstraHariSebelum').disabled = true; document.getElementById('rosterEkstraHari').disabled = true;
        document.getElementById('containerBtnBuatTabel').style.display = 'none'; 
        
        // Panggil switch dan validasi akses
        let canSwitch = this.switchMenuRoster('menu-input-roster');
        
        // Jika ditolak oleh switchMenuRoster (karena tidak punya hak akses sama sekali), hentikan proses
        if (!canSwitch) {
            this.rosterSedangDiedit = null; // Kembalikan ke state kosong
            return; 
        }

        if (!this.showEkstraHari) this.toggleEkstraHari();

        this.buildTabelRoster(r); 
        this.toggleFullscreen(true);
    },

    hapusRoster: function(id) { 
        if(!this.cekValidasiAkses('roster_hapus')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin menghapus Roster.", "error"); 
        Swal.fire({ title: 'Hapus Roster Bulanan?', text: "Menghapus roster ini akan menghilangkan jadwal semua divisi.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus!' }).then((result) => { 
            if (result.isConfirmed) { this.dbRoster = this.dbRoster.filter(x => x && String(x.id) !== String(id)); db.ref('roster').set(this.dbRoster).then(() => Swal.fire('Terhapus!', 'Roster berhasil dihapus.', 'success')); } 
        }); 
    },

    // ==========================================
    // LOGIKA PERSETUJUAN CUTI HARIAN
    // ==========================================
    renderTabelPengajuanCuti: function() { 
        const b = parseInt(document.getElementById('filterCutiBulan').value); const t = parseInt(document.getElementById('filterCutiTahun').value); 
        const tb = document.getElementById('tabelPengajuanCutiBody'); tb.innerHTML = ''; let counter = 1; 
        let sortedCuti = [...this.dbCutiBulanan].sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal)); 
        let hasApprovalAccess = this.cekValidasiAkses('roster_cuti') || this.cekValidasiAkses('roster_edit') || currentUser.role === 'SUPER_ADMIN'; 
        
        sortedCuti.forEach(c => { 
            if(!c) return; let dt = new Date(c.tanggal); 
            if(dt.getMonth() + 1 === b && dt.getFullYear() === t) { 
                let k = this.dbKaryawan.find(x => x && (x.uniqueId === c.idKaryawan || x.idKaryawan === c.idKaryawan)); if(!k) return; let namaKar = k.nama; 
                let badgeClass = c.status === 'Pending' ? 'badge-pending' : (c.status === 'Approved' ? 'badge-approved' : 'badge-rejected'); 
                let labelStatus = c.status === 'Pending' ? '⏳ PENDING' : (c.status === 'Approved' ? '✅ APPROVED' : '❌ REJECTED'); 
                
                let shiftSelectHtml = `<select style="width:70px; padding:2px; font-weight:bold; border-radius:4px; border:1px solid #cbd5e1; font-size:11px;" onchange="app.ubahShiftPengganti('${c.id}', this.value)" ${!hasApprovalAccess ? 'disabled' : ''}>`; 
                this.dbShift.forEach(s => { if(s && s.kode !== 'CUTI') { shiftSelectHtml += `<option value="${s.kode}" ${c.shiftAsli === s.kode ? 'selected' : ''}>${s.kode}</option>`; } }); shiftSelectHtml += `</select>`; 
                
                let aksiBtns = "-"; 
                if(hasApprovalAccess) { 
                    aksiBtns = `<button class="btn-success" style="padding: 3px 6px; font-size:10px; display:inline; width:auto;" onclick="app.ubahStatusCuti('${c.id}', 'Approved')">✔</button> 
                                <button class="btn-warning" style="padding: 3px 6px; font-size:10px; display:inline; color:#fff; width:auto;" onclick="app.ubahStatusCuti('${c.id}', 'Pending')">⏳</button> 
                                <button class="btn-danger" style="padding: 3px 6px; font-size:10px; display:inline; width:auto;" onclick="app.ubahStatusCuti('${c.id}', 'Rejected')">❌</button>`; 
                } 
                
                let tglFormat = `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`;
                tb.innerHTML += `<tr><td>${counter++}</td><td style="text-align:left; font-weight:bold;">${namaKar}</td><td>${tglFormat}</td><td>${shiftSelectHtml}</td><td><span class="badge ${badgeClass}">${labelStatus}</span></td><td>${aksiBtns}</td></tr>`; 
            } 
        }); 
        if(counter === 1) tb.innerHTML = `<tr><td colspan="6">Tidak ada data cuti bulan ini.</td></tr>`; 
    },
    
    ubahShiftPengganti: function(id, val) { const idx = this.dbCutiBulanan.findIndex(c => c && c.id === id); if(idx !== -1) { this.dbCutiBulanan[idx].shiftAsli = val; db.ref('pengajuan_cuti').set(this.dbCutiBulanan); } },
    ubahStatusCuti: function(id, statusBaru) { const idx = this.dbCutiBulanan.findIndex(c => c && c.id === id); if(idx !== -1) { this.dbCutiBulanan[idx].status = statusBaru; db.ref('pengajuan_cuti').set(this.dbCutiBulanan); } },

    // ==========================================
    // EXPORT DAN IMPORT (EXCEL / JPG)
    // ==========================================
    unduhExcelRoster: function() { 
        if(!this.cekValidasiAkses('roster_view') && !this.cekValidasiAkses('roster_edit')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin mengunduh Excel Roster.", "error");
        
        const bI = parseInt(document.getElementById('rosterBulan').value); 
        const t = parseInt(document.getElementById('rosterTahun').value); 
        const jH = new Date(t, bI, 0).getDate();
        const totalKolom = jH; 
        
        const rId = this.rosterSedangDiedit || `${t}-${bI}`; let currentData = this.extractCurrentTableData(); let ksArray = currentData.karyawanShift; 
        if (ksArray.length === 0) return Swal.fire("Error", "Tabel roster saat ini masih kosong.", "error"); 
        
        const nB = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"][bI - 1]; 
        let exp = []; let rHeader = ["NO", "CABANG", "ATTENDANCEID", "NIK", "NAMA", "JOINDATE", "CONTRACTENDDATE", "TERMINATEDATE", "CONTRACT RENEWAL DATE"]; 
        
        for(let i=1; i<=totalKolom; i++) { 
            rHeader.push(`${i}/${bI}`); 
        } 
        rHeader.push("TOTAL MASUK"); exp.push(rHeader); 
        
        let no = 1; 
        ksArray.forEach(ks => { 
            let kar = this.dbKaryawan.find(x => x && (x.uniqueId === ks.id || x.idKaryawan === ks.id)); if (!kar) return; 
            let sh = ks.shifts || []; let row = [no++, kar.cabang || "", kar.attendanceId || "", kar.nik || "", kar.nama, kar.tglAwal || "", kar.tglAkhir || "", kar.tglTerminate || "", kar.tglPerpanjangan || ""]; 
            let jml = 0; 
            for(let i=0; i<totalKolom; i++) { 
                let v = sh[i] || ""; let outputVal = v; 
                if (v === 'CUTI') { 
                    let tglFormat = `${t}-${String(bI).padStart(2, '0')}-${String(i+1).padStart(2, '0')}`; 
                    let cutiRecord = this.dbCutiBulanan.find(c => c && c.idKaryawan === kar.uniqueId && c.tanggal === tglFormat); 
                    if (cutiRecord && cutiRecord.shiftAsli) { let sAsli = cutiRecord.shiftAsli; let shiftObj = this.dbShift.find(s => s && s.kode === sAsli); outputVal = (shiftObj && shiftObj.kodeExcel) ? shiftObj.kodeExcel : sAsli; } else { outputVal = ""; } 
                } else { 
                    let shiftObj = this.dbShift.find(s => s && s.kode === v); if (shiftObj && shiftObj.kodeExcel) { outputVal = shiftObj.kodeExcel; } 
                } 
                row.push(outputVal); 
                if(v && v !== 'OFF' && v !== 'CUTI' && !['Habis Kontrak', 'Resign', 'C5', 'HABIS KONTRAK', 'RESIGN', 'TERMINATE', 'NON-AKTIF'].includes(v)) jml++; 
            } 
            row.push(jml); exp.push(row); 
        }); 
        
        let ws = XLSX.utils.aoa_to_sheet(exp); let wb = XLSX.utils.book_new(); 
        XLSX.utils.book_append_sheet(wb, ws, `Roster_${nB}_${t}`); XLSX.writeFile(wb, `TemplateImportRoster_${t}-${String(bI).padStart(2,'0')}.xlsx`); 
    },

    unduhJpgRoster: function() { 
        if(!this.cekValidasiAkses('roster_view') && !this.cekValidasiAkses('roster_edit')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin mengunduh JPG Roster.", "error");
        
        const tabelArea = document.getElementById('areaTabelRoster'); 
        if (!tabelArea || tabelArea.style.display === 'none') { return Swal.fire("Oops", "Tabel roster masih kosong! Silakan buka tabel terlebih dahulu.", "warning"); } 
        
        const wrapper = document.querySelector('#areaTabelRoster .table-wrapper'); 
        const originalMaxHeight = wrapper.style.maxHeight; const originalOverflow = wrapper.style.overflow; const originalWidth = wrapper.style.width; 
        
        wrapper.style.maxHeight = 'none'; wrapper.style.overflow = 'visible'; wrapper.style.width = 'max-content'; tabelArea.style.width = 'max-content'; 
        
        const b = document.getElementById('rosterBulan').value; const t = document.getElementById('rosterTahun').value; const nB = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][b - 1]; 
        
        html2canvas(tabelArea, { scale: 2, backgroundColor: "#ffffff", windowWidth: tabelArea.scrollWidth, width: tabelArea.scrollWidth }).then(canvas => { 
            wrapper.style.maxHeight = originalMaxHeight; wrapper.style.overflow = originalOverflow; wrapper.style.width = originalWidth; tabelArea.style.width = ''; 
            const imgData = canvas.toDataURL('image/jpeg', 0.9); const link = document.createElement('a'); link.download = `Jadwal_Roster_${nB}_${t}.jpg`; link.href = imgData; link.click(); 
        }).catch(err => { 
            wrapper.style.maxHeight = originalMaxHeight; wrapper.style.overflow = originalOverflow; wrapper.style.width = originalWidth; tabelArea.style.width = ''; 
            console.error("Error html2canvas:", err); Swal.fire("Error", "Gagal mengunduh gambar: " + err.message, "error"); 
        }); 
    },

    prosesUploadRoster: function(event) { 
        if(!this.cekValidasiAkses('roster_edit') && !this.cekValidasiAkses('roster_input')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki izin mengupload (Edit) Roster.", "error"); 
        const file = event.target.files[0]; if (!file) return; 
        const reader = new FileReader(); 
        reader.onload = (e) => { 
            try { 
                const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: ""}); 
                const bln = parseInt(document.getElementById('rosterBulan').value); const thn = parseInt(document.getElementById('rosterTahun').value); 
                const eH_sebelum = parseInt(document.getElementById('rosterEkstraHariSebelum').value) || 0;
                const ekstraHari = parseInt(document.getElementById('rosterEkstraHari').value) || 0;
                const jH = new Date(thn, bln, 0).getDate();
                const totalKolom = jH + ekstraHari;
                
                const rId = this.rosterSedangDiedit || `${thn}-${bln}`; const idx = this.dbRoster.findIndex(r => r && String(r.id) === String(rId)); 
                let dSave = { id: rId, bulan: bln, tahun: thn, ekstraHariSebelum: eH_sebelum, ekstraHari: ekstraHari, karyawanShift: [] }; 
                let mergedKS = (idx >= 0 && this.dbRoster[idx].karyawanShift) ? (Array.isArray(this.dbRoster[idx].karyawanShift) ? [...this.dbRoster[idx].karyawanShift] : Object.values(this.dbRoster[idx].karyawanShift)) : []; 
                let matched = 0; let startRow = 1; 
                
                for(let i=0; i<Math.min(10, rows.length); i++) { let str = rows[i].join(" ").toUpperCase(); if(str.includes("NAMA") && (str.includes("ATTENDANCEID") || str.includes("JOINDATE") || str.includes("1"))) { startRow = i + 1; break; } } 
                
                for(let i = startRow; i < rows.length; i++) { 
                    let r = rows[i]; if (!r || r.length < 5) continue; 
                    let nE = String(r[4] || "").trim().toLowerCase(); if (!nE || nE === "nama") continue; 
                    let attId = String(r[2] || "").trim(); let nikK = String(r[3] || "").trim(); 
                    let kar = this.dbKaryawan.find(k => k && (k.nama.trim().toLowerCase() === nE || (nikK && k.nik === nikK) || (attId && k.attendanceId === attId))); 
                    
                    if(kar) { 
                        let kId = kar.uniqueId || kar.idKaryawan; let sh = []; 
                        for(let j=0; j<totalKolom; j++) { 
                            let valExcel = String(r[9 + j] || "").trim().toUpperCase(); 
                            let matchedShift = this.dbShift.find(s => s && ((s.kodeExcel && s.kodeExcel.toUpperCase() === valExcel) || (s.kode.toUpperCase() === valExcel))); 
                            sh.push(matchedShift ? matchedShift.kode : valExcel); 
                        } 
                        let p = mergedKS.findIndex(m => m.id === kId); if (p >= 0) mergedKS[p] = { id: kId, shifts: sh }; else mergedKS.push({ id: kId, shifts: sh }); matched++; 
                    } 
                } 
                
                if (matched > 0) { 
                    dSave.karyawanShift = mergedKS; if (idx >= 0) this.dbRoster[idx] = dSave; else this.dbRoster.push(dSave); 
                    this.syncCutiDariRoster(this.dbRoster); 
                    db.ref('roster').set(this.dbRoster).then(() => { Swal.fire("Berhasil", `Sinkronisasi Excel Sukses!\n${matched} Karyawan terupdate.`, "success"); 
                    this.buildTabelRoster(dSave); }).catch(err => { Swal.fire("Error", "Gagal menyimpan data!", "error"); }); 
                } else { Swal.fire("Gagal", "Gagal mencocokkan karyawan! Pastikan Nama / NIK di Excel persis.", "error"); } 
            } catch (err) { Swal.fire("Error", "Gagal membaca file Excel!", "error"); console.error(err); } 
            event.target.value = ""; 
        }; reader.readAsArrayBuffer(file); 
    }
};

document.addEventListener('DOMContentLoaded', () => { app.init(); });