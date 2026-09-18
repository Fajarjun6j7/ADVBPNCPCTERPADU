// ==========================================
// FILE: pusat/pusat.js
// FUNGSI: Logika Khusus Modul Data Pusat
// ==========================================

// Validasi Akses: Pastikan user sudah login
const currentUser = typeof AuthHelper !== 'undefined' ? AuthHelper.checkAccess() : null;

const app = {
    // Array penampung data
    dbKaryawan: [], dbBukanKaryawan: [], dbShift: [], dbAtm: [], dbBank: [], dbAkses: [], 
    dbKasKategori: [], 
    modeRevisiKaryawan: null, editBukanKaryawanId: null, editShiftId: null, editAtmId: null, editBankId: null,

    init: function() {
        if (!currentUser) return;
        const isSuperAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'SUPERADMIN';
        if (!isSuperAdmin) {
            const panelSA = document.getElementById('panelSuperAdmin');
            if(panelSA) panelSA.style.display = 'none';
        }

        this.database = typeof db !== 'undefined' ? db : (firebase.apps.length ? firebase.database() : null);
        if(!this.database) return alert("Database gagal dimuat!");

        this.renderDynamicAksesUI(); // Merender form hak akses dari konfigurasi global
        this.loadData();
        this.enableDragScroll();
        this.kunciFormKontrakBaru(true);
    },

    // ==========================================
    // RENDER HAK AKSES OTOMATIS
    // ==========================================
    renderDynamicAksesUI: function() {
        const container = document.getElementById('dynamic-akses-container');
        if (!container || typeof MASTER_HAK_AKSES === 'undefined') return;
        
        container.innerHTML = '';
        
        MASTER_HAK_AKSES.forEach(modul => {
            let htmlAkses = '';
            modul.akses.forEach(item => {
                htmlAkses += `<label><input type="checkbox" class="chk-akses" value="${item.kode}"> ${item.label}</label>`;
            });
            
            const cardHTML = `
                <div class="akses-card">
                    <h4 style="color: ${modul.warna};">${modul.namaModul}</h4>
                    ${htmlAkses}
                </div>
            `;
            container.innerHTML += cardHTML;
        });
    },

    loadData: function() {
        this.database.ref('hak_akses').on('value', snap => {
            let d = snap.val(); this.dbAkses = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.renderTabelAkses();
            this.terapkanUIAkses(); 
        });

        this.database.ref('karyawan').on('value', snap => {
            let d = snap.val(); this.dbKaryawan = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.updateDashboardStats(); 
            this.renderTabelKaryawan(); 
            if (!this.editCutiId) this.renderMasterCuti();
            this.renderTabelPinKhusus(); this.renderDropdownAkses();
            this.renderTabelAkses(); 
        });

        this.database.ref('bukan_karyawan').on('value', snap => {
            let d = snap.val(); this.dbBukanKaryawan = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.renderTabelBukanKaryawan();
            this.renderDropdownAkses();
        });

        this.database.ref('shift').on('value', snap => {
            let d = snap.val(); this.dbShift = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.updateDashboardStats(); this.renderTabelShift();
        });

        this.database.ref('master_bank').on('value', snap => {
            let d = snap.val(); this.dbBank = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.updateDashboardStats(); this.renderTabelBank(); this.renderDropdownBank();
        });

        this.database.ref('lokasi_atm').on('value', snap => {
            let d = snap.val(); this.dbAtm = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.updateDashboardStats(); this.renderTabelAtm();
        });

        this.database.ref('kas_kategori').on('value', snap => { 
            let d = snap.val(); this.dbKasKategori = Array.isArray(d) ? d : (d ? Object.values(d) : []); 
            this.renderCheckboxKategoriKasAkses(); 
        });

        this.database.ref('settings/sambutan').on('value', snap => { 
            let val = snap.val() || "Selamat datang di Portal Utama Terpadu V8.8"; 
            if(document.getElementById('teksSambutanDashboard')) document.getElementById('teksSambutanDashboard').innerHTML = val; 
            if(document.getElementById('inputSambutanAdmin')) document.getElementById('inputSambutanAdmin').value = val; 
        });
    },

    // ==========================================
    // UTILS & TAMPILAN
    // ==========================================
    enableDragScroll: function() {
        let isDown = false; let startX; let scrollLeft; let activeSlider = null;
        const style = document.createElement('style');
        style.innerHTML = `.table-wrapper { cursor: grab; } .table-wrapper table { cursor: grab; } .table-wrapper:active, .table-wrapper:active table { cursor: grabbing; } .table-wrapper input, .table-wrapper select, .table-wrapper button { cursor: auto; }`;
        document.head.appendChild(style);

        document.addEventListener('mousedown', (e) => {
            const slider = e.target.closest('.table-wrapper');
            if(!slider) return;
            if(['INPUT', 'SELECT', 'BUTTON', 'A', 'TEXTAREA'].includes(e.target.tagName) || e.target.classList.contains('drag-handle')) return;
            isDown = true; activeSlider = slider; startX = e.pageX - activeSlider.offsetLeft; scrollLeft = activeSlider.scrollLeft;
        });
        document.addEventListener('mouseup', () => { isDown = false; activeSlider = null; });
        document.addEventListener('mouseleave', () => { isDown = false; activeSlider = null; });
        document.addEventListener('mousemove', (e) => {
            if (!isDown || !activeSlider) return;
            e.preventDefault(); 
            const x = e.pageX - activeSlider.offsetLeft; const walk = (x - startX) * 1.5; 
            activeSlider.scrollLeft = scrollLeft - walk;
        });
    },

    switchMenuPusat: function(menuId, element) {
        let reqAccess = '';
        if(menuId === 'menu-home') reqAccess = 'pusat_dashboard'; 
        if(menuId === 'menu-karyawan') reqAccess = 'pusat_karyawan'; 
        if(menuId === 'menu-bukankaryawan') reqAccess = 'pusat_bukankaryawan'; 
        if(menuId === 'menu-cuti') reqAccess = 'pusat_cuti'; 
        if(menuId === 'menu-shift') reqAccess = 'pusat_shift'; 
        if(menuId === 'menu-bank') reqAccess = 'pusat_bank'; 
        if(menuId === 'menu-atm') reqAccess = 'pusat_atm'; 
        if(menuId === 'menu-akses' || menuId === 'menu-pin') reqAccess = 'pusat_akses';
        
        if(reqAccess && !this.cekValidasiAkses(reqAccess)) return Swal.fire("Akses Ditolak!", "Anda tidak memiliki izin membuka menu ini.", "error");

        document.querySelectorAll('#data-pusat-module .section').forEach(s => s.classList.remove('active')); 
        document.getElementById(menuId).classList.add('active');
        
        if(element) { 
            document.querySelectorAll('#data-pusat-module .nav-link').forEach(n => n.classList.remove('active')); 
            element.classList.add('active'); 
        }
        if (window.innerWidth <= 768) { document.querySelector('#data-pusat-module .sidebar').classList.remove('active'); }
    },

    toggleSidebarDesktop: function() {
        const container = document.getElementById('data-pusat-module');
        if(container && container.classList.contains('active-desktop')) {
            const sidebar = container.querySelector('.sidebar');
            const mainContent = container.querySelector('.main-content');
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        }
    },

    updateDashboardStats: function() {
        if(document.getElementById('stat-karyawan')) document.getElementById('stat-karyawan').innerText = this.dbKaryawan.length;
        if(document.getElementById('stat-jenis-shift')) document.getElementById('stat-jenis-shift').innerText = this.dbShift.length;
        if(document.getElementById('stat-bank')) document.getElementById('stat-bank').innerText = this.dbBank.length;
        if(document.getElementById('stat-atm')) document.getElementById('stat-atm').innerText = this.dbAtm.length;
    },

    terapkanUIAkses: function() {
        if(!currentUser) return;
        let isSuper = currentUser.role === 'SUPERADMIN' || currentUser.role === 'SUPER_ADMIN';
        let kId = currentUser.idKaryawan;
        
        let userAksesDb = this.dbAkses.find(a => a && a.idKaryawan === kId) || {};
        
        const cekAkses = (kode) => {
            if (isSuper) return true;
            return userAksesDb.aksesList && userAksesDb.aksesList.includes(kode);
        };

        const toggleMenu = (idHTML, kodeRBAC) => { 
            let el = document.getElementById(idHTML); 
            if(el) { el.style.display = (isSuper || cekAkses(kodeRBAC)) ? 'block' : 'none'; }
        };

        toggleMenu('nav-pusat-dashboard', 'pusat_dashboard'); 
        toggleMenu('nav-pusat-karyawan', 'pusat_karyawan'); 
        toggleMenu('nav-pusat-bukankaryawan', 'pusat_bukankaryawan'); 
        toggleMenu('nav-pusat-cuti', 'pusat_cuti'); 
        toggleMenu('nav-pusat-shift', 'pusat_shift'); 
        toggleMenu('nav-pusat-bank', 'pusat_bank'); 
        toggleMenu('nav-pusat-atm', 'pusat_atm'); 
        toggleMenu('nav-pusat-akses', 'pusat_akses'); 
        toggleMenu('nav-pusat-pin', 'pusat_akses');

        let hasDatabaseAcc = ['pusat_karyawan', 'pusat_bukankaryawan', 'pusat_cuti','pusat_shift','pusat_bank','pusat_atm'].some(x => isSuper || cekAkses(x));
        if(document.getElementById('div-pusat-database')) document.getElementById('div-pusat-database').style.display = hasDatabaseAcc ? 'block' : 'none';
        
        let hasKeamananAcc = ['pusat_akses', 'pusat_pin'].some(x => isSuper || cekAkses(x));
        if(document.getElementById('div-pusat-keamanan')) document.getElementById('div-pusat-keamanan').style.display = hasKeamananAcc ? 'block' : 'none';
        
        if(document.getElementById('div-pusat-pengaturan')) document.getElementById('div-pusat-pengaturan').style.display = (isSuper || cekAkses('pusat_dashboard')) ? 'block' : 'none';
    },

    cekValidasiAkses: function(kodeAkses) {
        if (!currentUser) return false; 
        if (currentUser.role === 'SUPERADMIN' || currentUser.role === 'SUPER_ADMIN') return true; 
        let kId = currentUser.idKaryawan; 
        if(!kId) return false; 
        let userAksesDb = this.dbAkses.find(a => a && a.idKaryawan === kId); 
        if (userAksesDb && userAksesDb.aksesList && userAksesDb.aksesList.includes(kodeAkses)) { return true; } 
        return false; 
    },

    // ==========================================
    // PENGATURAN SUPER ADMIN & RESET
    // ==========================================
    ubahSambutan: function() { 
        const teks = document.getElementById('inputSambutanAdmin').value.trim(); 
        if(teks) { this.database.ref('settings/sambutan').set(teks); Swal.fire("Berhasil", "Sambutan berhasil diperbarui!", "success"); } 
    },
    ubahKodeOtentik: function() { 
        const idSuper = document.getElementById('inputIdSuper').value.trim(); const kSuper = document.getElementById('inputKodeSuper').value.trim(); 
        const pinG1 = document.getElementById('inputPinGlobal1').value.trim(); const pinG2 = document.getElementById('inputPinGlobal2').value.trim(); const pinG3 = document.getElementById('inputPinGlobal3').value.trim(); 
        if(idSuper) this.database.ref('settings/id_superadmin').set(idSuper); if(kSuper) this.database.ref('settings/pin_superadmin').set(kSuper); 
        if(pinG1) this.database.ref('settings/pin_karyawan_1').set(pinG1); if(pinG2) this.database.ref('settings/pin_karyawan_2').set(pinG2); if(pinG3) this.database.ref('settings/pin_karyawan_3').set(pinG3); 
        if(idSuper || kSuper || pinG1 || pinG2 || pinG3) { 
            document.getElementById('inputIdSuper').value = ''; document.getElementById('inputKodeSuper').value = ''; 
            Swal.fire("Berhasil", "Pengaturan PIN Global berhasil disimpan.", "success");
        } else { Swal.fire("Info", "Tidak ada perubahan keamanan.", "info"); }
    },

    resetData: function(tipe) {
        let pesan = ""; let refNode = "";
        if(tipe === 'karyawan') { pesan = "SELURUH DATA KARYAWAN"; refNode = 'karyawan'; } 
        else if(tipe === 'bukankaryawan') { pesan = "SELURUH DATA BUKAN KARYAWAN"; refNode = 'bukan_karyawan'; } 
        else if(tipe === 'cuti') { pesan = "PENGATURAN HAK CUTI"; refNode = 'karyawan'; } 
        else if(tipe === 'shift') { pesan = "DATA MASTER SHIFT"; refNode = 'shift'; } 
        else if(tipe === 'bank') { pesan = "DATA MASTER BANK"; refNode = 'master_bank'; } 
        else if(tipe === 'atm') { pesan = "DATA LOKASI ATM"; refNode = 'lokasi_atm'; }
        else if(tipe === 'akses') { pesan = "SELURUH HAK AKSES USER"; refNode = 'hak_akses'; } 
        else if(tipe === 'kas') { pesan = "SELURUH DATA BUKU KAS & IURAN"; refNode = 'kas'; }
        else if(tipe === 'khasanah') { pesan = "SELURUH DATA SALDO & TRX KHASANAH"; refNode = 'khasanah'; }

        Swal.fire({
            title: `Yakin HAPUS ${pesan}?`, text: "Tindakan ini BERBAHAYA dan TIDAK BISA dibatalkan!", icon: 'error', showCancelButton: true, confirmButtonColor: '#7f1d1d'
        }).then((result) => {
            if (result.isConfirmed) {
                if(tipe === 'cuti') { 
                    let updatedKaryawan = this.dbKaryawan.map(k => { if(k) k.manualCutiObj = null; return k; }); 
                    this.database.ref('karyawan').set(updatedKaryawan).then(() => { Swal.fire('Berhasil!', 'Hak Cuti direset!', 'success'); }); 
                } 
                else if(tipe === 'akses') { 
                    this.dbAkses = []; this.database.ref('hak_akses').set(null).then(() => { Swal.fire('Dikosongkan!', `✅ ${pesan} dikosongkan!`, 'success'); });
                }
                else {
                    if(tipe === 'karyawan') this.dbKaryawan = [];
                    else if(tipe === 'bukankaryawan') this.dbBukanKaryawan = []; 
                    else if(tipe === 'shift') this.dbShift = []; 
                    else if(tipe === 'bank') { this.dbBank = []; this.renderDropdownBank(); }
                    else if(tipe === 'atm') this.dbAtm = []; 
                    else if(tipe === 'kas') { 
                        this.database.ref('kas_kategori').set(null); this.database.ref('kas_aturan').set(null); this.database.ref('kas_transaksi').set(null).then(() => { Swal.fire('Dikosongkan!', `${pesan} telah dihapus.`, 'success'); }); return; 
                    }
                    else if(tipe === 'khasanah') {
                        this.database.ref('khasanah_saldo').set(null); this.database.ref('khasanah_trx').set(null); this.database.ref('khasanah_kroscek').set(null).then(() => { Swal.fire('Dikosongkan!', `${pesan} telah dihapus.`, 'success'); }); return;
                    }
                    this.updateDashboardStats(); 
                    this.database.ref(refNode).set(null).then(() => { Swal.fire('Dikosongkan!', `${pesan} telah dihapus.`, 'success'); });
                }
            }
        });
    },

    formatTanggal: function(tglStr) { if (!tglStr) return '-'; const d = new Date(tglStr); if (isNaN(d.getTime())) return tglStr; return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`; },
    konversiTanggalExcel: function(nilai) { if (!nilai) return ""; if (!isNaN(nilai) && Number(nilai) > 1000) { let date = new Date(Math.round((nilai - 25569) * 86400 * 1000)); date.setHours(12, 0, 0, 0); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; } let str = String(nilai).trim(); if (str.includes('/')) { let parts = str.split('/'); if (parts.length === 3) { if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`; } } else if (str.includes('-')) { let parts = str.split('-'); if (parts.length === 3 && parts[0].length === 4) return str.substring(0, 10); } return str; },
    hitungBulan: function(startStr, endStr) { if (!startStr || !endStr) return 0; return Math.round(Math.abs(new Date(endStr) - new Date(startStr)) / (1000 * 60 * 60 * 24) / 30.416); },
    isTrainee: function(jabatan) { return (jabatan || "").toLowerCase().includes('training') || (jabatan || "").toLowerCase().includes('trainee'); },
    getYearMonthKey: function(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0'); },

    formatToDateInput: function(dateStr) {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        if (dateStr.includes('/')) {
            let p = dateStr.split('/');
            if (p.length === 3) {
                let d = p[0].padStart(2, '0');
                let m = p[1].padStart(2, '0');
                let y = p[2];
                if (y.length === 2) y = "20" + y;
                return `${y}-${m}-${d}`;
            }
        }
        return dateStr;
    },

    // ==========================================
    // BUKAN KARYAWAN
    // ==========================================
    simpanBukanKaryawan: function() {
        const id = document.getElementById('inputBukanKaryawanId').value.trim(); const nama = document.getElementById('inputBukanKaryawanNama').value.trim();
        if(!id || !nama) return Swal.fire('Error', 'ID dan Nama wajib diisi!', 'error');
        const btn = document.getElementById('btnSimpanBukanKaryawan'); const btnAsli = btn.innerHTML; btn.innerHTML = '⏳...'; btn.disabled = true;
        const data = { id: id, nama: nama };
        if(this.editBukanKaryawanId) { const idx = this.dbBukanKaryawan.findIndex(x => x.id === this.editBukanKaryawanId); if(idx !== -1) this.dbBukanKaryawan[idx] = data; } 
        else { if(this.dbBukanKaryawan.some(x => x.id === id)) { btn.innerHTML = btnAsli; btn.disabled = false; return Swal.fire('Error', 'ID sudah terdaftar!', 'error'); } this.dbBukanKaryawan.push(data); }
        this.database.ref('bukan_karyawan').set(this.dbBukanKaryawan).then(() => { btn.innerHTML = btnAsli; btn.disabled = false; Swal.fire('Tersimpan', 'Data berhasil disimpan', 'success'); app.batalRevisiBukanKaryawan(); });
    },
    prosesRevisiBukanKaryawan: function(id) { 
        const data = this.dbBukanKaryawan.find(x => x.id === id); if(!data) return; this.editBukanKaryawanId = id; 
        document.getElementById('inputBukanKaryawanId').value = data.id; document.getElementById('inputBukanKaryawanId').readOnly = true; document.getElementById('inputBukanKaryawanNama').value = data.nama; 
        document.getElementById('titleMasterBukanKaryawan').innerText = "✏️ Edit Bukan Karyawan"; document.getElementById('formMasterBukanKaryawan').classList.add('edit-mode'); document.getElementById('btnSimpanBukanKaryawan').innerHTML = "Update Data"; document.getElementById('btnSimpanBukanKaryawan').classList.replace('btn-primary', 'btn-warning'); document.getElementById('btnBatalBukanKaryawan').style.display = "inline-block"; window.scrollTo({ top: 0, behavior: 'smooth' }); 
    },
    batalRevisiBukanKaryawan: function() { 
        this.editBukanKaryawanId = null; document.getElementById('inputBukanKaryawanId').value = ''; document.getElementById('inputBukanKaryawanId').readOnly = false; document.getElementById('inputBukanKaryawanNama').value = ''; 
        document.getElementById('titleMasterBukanKaryawan').innerText = "📝 Input Data Bukan Karyawan"; document.getElementById('formMasterBukanKaryawan').classList.remove('edit-mode'); document.getElementById('btnSimpanBukanKaryawan').innerHTML = "Simpan"; document.getElementById('btnSimpanBukanKaryawan').classList.replace('btn-warning', 'btn-primary'); document.getElementById('btnBatalBukanKaryawan').style.display = "none"; 
    },
    hapusBukanKaryawan: function(id) { 
        Swal.fire({ title: 'Hapus data?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((res) => { if(res.isConfirmed) { this.dbBukanKaryawan = this.dbBukanKaryawan.filter(x => x.id !== id); this.database.ref('bukan_karyawan').set(this.dbBukanKaryawan).then(() => { Swal.fire('Terhapus', 'Data dihapus.', 'success'); }); } }); 
    },
    renderTabelBukanKaryawan: function() { 
        const tb = document.getElementById('tabelBukanKaryawanBody'); if(!tb) return; tb.innerHTML = ''; 
        this.dbBukanKaryawan.forEach((bk, i) => { tb.innerHTML += `<tr><td>${i+1}</td><td><b>${bk.id}</b></td><td style="text-align: left;">${bk.nama}</td><td><button class="btn-warning" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.prosesRevisiBukanKaryawan('${bk.id}')">Edit</button> <button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.hapusBukanKaryawan('${bk.id}')">Del</button></td></tr>`; }); 
        if(this.dbBukanKaryawan.length === 0) tb.innerHTML = `<tr><td colspan="4">Belum ada data Non-Karyawan.</td></tr>`; 
    },

    // ==========================================
    // KARYAWAN & CUTI
    // ==========================================
    kunciFormKontrakBaru: function(isLocked) {
        const lockBg = isLocked ? "#f1f5f9" : "";
        const inputs = ['inputIdBaru', 'inputNikBaru', 'inputTglMulaiBaru', 'inputTglAkhirBaru'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.readOnly = isLocked; el.style.background = lockBg; }
        });
    },

    simpanKaryawan: function() { 
        const nm = document.getElementById('inputNama').value.trim(); 
        if (!nm) return Swal.fire('Error!', 'Nama Lengkap wajib diisi!', 'error'); 
        
        const btn = document.getElementById('btnSimpanKaryawan'); 
        btn.innerHTML = '⏳ Menyimpan...'; btn.disabled = true; 
        
        try {
            const dt = { 
                uniqueId: this.modeRevisiKaryawan || Date.now().toString(), 
                cabang: document.getElementById('inputCabang').value.trim(), 
                attendanceId: document.getElementById('inputAttendanceId').value.trim(), 
                nik: document.getElementById('inputNik').value.trim(), 
                nama: nm, 
                jabatan: document.getElementById('inputJabatan').value.trim() || 'Staff', 
                
                jenisNonAktif: document.getElementById('inputJenisNonAktif').value.trim(),
                idBaru: document.getElementById('inputIdBaru').value.trim(),
                nikBaru: document.getElementById('inputNikBaru').value.trim(),
                tglMulaiBaru: document.getElementById('inputTglMulaiBaru').value,
                tglAkhirBaru: document.getElementById('inputTglAkhirBaru').value,

                pin1: document.getElementById('inputPinP1').value.trim() || null, 
                pin2: document.getElementById('inputPinP2').value.trim() || null, 
                pin3: document.getElementById('inputPinP3').value.trim() || null,
                idKaryawan: document.getElementById('inputAttendanceId').value.trim() || document.getElementById('inputNik').value.trim() || Date.now().toString(), 
                tglAwal: document.getElementById('inputJoinDate').value, 
                tglAkhir: document.getElementById('inputContractEndDate').value, 
                tglTerminate: document.getElementById('inputTerminateDate').value, 
                tglPerpanjangan: '', 
                manualCutiObj: null 
            }; 
            
            if (this.modeRevisiKaryawan) { 
                const i = this.dbKaryawan.findIndex(k => k && (k.uniqueId === this.modeRevisiKaryawan || k.idKaryawan === this.modeRevisiKaryawan)); 
                if(i !== -1) { 
                    dt.uniqueId = this.dbKaryawan[i].uniqueId || dt.uniqueId; 
                    dt.manualCutiObj = this.dbKaryawan[i].manualCutiObj || null; 
                    if (!document.getElementById('inputPinP1').value) dt.pin1 = this.dbKaryawan[i].pin1 || null;
                    if (!document.getElementById('inputPinP2').value) dt.pin2 = this.dbKaryawan[i].pin2 || null;
                    if (!document.getElementById('inputPinP3').value) dt.pin3 = this.dbKaryawan[i].pin3 || null;
                    this.dbKaryawan[i] = dt; 
                } 
            } else { 
                this.dbKaryawan.push(dt); 
            } 
            
            let todayDate = new Date(); todayDate.setHours(0,0,0,0);
            
            if (dt.tglTerminate && new Date(dt.tglTerminate) < todayDate) {
                let isAutoAktif = dt.tglMulaiBaru && new Date(dt.tglMulaiBaru) <= todayDate;
                if (!isAutoAktif) {
                    this.dbAkses = this.dbAkses.filter(a => a && a.idKaryawan !== dt.uniqueId && a.idKaryawan !== dt.idKaryawan);
                    this.database.ref('hak_akses').set(this.dbAkses);
                    dt.pin1 = ""; dt.pin2 = ""; dt.pin3 = "";
                }
            }
            
            this.database.ref('karyawan').set(this.dbKaryawan).then(() => {
                btn.innerHTML = 'Simpan Data'; btn.disabled = false;
                Swal.fire({ title: 'Berhasil!', text: 'Data Karyawan tersimpan!', icon: 'success', timer: 1500, showConfirmButton: false }); 
                app.batalRevisiKaryawan(); 
            }).catch(err => {
                btn.innerHTML = 'Simpan Data'; btn.disabled = false;
                Swal.fire('Gagal Simpan!', 'Terjadi kesalahan sinkronisasi ke Firebase.', 'error');
            }); 
            
        } catch(error) {
            btn.innerHTML = 'Simpan Data'; btn.disabled = false;
            Swal.fire('Error Sistem', error.message, 'error');
        }
    },
    prosesRevisiKaryawan: function(uid) { 
        const k = this.dbKaryawan.find(x => x && (x.uniqueId === uid || x.idKaryawan === uid)); if(!k) return; 
        this.modeRevisiKaryawan = k.uniqueId || k.idKaryawan; 
        document.getElementById('inputCabang').value = k.cabang || ''; 
        document.getElementById('inputAttendanceId').value = k.attendanceId || ''; 
        document.getElementById('inputNik').value = k.nik || ''; 
        document.getElementById('inputNama').value = k.nama || ''; 
        document.getElementById('inputJabatan').value = k.jabatan || ''; 
        
        document.getElementById('inputJenisNonAktif').value = k.jenisNonAktif || '';
        document.getElementById('inputIdBaru').value = k.idBaru || '';
        document.getElementById('inputNikBaru').value = k.nikBaru || ''; 
        
        document.getElementById('inputTglMulaiBaru').value = this.formatToDateInput(k.tglMulaiBaru);
        document.getElementById('inputTglAkhirBaru').value = this.formatToDateInput(k.tglAkhirBaru);
        document.getElementById('inputJoinDate').value = this.formatToDateInput(k.tglAwal); 
        document.getElementById('inputContractEndDate').value = this.formatToDateInput(k.tglAkhir); 
        document.getElementById('inputTerminateDate').value = this.formatToDateInput(k.tglTerminate); 

        document.getElementById('inputPinP1').value = k.pin1 || ''; 
        document.getElementById('inputPinP2').value = k.pin2 || ''; 
        document.getElementById('inputPinP3').value = k.pin3 || ''; 
        
        document.getElementById('titleMasterKaryawan').innerText = "✏️ Revisi Karyawan"; 
        document.getElementById('formMasterKaryawan').classList.add('edit-mode'); 
        
        let btn = document.getElementById('btnSimpanKaryawan'); 
        if(btn){ btn.innerHTML = "Update Data"; btn.classList.replace('btn-primary', 'btn-warning'); }
        document.getElementById('btnBatalRevisi').style.display = "inline-block"; 

        let today = new Date(); today.setHours(0,0,0,0);
        let tglAkhir = k.tglAkhir ? new Date(k.tglAkhir) : null;
        let tglTerminate = k.tglTerminate ? new Date(k.tglTerminate) : null;
        let isTerminate = tglTerminate && tglTerminate <= today;
        let isHabisKontrak = tglAkhir && tglAkhir < today && !isTerminate;
        let isTidakAktif = isTerminate || isHabisKontrak;

        let tglMulaiBaru = k.tglMulaiBaru ? new Date(k.tglMulaiBaru) : null;
        if (tglMulaiBaru && tglMulaiBaru <= today) { isTidakAktif = false; }

        this.kunciFormKontrakBaru(!isTidakAktif);
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    },
    batalRevisiKaryawan: function() { 
        this.modeRevisiKaryawan = null; 
        document.getElementById('inputCabang').value = ''; 
        document.getElementById('inputAttendanceId').value = ''; 
        document.getElementById('inputNik').value = ''; 
        document.getElementById('inputNama').value = ''; 
        document.getElementById('inputJabatan').value = ''; 
        
        document.getElementById('inputJenisNonAktif').value = '';
        document.getElementById('inputIdBaru').value = '';
        document.getElementById('inputNikBaru').value = ''; 
        document.getElementById('inputTglMulaiBaru').value = '';
        document.getElementById('inputTglAkhirBaru').value = '';

        document.getElementById('inputPinP1').value = ''; 
        document.getElementById('inputPinP2').value = ''; 
        document.getElementById('inputPinP3').value = ''; 
        
        document.getElementById('inputJoinDate').value = ''; 
        document.getElementById('inputContractEndDate').value = ''; 
        document.getElementById('inputTerminateDate').value = ''; 
        
        document.getElementById('titleMasterKaryawan').innerText = "📝 Input Data Karyawan"; 
        document.getElementById('formMasterKaryawan').classList.remove('edit-mode'); 
        
        let btn = document.getElementById('btnSimpanKaryawan'); 
        if(btn){ btn.innerHTML = "Simpan Data"; btn.classList.replace('btn-warning', 'btn-primary'); }
        document.getElementById('btnBatalRevisi').style.display = "none"; 
        
        this.kunciFormKontrakBaru(true);
    },
    hapusKaryawan: function(uid) { 
        Swal.fire({ title: 'Yakin hapus karyawan?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((result) => { 
            if (result.isConfirmed) { 
                this.dbKaryawan = this.dbKaryawan.filter(k => k && k.uniqueId !== uid && k.idKaryawan !== uid); 
                this.database.ref('karyawan').set(this.dbKaryawan).then(() => { Swal.fire('Terhapus!', 'Data dihapus.', 'success'); }); 
            } 
        }); 
    },
    renderTabelKaryawan: function() { 
        const tbAktif = document.getElementById('tabelKaryawanBody'); 
        const tbTidakAktif = document.getElementById('tabelKaryawanTidakAktifBody');
        if (tbAktif) tbAktif.innerHTML = ''; 
        if (tbTidakAktif) tbTidakAktif.innerHTML = ''; 
        
        let countAktif = 1; let countTidakAktif = 1; let today = new Date(); today.setHours(0,0,0,0);
        
        this.dbKaryawan.forEach((k) => { 
            if(!k) return; 
            let uid = k.uniqueId || k.idKaryawan; 
            
            let tglMulaiBaru = k.tglMulaiBaru ? new Date(k.tglMulaiBaru) : null;
            let isAutoAktif = tglMulaiBaru && tglMulaiBaru <= today; 
            
            let isTidakAktif = false; let statusHTML = "";
            let displayAwal = k.tglAwal; let displayAkhir = k.tglAkhir; let displayTerminate = k.tglTerminate;
            let displayAttId = k.attendanceId; let displayNik = k.nik; let displayPrevAttId = "-"; let displayPrevNik = "-";

            if (isAutoAktif) {
                isTidakAktif = false;
                displayAttId = k.idBaru || k.attendanceId; displayNik = k.nikBaru || k.nik;
                displayPrevAttId = k.idBaru ? k.attendanceId : "-"; displayPrevNik = k.nikBaru ? k.nik : "-";
                displayAwal = k.tglMulaiBaru; displayAkhir = k.tglAkhirBaru; displayTerminate = ""; 
            } else {
                let tglAkhir = k.tglAkhir ? new Date(k.tglAkhir) : null;
                let tglTerminate = k.tglTerminate ? new Date(k.tglTerminate) : null;
                let isTerminate = tglTerminate && tglTerminate <= today;
                let isHabisKontrak = tglAkhir && tglAkhir < today && !isTerminate;
                isTidakAktif = isTerminate || isHabisKontrak;

                if (isTerminate) { statusHTML = `<span class="badge-status status-permanen">Habis Permanen</span>`; } 
                else if (isHabisKontrak) { statusHTML = `<span class="badge-status status-sementara">Habis Sementara</span>`; }
                if (k.jenisNonAktif) { statusHTML += `<br><small style="color:#64748b; font-weight:600;">${k.jenisNonAktif}</small>`; }
            }

            let prevIds = `<span style="color:#64748b;">${displayPrevAttId}<br><small>${displayPrevNik}</small></span>`;
            let currIds = `<b>${displayAttId || "-"}</b><br><small>${displayNik || "-"}</small>`;

            let trHTML = `<tr> 
                <td>${isTidakAktif ? countTidakAktif++ : countAktif++}</td> 
                <td>${k.cabang || "-"}</td> 
                <td>${prevIds}</td> 
                <td>${currIds}</td> 
                <td style="text-align:left;"><b>${k.nama}</b><br><small style="color:#64748b;">${k.jabatan || "-"}</small></td>`;
            
            if (isTidakAktif) {
                trHTML += `<td>${statusHTML}</td><td>${this.formatTanggal(displayAkhir)}</td><td>${this.formatTanggal(displayTerminate)}</td><td><b style="color:#10b981;">${this.formatTanggal(k.tglMulaiBaru)}</b></td>`;
            } else {
                trHTML += `<td>${this.formatTanggal(displayAwal)}</td><td>${this.formatTanggal(displayAkhir)}</td><td>${this.formatTanggal(displayTerminate)}</td>`;
            }

            trHTML += `<td> 
                <button class="btn-warning" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.prosesRevisiKaryawan('${uid}')">Edit</button> 
                <button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.hapusKaryawan('${uid}')">Del</button> 
            </td></tr>`; 
            
            if (isTidakAktif && tbTidakAktif) { tbTidakAktif.innerHTML += trHTML; } else if (!isTidakAktif && tbAktif) { tbAktif.innerHTML += trHTML; }
        }); 

        if(countAktif === 1 && tbAktif) tbAktif.innerHTML = `<tr><td colspan="10" style="text-align:center;">Tidak ada karyawan aktif yang terdaftar.</td></tr>`;
        if(countTidakAktif === 1 && tbTidakAktif) tbTidakAktif.innerHTML = `<tr><td colspan="10" style="text-align:center;">Tidak ada karyawan tidak aktif (Habis Kontrak/Terminate).</td></tr>`;
    },
    unduhExcelKaryawan: function() { 
        let exp = []; let rHeader = ["NO", "CABANG", "ATTENDANCEID", "NIK", "NAMA", "JABATAN", "JOINDATE", "CONTRACTENDDATE", "TERMINATEDATE", "CONTRACT RENEWAL DATE"]; exp.push(rHeader); 
        if (this.dbKaryawan.length === 0) { exp.push([1, "BALIKPAPAN", "12345", "NIK-001", "CONTOH NAMA", "STAFF", "2024-01-01", "2024-12-31", "", ""]); } 
        else { let no = 1; this.dbKaryawan.forEach(kar => { if(!kar) return; exp.push([ no++, kar.cabang || "", kar.attendanceId || "", kar.nik || "", kar.nama || "", kar.jabatan || "", kar.tglAwal || "", kar.tglAkhir || "", kar.tglTerminate || "", kar.tglPerpanjangan || "" ]); }); } 
        let ws = XLSX.utils.aoa_to_sheet(exp); let wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Master Karyawan"); XLSX.writeFile(wb, "Template_Master_Karyawan.xlsx"); 
    },
    handleDropKaryawan: function(event) { 
        event.preventDefault(); event.currentTarget.classList.remove('dragover'); 
        const files = event.dataTransfer.files; 
        if(files.length > 0) { document.getElementById('uploadExcelKaryawan').files = files; app.prosesUploadKaryawan({target: {files: files}}); } 
    },
    prosesUploadKaryawan: function(event) { 
        const file = event.target.files[0]; if (!file) return; 
        Swal.fire({ title: 'Memproses...', text: 'Sedang membaca Excel...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        const reader = new FileReader(); 
        reader.onload = (e) => { 
            setTimeout(() => {
                try { 
                    const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); 
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: ""}); 
                    let added = 0, updated = 0; let startRow = -1; let hasJabatanCol = false; 
                    for(let i=0; i<Math.min(15, rows.length); i++) { 
                        if(!rows[i]) continue;
                        let str = rows[i].join(" ").toUpperCase(); 
                        if(str.includes("NAMA") && (str.includes("CABANG") || str.includes("ATTENDANCEID") || str.includes("NIK") || str.includes("ID"))) { 
                            startRow = i + 1; hasJabatanCol = rows[i].some(h => String(h).toUpperCase().trim() === "JABATAN"); break; 
                        } 
                    } 
                    if(startRow === -1) { Swal.fire("Format Ditolak", "Format file tidak sesuai template.", "error"); event.target.value = ''; return; }

                    for(let i = startRow; i < rows.length; i++) { 
                        let r = rows[i]; if(!r || r.length < 4) continue; 
                        let cab = String(r[1] || "").trim(); let attId = String(r[2] || "").trim(); let nikK = String(r[3] || "").trim(); let nm = String(r[4] || "").trim(); 
                        if(!nm || nm.toUpperCase() === "NAMA" || nm === "undefined") continue; 
                        
                        let joinIdx = hasJabatanCol ? 6 : 5; let jabatanUpdate = hasJabatanCol ? String(r[5] || "").trim() : undefined; 
                        let joinD = this.konversiTanggalExcel(r[joinIdx]); let endD = this.konversiTanggalExcel(r[joinIdx+1]); let termD = this.konversiTanggalExcel(r[joinIdx+2]); let renewD = this.konversiTanggalExcel(r[joinIdx+3]); 
                        
                        let existingIdx = this.dbKaryawan.findIndex(k => { return (String(k.nama).trim().toLowerCase() === nm.toLowerCase()) || (nikK !== "" && k.nik === nikK) || (attId !== "" && k.attendanceId === attId); }); 
                        
                        let finalJabatan = 'Staff'; 
                        if (jabatanUpdate && jabatanUpdate !== "undefined" && jabatanUpdate !== "") { finalJabatan = jabatanUpdate; } else if (existingIdx >= 0 && this.dbKaryawan[existingIdx].jabatan) { finalJabatan = this.dbKaryawan[existingIdx].jabatan; } 
                        let newIdKaryawan = attId || nikK || ('K-' + Date.now().toString() + i);
                        
                        let dt = { cabang: cab, attendanceId: attId, nik: nikK, nama: nm, jabatan: finalJabatan, idKaryawan: newIdKaryawan, tglAwal: joinD, tglAkhir: endD, tglTerminate: termD, tglPerpanjangan: renewD }; 
                        
                        if (existingIdx >= 0) { 
                            dt.uniqueId = this.dbKaryawan[existingIdx].uniqueId || this.dbKaryawan[existingIdx].idKaryawan || newIdKaryawan; 
                            dt.idKaryawan = this.dbKaryawan[existingIdx].idKaryawan || dt.idKaryawan;
                            dt.manualCutiObj = this.dbKaryawan[existingIdx].manualCutiObj || null; 
                            dt.pin1 = this.dbKaryawan[existingIdx].pin1 || ""; dt.pin2 = this.dbKaryawan[existingIdx].pin2 || ""; dt.pin3 = this.dbKaryawan[existingIdx].pin3 || ""; 
                            
                            dt.jenisNonAktif = this.dbKaryawan[existingIdx].jenisNonAktif || "";
                            dt.idBaru = this.dbKaryawan[existingIdx].idBaru || "";
                            dt.nikBaru = this.dbKaryawan[existingIdx].nikBaru || "";
                            dt.tglMulaiBaru = this.dbKaryawan[existingIdx].tglMulaiBaru || "";
                            dt.tglAkhirBaru = this.dbKaryawan[existingIdx].tglAkhirBaru || "";

                            this.dbKaryawan[existingIdx] = dt; updated++; 
                        } else { 
                            dt.uniqueId = 'K-' + Date.now().toString() + Math.random().toString(36).substr(2, 5); dt.manualCutiObj = null; dt.pin1 = ""; dt.pin2 = ""; dt.pin3 = ""; dt.jenisNonAktif = ""; dt.idBaru = ""; dt.nikBaru = ""; dt.tglMulaiBaru = ""; dt.tglAkhirBaru = ""; this.dbKaryawan.push(dt); added++; 
                        } 
                    } 
                    if(added === 0 && updated === 0) { Swal.fire("Info", "Tidak ada data valid.", "info"); event.target.value = ''; return; }
                    this.database.ref('karyawan').set(this.dbKaryawan); 
                    Swal.fire("Sukses", `Upload Karyawan Sukses!\n${added} Baru, ${updated} Diperbarui.`, "success"); 
                } catch(err) { Swal.fire("Error", "Gagal membaca file.", "error"); console.error(err); } 
                event.target.value = ''; 
            }, 300);
        }; 
        reader.readAsArrayBuffer(file); 
    },

    renderMasterCuti: function() { 
        const tbody = document.getElementById('bodyMatrixCuti'); 
        const thead = document.getElementById('headMatrixCuti'); 
        if(!tbody || !thead) return; 
        tbody.innerHTML = ''; 
        
        if (this.dbKaryawan.length === 0) return tbody.innerHTML = '<tr><td colspan="2">Belum ada data.</td></tr>'; 
        
        let minDate = new Date("2050-01-01"); let maxDate = new Date("1970-01-01"); let valid = false; 
        
        this.dbKaryawan.forEach(k => { 
            if(k && (k.tglPerpanjangan || k.tglAwal) && k.tglAkhir) { 
                let st = k.tglPerpanjangan ? new Date(k.tglPerpanjangan) : new Date(k.tglAwal); 
                let en = new Date(k.tglAkhir); 
                if(st < minDate) minDate = st; if(en > maxDate) maxDate = en; valid = true; 
            } 
        }); 
        
        if(!valid) { minDate = new Date(); maxDate = new Date(); maxDate.setMonth(maxDate.getMonth()+12); } 
        
        let headerHTML = '<tr><th>Nama Karyawan</th>'; 
        let tempDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1); 
        let endBound = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1); 
        let columns = []; 
        
        while(tempDate <= endBound && columns.length < 120) { 
            headerHTML += `<th>${tempDate.toLocaleString('id-ID', { month: 'short', year: '2-digit' })}</th>`; 
            columns.push(new Date(tempDate)); tempDate.setMonth(tempDate.getMonth() + 1); 
        } 
        headerHTML += '<th>Aksi Admin</th></tr>'; 
        thead.innerHTML = headerHTML; 
        
        this.dbKaryawan.forEach(k => { 
            if(!k || (!k.tglAwal && !k.tglPerpanjangan) || !k.tglAkhir) return; 
            let row = `<tr><td style="text-align:left; font-weight:bold;">${k.nama} <br><small style="color:#64748b;">${k.jabatan || ''}</small></td>`; 
            const startKontrak = new Date(k.tglPerpanjangan ? k.tglPerpanjangan : k.tglAwal); const endKontrak = new Date(k.tglAkhir); 
            let isTr = this.isTrainee(k.jabatan); 
            const totalHakCuti = isTr ? 0 : Math.min(Math.max(1, this.hitungBulan(k.tglPerpanjangan ? k.tglPerpanjangan : k.tglAwal, k.tglAkhir)), 12); 
            let defaultAlloc = {}; let endKey = this.getYearMonthKey(endKontrak); 
            
            if (isTr) { 
                defaultAlloc[endKey] = 0; 
            } else if (this.hitungBulan(k.tglAwal, k.tglAkhir) <= 12 || this.hitungBulan(k.tglPerpanjangan ? k.tglPerpanjangan : k.tglAwal, k.tglAkhir) < 11) { 
                defaultAlloc[endKey] = totalHakCuti; 
            } else { 
                let midDate = new Date(startKontrak); midDate.setMonth(midDate.getMonth() + Math.floor(this.hitungBulan(k.tglPerpanjangan ? k.tglPerpanjangan : k.tglAwal, k.tglAkhir) / 2)); 
                defaultAlloc[this.getYearMonthKey(midDate)] = Math.floor(totalHakCuti / 2); defaultAlloc[endKey] = Math.ceil(totalHakCuti / 2); 
            } 
            
            const activeAlloc = k.manualCutiObj || defaultAlloc; 
            const isEditing = (this.editCutiId === (k.uniqueId||k.idKaryawan)); 
            
            columns.forEach(colDate => { 
                let colKey = this.getYearMonthKey(colDate); let colTime = colDate.getFullYear() * 12 + colDate.getMonth(); 
                let startTime = startKontrak.getFullYear() * 12 + startKontrak.getMonth(); let endTime = endKontrak.getFullYear() * 12 + endKontrak.getMonth(); 
                
                if(colTime < startTime || colTime > endTime) { row += `<td class="cell-disabled"></td>`; } 
                else { 
                    let val = activeAlloc[colKey] !== undefined ? activeAlloc[colKey] : "";
                    if (isEditing && !isTr) { row += `<td><input type="number" class="input-cuti-edit" data-uid="${k.uniqueId||k.idKaryawan}" data-month="${colKey}" value="${val}" min="0" max="12" style="width: 45px; text-align: center; border: 1px solid #94a3b8; border-radius: 4px; padding: 2px; font-weight: 600;"></td>`; } 
                    else { row += `<td>${val !== "" && val > 0 ? `<b>${val} Hr</b>` : "-"}</td>`; }
                } 
            }); 
            
            if (isTr) { row += `<td><span style="font-size:10px; color:red;">Trainee</span></td>`; } 
            else if (isEditing) { row += `<td><button class="btn-success" style="padding: 2px 5px; font-size:10px; display:inline; width:auto;" onclick="app.simpanEditCuti('${k.uniqueId||k.idKaryawan}', ${totalHakCuti})">💾</button> <button class="btn-danger" style="padding: 2px 5px; font-size:10px; display:inline; width:auto;" onclick="app.batalEditCuti()">❌</button></td>`; } 
            else { row += `<td><button class="btn-warning" style="padding: 2px 5px; font-size:10px; display:inline; width:auto;" onclick="app.mulaiEditCuti('${k.uniqueId||k.idKaryawan}')">✏️</button> <button class="btn-danger" style="padding: 2px 5px; font-size:10px; display:inline; width:auto;" onclick="app.resetCuti('${k.uniqueId||k.idKaryawan}')">🔄</button></td>`; } 
            row += `</tr>`; tbody.innerHTML += row; 
        }); 
    },
    mulaiEditCuti: function(uid) { this.editCutiId = uid; this.renderMasterCuti(); }, 
    batalEditCuti: function() { this.editCutiId = null; this.renderMasterCuti(); },
    simpanEditCuti: function(uid, max) { 
        const inputs = document.querySelectorAll(`.input-cuti-edit[data-uid="${uid}"]`); let sum = 0; let newA = {}; 
        inputs.forEach(inp => { let v = parseInt(inp.value); if(!isNaN(v) && v > 0) { sum += v; newA[inp.dataset.month] = v; } }); 
        if(sum !== max) return Swal.fire('Gagal', `Total dialokasikan (${sum}) tidak sama dengan Hak Cuti (${max}).`, 'error'); 
        const idx = this.dbKaryawan.findIndex(x => x && (x.uniqueId === uid || x.idKaryawan === uid)); 
        if(idx !== -1) { this.dbKaryawan[idx].manualCutiObj = newA; this.editCutiId = null; this.database.ref('karyawan').set(this.dbKaryawan); } 
    },
    resetCuti: function(uid) { 
        const k = this.dbKaryawan.find(x => x && (x.uniqueId === uid || x.idKaryawan === uid)); if(!k) return; 
        if(confirm(`Kembalikan cuti otomatis?`)) { k.manualCutiObj = null; this.database.ref('karyawan').set(this.dbKaryawan); } 
    },

    // ==========================================
    // FITUR: SHIFT
    // ==========================================
    simpanShift: function() { 
        const k = document.getElementById('shiftKode').value.trim().toUpperCase(); const kEx = document.getElementById('shiftKodeExcel').value.trim().toUpperCase(); 
        if (!k) return Swal.fire('Error', 'Kode wajib diisi!', 'error'); 
        const btn = document.getElementById('btnSimpanShift'); const btnAsli = btn.innerHTML; btn.innerHTML = '⏳...'; btn.disabled = true; 
        let data = { id: this.editShiftId || Date.now().toString(), kode: k, kodeExcel: kEx, jamMasuk: document.getElementById('shiftMasuk').value, jamPulang: document.getElementById('shiftPulang').value, warnaBg: document.getElementById('shiftWarnaBg').value, warnaTeks: document.getElementById('shiftWarnaTeks').value }; 
        if (this.editShiftId) { const idx = this.dbShift.findIndex(s => s && s.id === this.editShiftId); if (idx !== -1) this.dbShift[idx] = data; } else { this.dbShift.push(data); } 
        this.database.ref('shift').set(this.dbShift).then(() => { btn.innerHTML = btnAsli; btn.disabled = false; Swal.fire({ title: 'Berhasil!', text: 'Shift berhasil disimpan!', icon: 'success', timer: 1500, showConfirmButton: false }); this.batalEditShift(); }); 
    },
    prosesEditShift: function(id) { 
        const s = this.dbShift.find(x => x && x.id === id); if(!s) return; this.editShiftId = id; 
        document.getElementById('shiftKode').value = s.kode || ''; document.getElementById('shiftKodeExcel').value = s.kodeExcel || ''; document.getElementById('shiftMasuk').value = s.jamMasuk || ''; document.getElementById('shiftPulang').value = s.jamPulang || ''; document.getElementById('shiftWarnaBg').value = s.warnaBg || '#dbeafe'; document.getElementById('shiftWarnaTeks').value = s.warnaTeks || '#1e40af'; 
        document.getElementById('titleMasterShift').innerText = "✏️ Edit Tipe Shift"; document.getElementById('formMasterShift').classList.add('edit-mode'); document.getElementById('btnSimpanShift').innerHTML = "Update"; document.getElementById('btnSimpanShift').classList.replace('btn-primary', 'btn-warning'); document.getElementById('btnBatalShift').style.display = "inline-block"; window.scrollTo({ top: 0, behavior: 'smooth' }); 
    },
    batalEditShift: function() { 
        this.editShiftId = null; document.getElementById('shiftKode').value = ''; document.getElementById('shiftKodeExcel').value = ''; document.getElementById('shiftMasuk').value = ''; document.getElementById('shiftPulang').value = ''; document.getElementById('shiftWarnaBg').value = '#dbeafe'; document.getElementById('shiftWarnaTeks').value = '#1e40af'; 
        document.getElementById('titleMasterShift').innerText = "⚙️ Buat / Edit Tipe Shift Baru"; document.getElementById('formMasterShift').classList.remove('edit-mode'); document.getElementById('btnSimpanShift').innerHTML = "Simpan"; document.getElementById('btnSimpanShift').classList.replace('btn-warning', 'btn-primary'); document.getElementById('btnBatalShift').style.display = "none"; 
    },
    renderTabelShift: function() { 
        const tb = document.getElementById('tabelShiftBody'); if(!tb) return; tb.innerHTML = ''; 
        this.dbShift.forEach((s, i) => { if(!s) return; tb.innerHTML += `<tr> <td>${i+1}</td> <td><b>${s.kode}</b></td> <td><span style="color:#f59e0b; font-weight:bold;">${s.kodeExcel || '-'}</span></td> <td>${s.jamMasuk||'-'} - ${s.jamPulang||'-'}</td> <td><span style="background:${s.warnaBg}; color:${s.warnaTeks}; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:11px;">${s.kode}</span></td> <td> <button class="btn-warning" style="padding:4px 8px; width:auto; display:inline; font-size:10px;" onclick="app.prosesEditShift('${s.id}')">Edit</button> <button class="btn-danger" style="padding:4px 8px; width:auto; display:inline; font-size:10px;" onclick="app.hapusMasterShift('${s.id}')">Del</button> </td> </tr>`; }); 
    },
    hapusMasterShift: function(id) { 
        Swal.fire({ title: 'Hapus Tipe Shift?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((result) => { if (result.isConfirmed) { this.dbShift = this.dbShift.filter(s => s && s.id !== id); this.database.ref('shift').set(this.dbShift).then(() => Swal.fire('Terhapus!', 'Tipe shift dihapus.', 'success')); } }); 
    },

    // ==========================================
    // FITUR: BANK & ATM
    // ==========================================
    simpanBank: function() { 
        const kode = document.getElementById('bankKode').value.trim().toUpperCase(); const nama = document.getElementById('bankNama').value.trim().toUpperCase(); 
        if (!kode || !nama) return Swal.fire('Error', 'Kode Singkatan dan Nama Bank wajib diisi!', 'error'); 
        const btn = document.getElementById('btnSimpanBank'); const btnAsli = btn.innerHTML; btn.innerHTML = '⏳...'; btn.disabled = true; 
        let data = { id: this.editBankId || Date.now().toString(), kode: kode, nama: nama }; 
        if (this.editBankId) { const idx = this.dbBank.findIndex(b => b && b.id === this.editBankId); if (idx !== -1) this.dbBank[idx] = data; } 
        else { if (this.dbBank.some(b => b && b.kode === kode)) { btn.innerHTML = btnAsli; btn.disabled = false; return Swal.fire('Error', 'Kode Bank tersebut sudah digunakan!', 'error'); } this.dbBank.push(data); } 
        this.database.ref('master_bank').set(this.dbBank).then(() => { btn.innerHTML = btnAsli; btn.disabled = false; Swal.fire({ title: 'Berhasil!', text: 'Bank/Vendor berhasil disimpan!', icon: 'success', timer: 1500, showConfirmButton: false }); this.batalEditBank(); }); 
    },
    prosesEditBank: function(id) { 
        const b = this.dbBank.find(x => x && x.id === id); if(!b) return; this.editBankId = id; 
        document.getElementById('bankKode').value = b.kode || ''; document.getElementById('bankNama').value = b.nama || ''; 
        document.getElementById('titleMasterBank').innerText = "✏️ Edit Bank / Vendor"; document.getElementById('formMasterBank').classList.add('edit-mode'); document.getElementById('btnSimpanBank').innerHTML = "Update Data"; document.getElementById('btnSimpanBank').classList.replace('btn-primary', 'btn-warning'); document.getElementById('btnBatalBank').style.display = "inline-block"; window.scrollTo({ top: 0, behavior: 'smooth' }); 
    },
    batalEditBank: function() { 
        this.editBankId = null; document.getElementById('bankKode').value = ''; document.getElementById('bankNama').value = ''; 
        document.getElementById('titleMasterBank').innerText = "🏦 Tambah / Edit Bank & Vendor"; document.getElementById('formMasterBank').classList.remove('edit-mode'); document.getElementById('btnSimpanBank').innerHTML = "Simpan"; document.getElementById('btnSimpanBank').classList.replace('btn-warning', 'btn-primary'); document.getElementById('btnBatalBank').style.display = "none"; 
    },
    renderTabelBank: function() { 
        const tb = document.getElementById('tabelBankBody'); if(!tb) return; tb.innerHTML = ''; 
        this.dbBank.forEach((b, i) => { 
            if(!b) return; 
            tb.innerHTML += `<tr> <td>${i+1}</td> <td><b>${b.kode}</b></td> <td>${b.nama}</td> <td> <button class="btn-warning" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.prosesEditBank('${b.id}')">Edit</button> <button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.hapusMasterBank('${b.id}')">Del</button> </td> </tr>`; 
        }); 
    },
    renderDropdownBank: function() { 
        let html = '<option value="">-- Pilih Bank --</option>'; 
        this.dbBank.forEach(b => { 
            if(b) { html += `<option value="${b.nama}">${b.nama} (${b.kode})</option>`; } 
        }); 
        const selAtm = document.getElementById('atmBank'); const selUpload = document.getElementById('pilihBankUpload'); 
        if(selAtm) { let val = selAtm.value; selAtm.innerHTML = html; selAtm.value = val; }
        if(selUpload) { let val = selUpload.value; selUpload.innerHTML = '<option value="">-- PILIH BANK DAHULU --</option>' + html.replace('<option value="">-- Pilih Bank --</option>', ''); selUpload.value = val; }
    },
    hapusMasterBank: function(id) { Swal.fire({ title: 'Hapus Bank?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((result) => { if (result.isConfirmed) { this.dbBank = this.dbBank.filter(b => b && b.id !== id); this.database.ref('master_bank').set(this.dbBank); } }); },
    unduhExcelBank: function() { 
        let exp = []; let rHeader = ["NO", "Kode Bank Singkatan", "Kode Bank Numerik", "Nama Bank Lengkap"]; exp.push(rHeader); 
        if (this.dbBank.length === 0) { exp.push([1, "BRI", "002", "BANK RAKYAT INDONESIA"]); } 
        else { let no = 1; this.dbBank.forEach(b => { if(!b) return; exp.push([ no++, b.kode || "", "", b.nama || "" ]); }); } 
        let ws = XLSX.utils.aoa_to_sheet(exp); let wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Master Klien"); XLSX.writeFile(wb, "Template_Master_Klien.xlsx"); 
    },

    simpanAtm: function() { 
        const wsid = document.getElementById('atmWsid').value.trim().toUpperCase(); const bank = document.getElementById('atmBank').value.trim(); const lokasi = document.getElementById('atmLokasi').value.trim(); const denom = parseInt(document.getElementById('atmDenom').value) || 0; const tipeAtm = document.getElementById('atmTipe').value.trim().toUpperCase(); 
        if (!wsid || !bank) return Swal.fire('Error!', 'WSID dan Nama Klien wajib diisi!', 'error'); 
        const btn = document.getElementById('btnSimpanAtm'); const btnAsli = btn.innerHTML; btn.innerHTML = '⏳...'; btn.disabled = true; 
        const data = { id: this.editAtmId || Date.now().toString(), wsid: wsid, bank: bank, lokasi: lokasi, denom: denom, merk: tipeAtm }; 
        if (this.editAtmId) { const idx = this.dbAtm.findIndex(a => a && a.id === this.editAtmId); if (idx !== -1) this.dbAtm[idx] = data; } else { this.dbAtm.push(data); } 
        this.database.ref('lokasi_atm').set(this.dbAtm).then(() => { btn.innerHTML = btnAsli; btn.disabled = false; Swal.fire({ title: 'Berhasil!', text: 'Lokasi ATM Disimpan!', icon: 'success', timer: 1500, showConfirmButton: false }); this.batalEditAtm(); }); 
    },
    prosesEditAtm: function(id) { 
        const a = this.dbAtm.find(x => x && x.id === id); if(!a) return; this.editAtmId = id; 
        document.getElementById('atmWsid').value = a.wsid || ''; document.getElementById('atmBank').value = a.bank || ''; document.getElementById('atmLokasi').value = a.lokasi || ''; document.getElementById('atmDenom').value = a.denom || ''; document.getElementById('atmTipe').value = a.merk || ''; 
        document.getElementById('titleMasterAtm').innerText = "✏️ Edit Mesin ATM"; document.getElementById('formMasterAtm').classList.add('edit-mode'); document.getElementById('btnSimpanAtm').innerHTML = "Update ATM"; document.getElementById('btnSimpanAtm').classList.replace('btn-primary', 'btn-warning'); document.getElementById('btnBatalAtm').style.display = "inline-block"; window.scrollTo({ top: 0, behavior: 'smooth' }); 
    },
    batalEditAtm: function() { 
        this.editAtmId = null; document.getElementById('atmWsid').value = ''; document.getElementById('atmBank').value = ''; document.getElementById('atmLokasi').value = ''; document.getElementById('atmDenom').value = ''; document.getElementById('atmTipe').value = ''; 
        document.getElementById('titleMasterAtm').innerText = "📍 Registrasi Mesin ATM Manual"; document.getElementById('formMasterAtm').classList.remove('edit-mode'); document.getElementById('btnSimpanAtm').innerHTML = "Simpan"; document.getElementById('btnSimpanAtm').classList.replace('btn-warning', 'btn-primary'); document.getElementById('btnBatalAtm').style.display = "none"; 
    },
    renderTabelAtm: function() { 
        const tb = document.getElementById('tabelAtmBody'); if(!tb) return; let html = ''; 
        this.dbAtm.forEach((a, i) => { 
            if(!a) return; 
            let labelDenom = a.denom === 0 ? '<span style="color:red; font-weight:bold;">2 Denom (0)</span>' : `Rp. ${a.denom.toLocaleString('id-ID')}`; 
            html += `<tr> <td>${i+1}</td> <td><b>${a.wsid}</b></td> <td>${a.bank || '-'}</td> <td style="white-space: normal; text-align: left;">${a.lokasi || '-'}</td> <td>${labelDenom}</td> <td><b>${a.merk || '-'}</b></td> <td> <button class="btn-warning" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.prosesEditAtm('${a.id}')">Edit</button> <button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.hapusMasterAtm('${a.id}')">Del</button> </td> </tr>`; 
        }); 
        tb.innerHTML = html; 
    },
    hapusMasterAtm: function(id) { Swal.fire({ title: 'Hapus ATM?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((result) => { if (result.isConfirmed) { this.dbAtm = this.dbAtm.filter(a => a && a.id !== id); this.database.ref('lokasi_atm').set(this.dbAtm); } }); },
    unduhExcelAtm: function() { 
        let exp = []; let rHeader = ["NO", "WSID", "LOKASI", "DENOM", "KETERANGAN", "TIPE"]; exp.push(rHeader); 
        if (this.dbAtm.length === 0) { exp.push([1, "01008454", "INDOMARET SOEKARNO HATTA", 50000, "", "NCR HITAM"]); } 
        else { let no = 1; this.dbAtm.forEach(a => { if(!a) return; exp.push([ no++, a.wsid || "", a.lokasi || "", a.denom || 0, "", a.merk || "" ]); }); } 
        let ws = XLSX.utils.aoa_to_sheet(exp); let wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Master Lokasi ATM"); XLSX.writeFile(wb, "Data_Master_ATM.xlsx"); 
    },
    triggerUploadAtm: function() {
        const selectedBank = document.getElementById('pilihBankUpload').value; 
        if(!selectedBank) { return Swal.fire("Peringatan!", "HARAP PILIH KLIEN / BANK PENGELOLA TERLEBIH DAHULU!", "warning"); }
        document.getElementById('uploadExcelAtm').click();
    },
    handleDragOverAtm: function(event) { 
        event.preventDefault(); 
        const selectedBank = document.getElementById('pilihBankUpload').value; 
        if(!selectedBank) { event.currentTarget.classList.remove('dragover'); } else { event.currentTarget.classList.add('dragover'); } 
    },
    handleDropAtm: function(event) { 
        event.preventDefault(); event.currentTarget.classList.remove('dragover'); 
        const selectedBank = document.getElementById('pilihBankUpload').value; 
        if(!selectedBank) { return Swal.fire("Peringatan!", "HARAP PILIH KLIEN / BANK PENGELOLA TERLEBIH DAHULU!", "warning"); } 
        const files = event.dataTransfer.files; 
        if(files.length > 0) { document.getElementById('uploadExcelAtm').files = files; app.prosesUploadAtm({target: {files: files}}); } 
    },
    prosesUploadAtm: function(event) { 
        const selectedBank = document.getElementById('pilihBankUpload').value; 
        if(!selectedBank) { Swal.fire("Peringatan!", "PILIH KLIEN / BANK PENGELOLA TERLEBIH DAHULU!", "warning"); event.target.value = ''; return; } 
        const file = event.target.files[0]; if (!file) return; 
        Swal.fire({ title: 'Memproses...', text: 'Sedang membaca Excel...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }}); 
        const reader = new FileReader(); 
        reader.onload = (e) => { 
            setTimeout(() => { 
                try { 
                    const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); 
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: ""}); 
                    let added = 0, updated = 0; let startRow = 1; 
                    for(let i=0; i < Math.min(15, rows.length); i++) { let str = rows[i].join(" ").toUpperCase(); if(str.includes("WSID") && str.includes("LOKASI")) { startRow = i + 1; break; } } 
                    
                    for(let i = startRow; i < rows.length; i++) { 
                        let r = rows[i]; if (!r || r.length < 2) continue; 
                        let wsid = String(r[1] || "").trim().toUpperCase(); if (!wsid || wsid === "WSID" || wsid.includes("KLIEN")) continue; 
                        let lokasi = String(r[2] || "").trim(); let denomRaw = String(r[3] || "").replace(/[^0-9]/g, ''); let denom = parseInt(denomRaw) || 0; let tipeAtm = String(r[5] || "").trim().toUpperCase(); 
                        
                        let dt = { wsid: wsid, bank: selectedBank, lokasi: lokasi, denom: denom, merk: tipeAtm }; 
                        let existingIdx = this.dbAtm.findIndex(a => a && a.wsid === wsid); 
                        
                        if (existingIdx >= 0) { dt.id = this.dbAtm[existingIdx].id; this.dbAtm[existingIdx] = dt; updated++; } 
                        else { dt.id = Date.now().toString() + Math.random().toString(36).substr(2, 5); this.dbAtm.push(dt); added++; } 
                    } 
                    if (added === 0 && updated === 0) { Swal.fire("Info", "Tidak ada data ATM yang valid ditemukan di dalam file Excel.", "info"); } 
                    else { this.database.ref('lokasi_atm').set(this.dbAtm).then(() => { Swal.fire("Sukses!", `Upload ATM Selesai!\n✅ ${added} Baru, 🔄 ${updated} Diperbarui.`, "success"); document.getElementById('pilihBankUpload').value = ""; }); }
                } catch(err) { Swal.fire("Gagal", "Format Excel tidak didukung atau terjadi kesalahan sistem.", "error"); } 
                event.target.value = ''; 
            }, 500); 
        }; reader.readAsArrayBuffer(file); 
    },

    // ==========================================
    // FITUR: PIN & HAK AKSES
    // ==========================================
    renderTabelPinKhusus: function() {
        const tb = document.getElementById('tabelPinKhususBody'); if(!tb) return; tb.innerHTML = ''; let count = 1;
        this.dbKaryawan.forEach(k => {
            if(k && (k.pin1 || k.pin2 || k.pin3)) {
                let idTampil = k.nik || k.attendanceId || k.idKaryawan || '-';
                tb.innerHTML += `<tr> <td>${count++}</td> <td><b>${idTampil}</b></td> <td style="text-align:left;">${k.nama}</td> <td>${k.pin1 ? `<span class="badge" style="background:#4f46e5;color:white;font-size:11px;">${k.pin1}</span>` : '-'}</td> <td>${k.pin2 ? `<span class="badge" style="background:#f59e0b;color:white;font-size:11px;">${k.pin2}</span>` : '-'}</td> <td>${k.pin3 ? `<span class="badge" style="background:#10b981;color:white;font-size:11px;">${k.pin3}</span>` : '-'}</td> <td><button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto;" onclick="app.resetPinPersonal('${k.uniqueId || k.idKaryawan}')">Reset ke Global</button></td> </tr>`;
            }
        });
        if(count === 1) tb.innerHTML = `<tr><td colspan="7" style="text-align:center;">Tidak ada karyawan yang menggunakan PIN Personal. Semua menggunakan PIN Global.</td></tr>`;
    },
    resetPinPersonal: function(uid) {
        let idx = this.dbKaryawan.findIndex(k => k && (k.uniqueId === uid || k.idKaryawan === uid));
        if(idx !== -1) {
            this.dbKaryawan[idx].pin1 = ""; this.dbKaryawan[idx].pin2 = ""; this.dbKaryawan[idx].pin3 = "";
            this.database.ref('karyawan').set(this.dbKaryawan).then(() => { Swal.fire('Di-reset!', 'PIN Personal dihapus.', 'success'); });
        }
    },
    
    renderCheckboxKategoriKasAkses: function() {
        const container = document.getElementById('containerCheckboxAksesKatKas');
        if (!container) return;
        container.innerHTML = '';

        if (!this.dbKasKategori || this.dbKasKategori.length === 0) {
            container.innerHTML = `<span style="color:#ef4444; font-size:11px; font-style:italic;">Belum ada Master Kategori Kas terdaftar.</span>`;
            return;
        }

        this.dbKasKategori.forEach(kat => {
            if (!kat) return;
            let kode = kat.kode || kat.nama;
            let nama = kat.nama || kat.kode;
            container.innerHTML += `
                <label class="checkbox-container" style="background:#f1f5f9; padding:6px 10px; border-radius:4px; border:1px solid #cbd5e1;">
                    <input type="checkbox" class="chk-akses-katkas" value="${kode}"> 
                    <span style="font-size:11px; font-weight:600; color:#0f172a;">💳 ${kode} - ${nama}</span>
                </label>`;
        });
    },

    renderDropdownAkses: function() { 
        let html = '<option value="">-- Pilih User --</option>'; html += '<option value="ALL|SEMUA KARYAWAN" style="color: #ef4444; font-weight: bold;">-- 🌟 TERAPKAN KE SELURUH KARYAWAN (HANYA YG AKTIF) --</option>'; 
        let today = new Date(); today.setHours(0,0,0,0);
        html += '<optgroup label="Data Karyawan (Aktif)">'; 
        this.dbKaryawan.forEach(k => { 
            if(k) { 
                let isTidakAktif = k.tglTerminate && new Date(k.tglTerminate) < today;
                if(!isTidakAktif) {
                    let kId = k.uniqueId || k.idKaryawan || k.nik || k.attendanceId; let labelId = k.nik || k.idKaryawan || '-'; 
                    html += `<option value="${kId}|${k.nama}">${k.nama} (NIK: ${labelId})</option>`; 
                }
            } 
        }); 
        html += '</optgroup><optgroup label="Data Bukan Karyawan">'; 
        this.dbBukanKaryawan.forEach(bk => { if(bk) { html += `<option value="${bk.id}|${bk.nama}">[NON] ${bk.nama} (ID: ${bk.id})</option>`; } }); 
        html += '</optgroup>';
        const el = document.getElementById('aksesKaryawan'); if(el) el.innerHTML = html; 
    },
    loadAksesKaryawan: function() { 
        document.querySelectorAll('.chk-akses').forEach(chk => chk.checked = false); 
        document.querySelectorAll('.chk-akses-katkas').forEach(chk => chk.checked = false); 
        document.getElementById('inputAksesTanpaPin').value = "false";

        let val = document.getElementById('aksesKaryawan').value; 
        if(!val || val.startsWith("ALL")) return; 
        
        let parts = val.split('|'); let idKaryawan = parts[0]; 
        let existing = this.dbAkses.find(a => a && a.idKaryawan === idKaryawan); 
        
        if(existing && existing.aksesList) { document.querySelectorAll('.chk-akses').forEach(chk => { if(existing.aksesList.includes(chk.value)) chk.checked = true; }); } 
        if(existing && existing.aksesKategoriKas) { document.querySelectorAll('.chk-akses-katkas').forEach(chk => { if(existing.aksesKategoriKas.includes(chk.value)) chk.checked = true; }); } 
        if(existing && existing.tanpaPin !== undefined) { document.getElementById('inputAksesTanpaPin').value = (existing.tanpaPin === true || existing.tanpaPin === "true") ? "true" : "false"; }
    },
    simpanAkses: function() { 
        let val = document.getElementById('aksesKaryawan').value; 
        if(!val) return Swal.fire('Oops', 'Pilih User terlebih dahulu!', 'warning'); 
        
        let parts = val.split('|'); let idKaryawan = parts[0]; let namaKaryawan = parts[1]; 
        let aksesTerpilih = []; let aksesKatKasTerpilih = []; 
        document.querySelectorAll('.chk-akses:checked').forEach(chk => aksesTerpilih.push(chk.value)); 
        document.querySelectorAll('.chk-akses-katkas:checked').forEach(chk => aksesKatKasTerpilih.push(chk.value)); 
        
        let pMap = { 
            pusat: parseInt(document.getElementById('mapPinPusat') ? document.getElementById('mapPinPusat').value : 1), 
            roster: parseInt(document.getElementById('mapPinRoster') ? document.getElementById('mapPinRoster').value : 1), 
            return: parseInt(document.getElementById('mapPinReturn') ? document.getElementById('mapPinReturn').value : 1), 
            kas: parseInt(document.getElementById('mapPinKas') ? document.getElementById('mapPinKas').value : 1), 
            khasanah: parseInt(document.getElementById('mapPinKhasanah') ? document.getElementById('mapPinKhasanah').value : 1),
            bca: parseInt(document.getElementById('mapPinBca') ? document.getElementById('mapPinBca').value : 1)
        };
        let tanpaPinVal = document.getElementById('inputAksesTanpaPin') ? (document.getElementById('inputAksesTanpaPin').value === 'true') : false;

        if (idKaryawan === "ALL") { 
            Swal.fire({ title: 'Terapkan Massal?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#8b5cf6' }).then((res) => { 
                if(res.isConfirmed) { 
                    let updateCount = 0; let todayActive = new Date(); todayActive.setHours(0,0,0,0);
                    this.dbKaryawan.forEach(k => { 
                        if(k) { 
                            let isTidakAktif = k.tglTerminate && new Date(k.tglTerminate) < todayActive;
                            if(!isTidakAktif) {
                                let kId = k.uniqueId || k.idKaryawan || k.nik || k.attendanceId; 
                                let existingIdx = this.dbAkses.findIndex(a => a && a.idKaryawan === kId); 
                                let data = { idAkses: kId, idKaryawan: kId, nama: k.nama, aksesList: aksesTerpilih, aksesKategoriKas: aksesKatKasTerpilih, pinMapping: pMap, tanpaPin: tanpaPinVal }; 
                                if (existingIdx !== -1) { this.dbAkses[existingIdx] = data; } else { this.dbAkses.push(data); } 
                                updateCount++; 
                            }
                        } 
                    }); 
                    this.database.ref('hak_akses').set(this.dbAkses).then(() => { Swal.fire('Berhasil!', `Diterapkan ke ${updateCount} karyawan!`, 'success'); }); 
                } 
            }); 
        } else { 
            let data = { idAkses: idKaryawan, idKaryawan: idKaryawan, nama: namaKaryawan, aksesList: aksesTerpilih, aksesKategoriKas: aksesKatKasTerpilih, pinMapping: pMap, tanpaPin: tanpaPinVal }; 
            let existingIdx = this.dbAkses.findIndex(a => a && a.idKaryawan === idKaryawan); 
            if (existingIdx !== -1) { this.dbAkses[existingIdx] = data; } else { this.dbAkses.push(data); } 
            this.database.ref('hak_akses').set(this.dbAkses).then(() => { Swal.fire('Tersimpan', `Hak akses ${namaKaryawan} diperbarui!`, 'success'); }); 
        } 
    },
    hapusAkses: function(idKaryawan) { 
        this.dbAkses = this.dbAkses.filter(a => a && a.idKaryawan !== idKaryawan); 
        this.database.ref('hak_akses').set(this.dbAkses).then(() => { Swal.fire('Berhasil!', 'Hak akses telah dicabut.', 'success'); }); 
    },

    renderTabelAkses: function() { 
        const tb = document.getElementById('tabelAksesBody'); if(!tb) return; tb.innerHTML = ''; 
        this.dbAkses.forEach((a, i) => { 
            if(!a) return; 
            
            let kInfo = this.dbKaryawan.find(x => x && (x.uniqueId === a.idKaryawan || x.idKaryawan === a.idKaryawan)); 
            let displayId = kInfo ? (kInfo.nik || kInfo.attendanceId || kInfo.idKaryawan) : a.idKaryawan; 
            let namaUser = a.nama || (kInfo ? kInfo.nama : "Tidak Diketahui");
            
            // Format warna badge sesuai warna di master-akses.js
            let badges = a.aksesList && a.aksesList.length > 0 ? a.aksesList.map(modulKode => { 
                let warna = "#64748b"; // Warna default abu-abu
                if (typeof MASTER_HAK_AKSES !== 'undefined') {
                    for (let m of MASTER_HAK_AKSES) {
                        if (m.akses.some(x => x.kode === modulKode)) { warna = m.warna; break; }
                    }
                }
                return `<span style="background:${warna}; color:white; padding:4px 6px; border-radius:4px; font-size:10px; margin:2px; display:inline-block; white-space: nowrap;">${modulKode}</span>`; 
            }).join('') : '<span style="color:#64748b; font-size: 11px;">Belum ada akses modul</span>'; 
            
            let badgesKatKas = (a.aksesKategoriKas && a.aksesKategoriKas.length > 0) ? a.aksesKategoriKas.map(kode => { 
                return `<span style="background:#0f172a; color:white; padding:4px 6px; border-radius:4px; font-size:10px; margin:2px; display:inline-block; white-space: nowrap;">💳 ${kode}</span>`; 
            }).join('') : '<span style="color:#94a3b8; font-size:10px;">-</span>'; 
            
            let pMapText = a.pinMapping ? `<div style="font-size:10px; color:#475569; line-height:1.6; min-width: 130px;">
                Pusat: <b>PIN ${a.pinMapping.pusat||1}</b> | Roster: <b>PIN ${a.pinMapping.roster||1}</b><br>
                Retur: <b>PIN ${a.pinMapping.return||1}</b> | Kas: <b>PIN ${a.pinMapping.kas||1}</b><br>
                Khas: <b>PIN ${a.pinMapping.khasanah||1}</b> | BCA: <b>PIN ${a.pinMapping.bca||1}</b>
            </div>` : `<span style="font-size:10px; color:#475569;">PIN 1 (Utama)</span>`;
            
            let statusBypass = (a.tanpaPin === true || a.tanpaPin === "true") ? '<span style="color:#10b981; font-weight:bold;">YA</span>' : '<span style="color:#64748b; font-size: 11px;">TIDAK</span>';
            
            tb.innerHTML += `<tr> 
                <td>${i+1}</td> 
                <td style="text-align:left; line-height: 1.4;"><b>${displayId}</b><br><small style="color: #64748b;">${namaUser}</small></td> 
                <td style="text-align:left; max-width: 250px; white-space: normal;">${badges}</td> 
                <td style="text-align:left;">${pMapText}</td> 
                <td style="text-align:left; max-width: 150px; white-space: normal;">${badgesKatKas}</td> 
                <td>${statusBypass}</td> 
                <td><button class="btn-danger" style="padding:4px 8px; font-size:10px; width:auto; display:inline;" onclick="app.hapusAkses('${a.idKaryawan}')">Cabut</button></td> 
            </tr>`; 
        }); 

        if (this.dbAkses.length === 0) tb.innerHTML = `<tr><td colspan="7" style="text-align:center;">Belum ada hak akses khusus yang diatur.</td></tr>`;
    }
};

document.addEventListener('DOMContentLoaded', () => { app.init(); });