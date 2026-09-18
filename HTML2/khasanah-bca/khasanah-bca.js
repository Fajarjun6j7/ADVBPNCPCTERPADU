// ==========================================
// FILE: khasanah bca.js
// FUNGSI: Logika Utama Modul Khasanah BCA (Terintegrasi RBAC Global, DUAL MODE, & EXCEL DYNAMIC COLUMN)
// ==========================================

window.bcaInitialized = false;
window.currentActiveTabBCA = 'fisik-prosesan';

// Status Dual Mode (Utama vs Titipan)
window.currentGlobalMode = 'utama'; // 'utama' atau 'titipan'
window.activeFisikSubTabs = { utama: '', titipan: '' };
window.h1DataRp = { utama: {}, titipan: {} };
window.h1InputMode = { utama: 'otomatis', titipan: 'otomatis' };

// Penyimpanan Data Excel Global untuk Pilihan Kolom
window.excelRowsData = { utama: null, titipan: null };
window.excelHeaderRowIdx = { utama: -1, titipan: -1 };
window.excelDenomColIdx = { utama: -1, titipan: -1 };

window.currentModalDenom = 0;
window.currentModalType = 'kertas';
window.currentModalArea = '';
window.currentRealtimeAkses = null;

const currentUser = typeof AuthHelper !== 'undefined' ? AuthHelper.checkAccess() : null;
const database = typeof db !== 'undefined' ? db : (typeof firebase !== 'undefined' && firebase.apps.length ? firebase.database() : null);

const denomsBca = [
    { type: 'divider', label: 'UANG KERTAS' },
    { val: 100000, emisi: '2022' }, { val: 100000, emisi: '2016' }, { val: 100000, emisi: '2014' }, { val: 100000, emisi: '2004' },
    { val: 75000, emisi: '2020' },
    { val: 50000, emisi: '2022' }, { val: 50000, emisi: '2016' }, { val: 50000, emisi: '2005' },
    { val: 20000, emisi: '2022' }, { val: 20000, emisi: '2016' }, { val: 20000, emisi: '2004' },
    { val: 10000, emisi: '2022' }, { val: 10000, emisi: '2016' }, { val: 10000, emisi: '2010' },
    { val: 5000, emisi: '2022' }, { val: 5000, emisi: '2016' }, { val: 5000, emisi: '2001' },
    { val: 2000, emisi: '2022' }, { val: 2000, emisi: '2016' }, { val: 2000, emisi: '2009' },
    { val: 1000, emisi: '2022' }, { val: 1000, emisi: '2016' }, { val: 1000, emisi: '2000' },
    { type: 'divider', label: 'UANG KOIN' },
    { val: 1000, emisi: '2016' }, { val: 1000, emisi: '2010' },
    { val: 500, emisi: '2016' }, { val: 500, emisi: '2003' },
    { val: 200, emisi: '2016' }, { val: 200, emisi: '2003' },
    { val: 100, emisi: '2016' }, { val: 100, emisi: '1999' },
    { val: 50, emisi: '1999' }
];

const kertasUniques = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000];
const koinUniques = [1000, 500, 200, 100, 50];
const denomColors = { 
    100000: '#ef4444', 75000: '#a855f7', 50000: '#3b82f6', 20000: '#22c55e', 
    10000: '#ef4444', 5000: '#eab308', 2000: '#64748b', 1000: '#a3e635', 
    500: '#f59e0b', 200: '#d97706', 100: '#b45309', 50: '#78350f' 
};
const btnGradients = ['#0f766e', '#c2410c', '#be123c', '#4d7c0f', '#4338ca', '#b45309'];
let tabCounter = 0;

// ==========================================
// 2. INISIALISASI & VALIDASI HAK AKSES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (!window.bcaInitialized) {
        if (database) {
            database.ref('hak_akses').on('value', snap => {
                let d = snap.val();
                let dbAkses = Array.isArray(d) ? d : (d ? Object.values(d) : []);
                
                if (currentUser && currentUser.idKaryawan) {
                    window.currentRealtimeAkses = dbAkses.find(a => a && a.idKaryawan === currentUser.idKaryawan) || null;
                }

                if (!window.bcaLoadedDOM) {
                    initSystemBCA();
                    window.bcaLoadedDOM = true;
                }
                terapkanUIAksesBCA(); 
            });
        } else {
            initSystemBCA(); 
            terapkanUIAksesBCA();
        }
        window.bcaInitialized = true;
    }
});

function cekAksesBCA(kodeAkses) {
    if (typeof AuthHelper === 'undefined') return false;
    return AuthHelper.cekAkses(kodeAkses, window.currentRealtimeAkses);
}

function terapkanUIAksesBCA() {
    if (!currentUser) return;
    
    if (!cekAksesBCA('bca_view') && !cekAksesBCA('bca_input')) {
        if (typeof Swal !== 'undefined') {
            Swal.fire("Ditolak!", "Anda tidak memiliki hak akses melihat Modul BCA.", "error").then(() => window.location.href = '../portal/index.html');
        } else {
            window.location.href = '../portal/index.html';
        }
        return;
    }

    const divEod = document.getElementById('div-bca-eod');
    if (divEod) divEod.style.display = cekAksesBCA('bca_eod') ? 'block' : 'none';
    
    const navKroscek = document.getElementById('btn-kroscek');
    if (navKroscek) navKroscek.style.display = cekAksesBCA('bca_kroscek') ? 'block' : 'none';
    
    const navCetak = document.getElementById('btn-bca-cetak-export');
    if (navCetak) navCetak.style.display = cekAksesBCA('bca_view') ? 'block' : 'none';

    const canInput = cekAksesBCA('bca_input');
    const canEdit = cekAksesBCA('bca_edit');
    const canHapus = cekAksesBCA('bca_hapus');

    const btnAddAction = document.getElementById('btn-action-add');
    if (btnAddAction) btnAddAction.style.display = canInput ? 'inline-block' : 'none';
    const btnEditAction = document.getElementById('btn-action-edit');
    if (btnEditAction) btnEditAction.style.display = canEdit ? 'inline-block' : 'none';
    const btnDelAction = document.getElementById('btn-action-del');
    if (btnDelAction) btnDelAction.style.display = canHapus ? 'inline-block' : 'none';

    if (!canInput && !canEdit) {
        document.querySelectorAll('.btn-detail').forEach(btn => btn.style.display = 'none');
        document.querySelectorAll('.in-val, .pending-input, .pemakaian-input').forEach(inp => {
            inp.readOnly = true; 
            inp.style.pointerEvents = 'none'; 
            inp.style.background = 'transparent';
        });
        document.querySelectorAll('input[name^="h1_mode"]').forEach(r => r.disabled = true);
        document.querySelectorAll('.btn-upload-h1').forEach(btn => btn.style.display = 'none');
    }
}

function initSystemBCA() {
    let bcaModule = document.getElementById('bca-module');
    if(bcaModule) { 
        bcaModule.style.display = 'flex'; 
        bcaModule.classList.add('active-desktop'); 
    }
    
    if(!document.getElementById('bca-sticky-style')) {
        let style = document.createElement('style');
        style.id = 'bca-sticky-style';
        style.innerHTML = `
            .top-action-bar { position: sticky; top: 0; z-index: 99; background: #ffffff; padding: 15px 25px; margin: -20px -20px 25px -20px; border-radius: 0 0 10px 10px; border-bottom: 1px solid #e2e8f0; } 
            @media (max-width: 768px) { .top-action-bar { top: 50px; } }
        `;
        document.head.appendChild(style);
    }
    renderTabsBCA(); 
    openTabBCA('fisik-prosesan');
}

function switchGlobalMode(mode) {
    window.currentGlobalMode = mode;
    document.getElementById('btn-global-utama').classList.remove('active');
    document.getElementById('btn-global-titipan').classList.remove('active');
    document.getElementById(`btn-global-${mode}`).classList.add('active');

    document.querySelectorAll('.mode-wrapper').forEach(el => el.classList.remove('active'));
    document.getElementById(`wrapper-${mode}`).classList.add('active');

    openTabBCA(window.currentActiveTabBCA);
    calculateClosing(mode);
}

function renderTabsBCA() {
    const container = document.getElementById('tab-container-bca');
    if(!container) return;
    
    container.innerHTML = '';
    ['utama', 'titipan'].forEach(mode => {
        let displayClass = mode === 'utama' ? 'active' : '';
        container.innerHTML += `
            <div id="wrapper-${mode}" class="mode-wrapper ${displayClass}">
                <div id="tab-bca-fisik-prosesan-${mode}" class="tab-content">
                    <div class="table-tabs-header" id="fisik-tabs-header-${mode}"></div>
                    <div id="fisik-subtab-container-${mode}"></div>
                </div>
                <div id="tab-bca-pending-sortir-${mode}" class="tab-content">
                    ${createPendingTable(mode)}
                    <div class="grand-total" style="text-align:right; font-size:20px; font-weight:bold; margin-top:15px; padding:15px; background:#f8fafc; border:2px solid #cbd5e1; border-radius:8px;">
                        Grand Total Pending: <span id="grand-pending-sortir-${mode}" style="color:#ef4444;">Rp 0</span>
                    </div>
                </div>
                <div id="tab-bca-pemakaian-uang-${mode}" class="tab-content">
                    ${createSingleDenomTable('pemakaian', 'INPUTAN PEMAKAIAN UANG', ['SETOR ATM', 'BRINKS'], '#fce7f3', mode)}
                    <div class="grand-total" style="text-align:right; font-size:20px; font-weight:bold; margin-top:15px; padding:15px; background:linear-gradient(135deg, #c026d3, #db2777); color:white; border-radius:8px;">
                        Grand Total Pemakaian: <span id="grand-pemakaian-uang-${mode}">Rp 0</span>
                    </div>
                </div>
                <div id="tab-bca-saldo-khasanah-${mode}" class="tab-content">
                    ${createClosingKhasanahTable(mode)}
                    <div class="bottom-total-banner" id="bottom-khasanah-total-${mode}" style="background-color: #fde047; border: 2px solid #1e293b; padding: 15px 25px; text-align: right; font-size: 20px; font-weight: 900; color: #000000; border-radius: 6px; margin-top: 20px;">
                        GRAND TOTAL SELISIH : Rp 0
                    </div>
                </div>
                <div id="tab-bca-kroscek-${mode}" class="tab-content">
                    ${createKroscekTable(mode)}
                </div>
                <div id="tab-bca-cetak-export-${mode}" class="tab-content">
                    ${createCetakBCATable(mode)}
                </div>
            </div>
        `;
    });

    const initialUtamaTabs = [ 
        { id: 'u-dalam-kerangkeng', name: 'Dalam Kerangkeng' }, 
        { id: 'u-luar-kerangkeng', name: 'Luar Kerangkeng' }, 
        { id: 'u-meja-delivery', name: 'Meja Delivery' } 
    ];
    const initialTitipanTabs = [ 
        { id: 't-titipan-awal', name: 'Data Titipan' } 
    ];
    
    initialUtamaTabs.forEach(t => addFisikSubTab(t.id, t.name, 'utama'));
    initialTitipanTabs.forEach(t => addFisikSubTab(t.id, t.name, 'titipan'));
    
    if(initialUtamaTabs.length > 0) openFisikSubTab(initialUtamaTabs[0].id, 'utama');
    if(initialTitipanTabs.length > 0) openFisikSubTab(initialTitipanTabs[0].id, 'titipan');

    terapkanUIAksesBCA(); 
}

function openTabBCA(tabId) {
    if(tabId === 'kroscek' && !cekAksesBCA('bca_kroscek')) return Swal.fire("Ditolak", "Anda tidak memiliki akses menu Kroscek.", "warning");

    window.currentActiveTabBCA = tabId;
    let modeLabel = window.currentGlobalMode === 'utama' ? 'UTAMA' : 'TITIPAN';
    
    document.querySelectorAll('#bca-module .nav-link').forEach(el => el.classList.remove('active'));
    let activeNav = Array.from(document.querySelectorAll('#bca-module .nav-link')).find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${tabId}'`));
    if (activeNav) activeNav.classList.add('active');

    const titles = { 
        'fisik-prosesan': 'Inputan Fisik Prosesan', 
        'pending-sortir': 'Pending Unsortir', 
        'pemakaian-uang': 'Pemakaian Uang', 
        'saldo-khasanah': 'Saldo Khasanah BCA', 
        'kroscek': 'Kroscek BCA & Excel', 
        'cetak-export': 'Cetak / Export Laporan BCA' 
    };
    const titleEl = document.getElementById('page-title-bca');
    if (titleEl && titles[tabId]) titleEl.innerText = `${titles[tabId]} [${modeLabel}]`;

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    let targetTab = document.getElementById(`tab-bca-${tabId}-${window.currentGlobalMode}`);
    if(targetTab) targetTab.classList.add('active');

    const actionGroup = document.getElementById('action-buttons-group');
    if (actionGroup) {
        if (['fisik-prosesan', 'pending-sortir', 'pemakaian-uang'].includes(tabId) && (cekAksesBCA('bca_input') || cekAksesBCA('bca_edit') || cekAksesBCA('bca_hapus'))) {
            actionGroup.style.display = 'flex';
            const btnAdd = document.getElementById('btn-action-add');
            const btnEdit = document.getElementById('btn-action-edit');
            const btnDel = document.getElementById('btn-action-del');
            
            if (tabId === 'fisik-prosesan') {
                if(btnAdd) btnAdd.innerHTML = '➕ Tambah Area'; 
                if(btnEdit) btnEdit.innerHTML = '✏️ Edit Area'; 
                if(btnDel) btnDel.innerHTML = '❌ Hapus Area';
            } else {
                if(btnAdd) btnAdd.innerHTML = '➕ Tambah Kolom'; 
                if(btnEdit) btnEdit.innerHTML = '✏️ Edit Kolom'; 
                if(btnDel) btnDel.innerHTML = '❌ Hapus Kolom';
            }
        } else {
            actionGroup.style.display = 'none';
        }
    }
    
    if (window.innerWidth <= 768) { 
        let sidebar = document.querySelector('#bca-module .sidebar'); 
        if(sidebar) sidebar.classList.remove('active'); 
    }
    
    if (['saldo-khasanah', 'kroscek', 'cetak-export'].includes(tabId)) { 
        calculateClosing(window.currentGlobalMode); 
    }
}

// ==========================================
// 3. GENERATOR TABEL HTML
// ==========================================
function formatRupiah(number) {
    let isNeg = number < 0; let absNum = Math.abs(number);
    let formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(absNum);
    return isNeg ? "(" + formatted + ")" : formatted;
}

function addFisikSubTab(id, name, mode) {
    const headerContainer = document.getElementById(`fisik-tabs-header-${mode}`); 
    const contentContainer = document.getElementById(`fisik-subtab-container-${mode}`);
    if(!headerContainer || !contentContainer) return;
    
    const btn = document.createElement('button'); 
    btn.className = 'table-tab-btn'; 
    btn.id = `btn-subtab-${id}`; 
    btn.style.background = btnGradients[tabCounter % btnGradients.length]; 
    btn.innerText = name; 
    btn.onclick = () => openFisikSubTab(id, mode);
    headerContainer.appendChild(btn);
    
    const contentDiv = document.createElement('div'); 
    contentDiv.className = 'subtab-content'; 
    contentDiv.id = `subtab-${id}`; 
    contentDiv.innerHTML = generateTableHTML(`${name} [${mode.toUpperCase()}]`, id);
    contentContainer.appendChild(contentDiv); 
    
    tabCounter++; 
    terapkanUIAksesBCA(); 
}

function openFisikSubTab(id, mode) {
    window.activeFisikSubTabs[mode] = id;
    document.querySelectorAll(`#fisik-tabs-header-${mode} .table-tab-btn`).forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll(`#fisik-subtab-container-${mode} .subtab-content`).forEach(content => content.classList.remove('active'));
    
    const btn = document.getElementById(`btn-subtab-${id}`); 
    const content = document.getElementById(`subtab-${id}`);
    if(btn) btn.classList.add('active'); 
    if(content) content.classList.add('active');
}

function generateTableHTML(title, areaId) {
    let html = generateQuickInputHTML(areaId);
    html += `
        <div class="table-wrapper">
            <div class="table-title" style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 10px; border-left: 5px solid #3b82f6; padding-left: 12px; text-transform: uppercase;">🗂️ ${title}</div>
            <table id="table-${areaId}" style="width: 100%; border-collapse: collapse; font-size: 11px; min-width: 1300px; border: 2px solid #1e293b; border-radius: 8px; margin-bottom: 25px;">
                <thead>
                    <tr>
                        <th rowspan="2" style="font-weight: 600; background-color: #1e293b; color: #f8fafc; text-transform: uppercase; font-size: 10px; border: 1px solid #475569; padding: 6px 8px; text-align: center;">Pecahan / Denom</th>
                        <th rowspan="2" style="font-weight: 600; background-color: #1e293b; color: #f8fafc; text-transform: uppercase; font-size: 10px; border: 1px solid #475569; padding: 6px 8px; text-align: center;">Tahun Emisi</th>
                        <th colspan="6" style="font-weight: 600; background-color: #1e293b; color: #f8fafc; text-transform: uppercase; font-size: 10px; border: 1px solid #475569; padding: 6px 8px; text-align: center;">Kondisi Fisik</th>
                        <th rowspan="2" style="font-weight: 600; background-color: #1e293b; color: #f8fafc; text-transform: uppercase; font-size: 10px; border: 1px solid #475569; padding: 6px 8px; text-align: center;">Total (Rp)</th>
                    </tr>
                    <tr>
                        <th style="background-color: #334155; color: #f8fafc; border: 1px solid #475569; padding: 6px 8px; text-align: center;">Gress BI</th>
                        <th style="background-color: #334155; color: #f8fafc; border: 1px solid #475569; padding: 6px 8px; text-align: center;">ULE</th>
                        <th style="background-color: #334155; color: #f8fafc; border: 1px solid #475569; padding: 6px 8px; text-align: center;">UTLE</th>
                        <th style="background-color: #334155; color: #f8fafc; border: 1px solid #475569; padding: 6px 8px; text-align: center;">RRM / Rusak</th>
                        <th style="background-color: #334155; color: #f8fafc; border: 1px solid #475569; padding: 6px 8px; text-align: center;">Buntut UTLE</th>
                        <th style="background-color: #334155; color: #f8fafc; border: 1px solid #475569; padding: 6px 8px; text-align: center;">Buntut Rusak</th>
                    </tr>
                </thead>
                <tbody>
    `;
    let lastVal = null; 
    let colorIndex = 0; 
    let isKertas = true;
    let denomCounts = {}; 
    let tempType = 'kertas';
    
    denomsBca.forEach(item => { 
        if (item.type === 'divider') {
            tempType = item.label.includes('KERTAS') ? 'kertas' : 'koin';
        } else if(item.val) {
            denomCounts[tempType + '_' + item.val] = (denomCounts[tempType + '_' + item.val] || 0) + 1; 
        }
    });

    let inputStyling = `width: 100%; min-width: 75px; box-sizing: border-box; padding: 4px 6px; height: 28px; border-radius: 4px; background: rgba(255,255,255,0.25); text-align: right; font-family: inherit; font-size: 12px; font-weight: 700; color: #0f172a; outline: none; border: 1px dashed #ffffff; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);`;

    denomsBca.forEach((item) => {
        if (item.type === 'divider') {
            isKertas = item.label.includes('KERTAS');
            html += `<tr><td colspan="9" class="section-divider" style="background:#1e293b; color:white; font-weight:bold; font-size:14px; text-align:center;">${item.label}</td></tr>`;
            lastVal = null; 
        } else {
            let isFirst = (lastVal !== item.val);
            if (isFirst) { colorIndex = (colorIndex + 1) % 5; } else if (lastVal === null) { colorIndex = 0; }
            let rowClass = 'denom-group-' + colorIndex; 
            if (isFirst) rowClass += ' denom-separator';
            
            lastVal = item.val; 
            let typeKey = isKertas ? 'kertas' : 'koin';
            let bgCol = '#ffffff', fontCol = '#0f172a';
            
            if(colorIndex===0){ bgCol='#6ee7b7'; fontCol='#064e3b'; } 
            else if(colorIndex===1){ bgCol='#fdba74'; fontCol='#7c2d12'; } 
            else if(colorIndex===2){ bgCol='#fda4af'; fontCol='#881337'; } 
            else if(colorIndex===3){ bgCol='#bef264'; fontCol='#3f6212'; } 
            else if(colorIndex===4){ bgCol='#a5b4fc'; fontCol='#312e81'; }
            
            let rSpan = denomCounts[typeKey + '_' + item.val];

            html += `<tr class="${rowClass} fisik-data-row" data-denom="${item.val}" data-emisi="${item.emisi}" data-type="${typeKey}" style="background-color:${bgCol}; color:${fontCol};">`;
            
            if (isFirst) {
                html += `<td rowspan="${rSpan}" class="denom-col" style="font-weight: 800; text-align: left; padding-left: 10px; width: 110px; font-size: 14px; vertical-align: middle; border: 1px solid #94a3b8;">${formatRupiah(item.val)}</td>`;
            }
            
            html += `<td class="emisi-col" style="font-weight: 700; width: 70px; border: 1px solid #94a3b8; text-align: center;">${item.emisi}</td>`;
            html += `<td style="border: 1px solid #94a3b8; padding: 6px 8px;"><input type="number" min="0" value="0" class="in-val gress" readonly tabindex="-1" oninput="calculate(this)" style="${inputStyling}"></td>`;
            html += `<td style="border: 1px solid #94a3b8; padding: 6px 8px;"><input type="number" min="0" value="0" class="in-val ule" readonly tabindex="-1" oninput="calculate(this)" style="${inputStyling}"></td>`;
            html += `<td style="border: 1px solid #94a3b8; padding: 6px 8px;"><input type="number" min="0" value="0" class="in-val utle" readonly tabindex="-1" oninput="calculate(this)" style="${inputStyling}"></td>`;
            html += `<td style="border: 1px solid #94a3b8; padding: 6px 8px;"><input type="number" min="0" value="0" class="in-val rusak" readonly tabindex="-1" oninput="calculate(this)" style="${inputStyling}"></td>`;
            
            if (isFirst) {
                html += `<td rowspan="${rSpan}" style="border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: middle;"><input type="number" min="0" value="0" class="in-val buntut-utle" readonly tabindex="-1" oninput="calculate(this)" style="${inputStyling}"></td>`;
                html += `<td rowspan="${rSpan}" style="border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: middle;"><input type="number" min="0" value="0" class="in-val buntut-rusak" readonly tabindex="-1" oninput="calculate(this)" style="${inputStyling}"></td>`;
                html += `<td rowspan="${rSpan}" style="border: 1px solid #94a3b8; padding: 6px 8px; vertical-align: middle;"><input type="text" value="Rp 0" class="readonly-input out-total" readonly tabindex="-1" style="background-color: transparent !important; font-weight: 800; border: none !important; text-align: right; font-size: 13px; cursor: default; min-width: 140px !important; color:${fontCol} !important;"></td>`;
            }
            html += `</tr>`;
        }
    });
    html += `</tbody></table></div>`;
    return html;
}

function generateQuickInputHTML(areaId) {
    let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">
        <h3 style="margin:0; font-size: 18px; color: #1e293b; font-weight: 900;">⚡ PENGINPUTAN CEPAT</h3>
        <div style="background: #0ea5e9; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 800; font-size: 16px; box-shadow: 0 4px 6px rgba(14,165,233,0.3);">
            GRAND TOTAL: <span id="qi-grand-${areaId}">Rp 0</span>
        </div>
    </div>
    <div class="quick-input-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; padding: 25px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">`;
    
    html += `<div class="qi-section"><h3 style="border-bottom:2px solid #e2e8f0; padding-bottom:8px; font-size: 16px; margin-top: 0; margin-bottom: 15px; color: #334155; text-transform: uppercase; font-weight: 800;">UANG KERTAS</h3>`;
    kertasUniques.forEach(val => {
        let color = denomColors[val] || '#94a3b8'; let label = (val >= 1000) ? (val/1000) + 'K' : val;
        html += `
        <div class="qi-row" data-denom="${val}" style="display: flex; gap: 15px; align-items: center; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden;">
            <div class="qi-badge" style="background: ${color}; width: 85px; text-align: center; padding: 10px 0; border-radius: 20px; color: white; font-weight: 900; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); flex-shrink: 0;">${label}</div>
            <button class="btn-detail" onclick="openDetailModal('${areaId}', ${val}, 'KERTAS ${label}', 'kertas')" style="background: #475569; color: white; border: none; padding: 10px 25px; border-radius: 20px; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0; width: auto !important; height: auto !important;">Isi Detail Fisik</button>
            <div class="qi-val" id="qi-val-${areaId}-kertas-${val}" style="margin-left: auto; font-weight: 800; font-size: 14px; color: #0f172a; background: #e2e8f0; padding: 6px 12px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; min-width: 95px; text-align: center;">0 Lembar</div>
        </div>`;
    });
    
    html += `</div><div class="qi-section"><h3 style="border-bottom:2px solid #e2e8f0; padding-bottom:8px; font-size: 16px; margin-top: 0; margin-bottom: 15px; color: #334155; text-transform: uppercase; font-weight: 800;">UANG KOIN</h3>`;
    koinUniques.forEach(val => {
        let color = denomColors[val] || '#94a3b8';
        html += `
        <div class="qi-row" data-denom="${val}" style="display: flex; gap: 15px; align-items: center; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden;">
            <div class="qi-badge" style="background: ${color}; width: 85px; text-align: center; padding: 10px 0; border-radius: 20px; color: white; font-weight: 900; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); flex-shrink: 0;">${val}</div>
            <button class="btn-detail" onclick="openDetailModal('${areaId}', ${val}, 'KOIN ${val}', 'koin')" style="background: #475569; color: white; border: none; padding: 10px 25px; border-radius: 20px; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0; width: auto !important; height: auto !important;">Isi Detail Fisik</button>
            <div class="qi-val" id="qi-val-${areaId}-koin-${val}" style="margin-left: auto; font-weight: 800; font-size: 14px; color: #0f172a; background: #e2e8f0; padding: 6px 12px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; min-width: 95px; text-align: center;">0 Keping</div>
        </div>`;
    });
    html += `</div></div>`;
    return html;
}

function createPendingTable(mode) {
    const pendingDenoms = [20000, 10000, 5000, 2000, 1000];
    const initialBranches = ['PENDING SORTIR', 'KCP SOETA', 'KCU BPN', 'KCP KARANG JATI', 'KK BATAKAN', 'KCP BSB'];
    let headerHTML = `<th style="background-color: #f8fafc; border: 1px solid #1e293b; width:120px;"></th>`;
    initialBranches.forEach((branch) => { headerHTML += `<th style="background: #2563eb; color: white; border: 1px solid #1e293b; padding:10px;">${branch}</th>`; });
    headerHTML += `<th style="background: #0f172a; color: white; border: 1px solid #1e293b; padding:10px;">TOTAL LEMBAR</th>`;

    let html = `
        <div style="background:#e0e7ff; color:#3730a3; padding:10px; border-radius:6px; margin-bottom:15px; font-weight:bold;">
            📌 Inputan Pending Unsortir [${mode.toUpperCase()}]. Total Lembar otomatis ditarik ke kolom "UNPROSES" di Saldo Khasanah.
        </div>
        <div style="overflow-x: auto;">
            <table id="table-pending-bca-${mode}" style="width:100%; border-collapse:collapse; text-align:center;">
                <thead>
                    <tr><th colspan="${initialBranches.length + 2}" style="background:#3b82f6; color:white; font-size:16px; padding:12px; border:1px solid #1e293b;">INPUTAN PENDING UNSORTIR CIT BCA [${mode.toUpperCase()}]</th></tr>
                    <tr>${headerHTML}</tr>
                </thead>
                <tbody id="pending-tbody-${mode}">
    `;
    pendingDenoms.forEach((denom, index) => {
        let rowClass = index % 2 === 0 ? '#f1f5f9' : '#ffffff';
        html += `
            <tr style="background:${rowClass}; border:1px solid #cbd5e1;" class="pending-data-row" data-denom="${denom}" data-type="kertas">
                <td style="font-weight:700; padding:10px; border:1px solid #cbd5e1;">Rp ${new Intl.NumberFormat('id-ID').format(denom)}</td>`;
        initialBranches.forEach(() => { 
            html += `<td style="border:1px solid #cbd5e1;"><input type="number" min="0" value="0" class="pending-input" style="width:100%; padding:8px; border:none; background:transparent; text-align:center; font-weight:bold;" onfocus="if(this.value=='0')this.value=''" onblur="if(this.value=='')this.value='0'" oninput="calculatePending('${mode}')"></td>`; 
        });
        html += `<td style="border:1px solid #cbd5e1; background:#e2e8f0;"><input type="text" value="0" class="readonly-input pending-row-total" style="width:100%; border:none; background:transparent; text-align:center; font-weight:900; color:#0f172a;" readonly tabindex="-1"></td>
            </tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
}

function createSingleDenomTable(tableId, titleText, initialBranches, titleBgColor, mode) {
    let headerHTML = `<th style="background-color: #f8fafc; border: 1px solid #1e293b; width:100px; padding:6px;">Pecahan</th>`;
    initialBranches.forEach((branch) => { headerHTML += `<th style="background: #2563eb; color: white; border: 1px solid #1e293b; padding:6px; min-width:80px;">${branch}</th>`; });
    headerHTML += `<th style="background: #0f172a; color: white; border: 1px solid #1e293b; padding:6px; min-width:100px;">TOTAL (Rp)</th>`;

    let html = `
        <div style="background:#fce7f3; color:#9d174d; padding:8px; border-radius:6px; margin-bottom:15px; font-weight:bold; font-size:11px;">
            📌 Inputan Pemakaian Uang [${mode.toUpperCase()}]. Menggunakan format Lembar/Keping. Tersinkron otomatis ke Menu Saldo.
        </div>
        <div style="overflow-x: auto; width: 100%;">
            <table id="${tableId}-table-${mode}" style="width: 100%; border-collapse:collapse; text-align:center; font-size:11px;">
                <thead>
                    <tr><th colspan="${initialBranches.length + 2}" style="background-color: ${titleBgColor}; color: #0f172a; font-size:13px; padding:8px; border:1px solid #1e293b;">${titleText} [${mode.toUpperCase()}]</th></tr>
                    <tr>${headerHTML}</tr>
                </thead>
                <tbody id="${tableId}-tbody-${mode}">
    `;
    let colorIndex = 0; 
    let isKertas = true; 
    const renderDenoms = [
        { type: 'divider', label: 'UANG KERTAS' }, { val: 100000 }, { val: 75000 }, { val: 50000 }, { val: 20000 }, { val: 10000 }, { val: 5000 }, { val: 2000 }, { val: 1000 },
        { type: 'divider', label: 'UANG KOIN' }, { val: 1000 }, { val: 500 }, { val: 200 }, { val: 100 }, { val: 50 }
    ];

    renderDenoms.forEach((item) => {
        if (item.type === 'divider') {
            isKertas = item.label.includes('KERTAS');
            html += `<tr><td colspan="${initialBranches.length + 2}" style="background:#1e293b; color:white; font-weight:bold; font-size:12px; padding:6px;">${item.label}</td></tr>`;
        } else {
            let typeKey = isKertas ? 'kertas' : 'koin'; 
            let rowBg = colorIndex % 2 === 0 ? '#ffffff' : '#f1f5f9'; 
            colorIndex++;
            
            html += `
                <tr class="${tableId}-data-row pemakaian-data-row" style="background-color: ${rowBg}; border:1px solid #cbd5e1;" data-denom="${item.val}" data-type="${typeKey}">
                    <td style="font-weight: 800; text-align: left; padding: 6px; color: #0f172a; border:1px solid #cbd5e1;">${formatRupiah(item.val)}</td>`;
            initialBranches.forEach(() => { 
                html += `<td style="border:1px solid #cbd5e1;"><input type="number" min="0" value="0" class="${tableId}-input pemakaian-input" style="width:100%; padding:4px; border:none; background:transparent; text-align:center; font-weight:bold; font-size:11px;" onfocus="if(this.value=='0')this.value=''" onblur="if(this.value=='')this.value='0'" oninput="calculateGeneric('${tableId}', '${mode}')"></td>`; 
            });
            html += `<td style="border:1px solid #cbd5e1; background:#e2e8f0;"><input type="text" value="Rp 0" class="readonly-input ${tableId}-row-total pemakaian-row-total" style="width:100%; border:none; background:transparent; text-align:right; font-weight:900; color:#0f172a; padding-right:8px; font-size:11px;" readonly tabindex="-1"></td></tr>`;
        }
    });
    html += `</tbody></table></div>`;
    return html;
}

function createClosingKhasanahTable(mode) {
    let inputStyle = "width:100%; min-width:45px; text-align:center; border:none; background:transparent; font-weight:800; color:#ef4444; font-size:12px;";
    let html = `
    <div style="background:#ffffff; color:#334155; padding:15px; border-radius:6px; margin-bottom:15px; font-weight:bold; border: 1px solid #e2e8f0;">
        📌 Saldo Khasanah BCA [${mode.toUpperCase()}].<br><span style="font-size:11px; color:#64748b; font-weight:normal;">Total Saldo Rp = (Fisik + Unproses) x Denom.<br>Selisih = (Fisik + Unproses) - Pemakaian Lbr - Saldo H+1 Lbr.</span>
    </div>
    <div style="overflow-x: auto; background: white; border: 1px solid #cbd5e1; border-radius: 8px;">
        <table id="closing-bca-table-${mode}" style="width:100%; border-collapse:collapse; text-align:center; font-size: 11px; white-space: nowrap;">
            <thead>
                <tr>
                    <th colspan="19" style="background:#0f172a; color:white; padding:12px; font-size:14px; font-weight:900; letter-spacing:1px; text-align:right;">CLOSING KHASANAH [${mode.toUpperCase()}]</th>
                </tr>
                <tr>
                    <th rowspan="2" style="background:#fde047; color:#1e293b; padding:10px; border:1px solid #cbd5e1; font-weight:800;">DENOM KERTAS</th>
                    <th rowspan="2" style="background:#cbd5e1; color:#1e293b; padding:10px; border:1px solid #cbd5e1; font-weight:800;">UNPROSES</th>
                    <th colspan="3" style="background:#22c55e; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">GRESS</th>
                    <th colspan="4" style="background:#f59e0b; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">ULE</th>
                    <th colspan="4" style="background:#60a5fa; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">UTLE</th>
                    <th colspan="3" style="background:#ef4444; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">RUSAK</th>
                    <th colspan="2" style="background:#f43f5e; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">SELISIH</th>
                    <th rowspan="2" style="background:#1e40af; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">TOTAL SALDO (Rp)</th>
                </tr>
                <tr>
                    <th style="background:#22c55e; color:white; padding:8px; border:1px solid #cbd5e1;">2022</th>
                    <th style="background:#22c55e; color:white; padding:8px; border:1px solid #cbd5e1;">2016</th>
                    <th style="background:#22c55e; color:white; padding:8px; border:1px solid #cbd5e1;">LAMA</th>
                    
                    <th style="background:#f59e0b; color:white; padding:8px; border:1px solid #cbd5e1;">2022</th>
                    <th style="background:#f59e0b; color:white; padding:8px; border:1px solid #cbd5e1;">2016</th>
                    <th style="background:#f59e0b; color:white; padding:8px; border:1px solid #cbd5e1;">2014</th>
                    <th style="background:#f59e0b; color:white; padding:8px; border:1px solid #cbd5e1;">LAMA</th>
                    
                    <th style="background:#60a5fa; color:white; padding:8px; border:1px solid #cbd5e1;">2022</th>
                    <th style="background:#60a5fa; color:white; padding:8px; border:1px solid #cbd5e1;">2016</th>
                    <th style="background:#60a5fa; color:white; padding:8px; border:1px solid #cbd5e1;">2014</th>
                    <th style="background:#60a5fa; color:white; padding:8px; border:1px solid #cbd5e1;">LAMA</th>
                    
                    <th style="background:#ef4444; color:white; padding:8px; border:1px solid #cbd5e1;">2022</th>
                    <th style="background:#ef4444; color:white; padding:8px; border:1px solid #cbd5e1;">2016</th>
                    <th style="background:#ef4444; color:white; padding:8px; border:1px solid #cbd5e1;">LAMA</th>
                    
                    <th style="background:#fb7185; color:white; padding:8px; border:1px solid #cbd5e1;">LEMBAR</th>
                    <th style="background:#e11d48; color:white; padding:8px; border:1px solid #cbd5e1;">NOMINAL (RP)</th>
                </tr>
            </thead>
            <tbody>
    `;

    kertasUniques.forEach((denom, idx) => {
        let rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        html += `
        <tr style="background:${rowBg}; border:1px solid #cbd5e1;" class="closing-data-row" data-denom="${denom}" data-type="kertas">
            <td style="font-weight:800; border:1px solid #cbd5e1; padding:8px; color:#0f172a;">Rp ${new Intl.NumberFormat('id-ID').format(denom)}</td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-unproses" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-gress-22" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-gress-16" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-gress-lama" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-ule-22" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-ule-16" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-ule-14" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-ule-lama" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-utle-22" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-utle-16" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-utle-14" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-utle-lama" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-rusak-22" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-rusak-16" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-rusak-lama" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-mut-selisih" value="0" readonly tabindex="-1" style="${inputStyle}"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-mut-selisih-rp" value="Rp 0" readonly tabindex="-1" style="${inputStyle} width:100%; min-width:85px; text-align:right;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px; font-weight:900; color:#1e40af; background:#eff6ff;"><input type="text" value="Rp 0" class="readonly-input closing-row-total" readonly tabindex="-1" style="width:100%; min-width:100px; text-align:right; border:none; background:transparent; font-weight:900; color:#1e40af; font-size:12px;"></td>
        </tr>`;
    });
    
    html += `
        <tr>
            <td colspan="17" style="text-align:right; padding:6px 10px; font-weight:bold; background:#f1f5f9; color:#0f172a;">TOTAL DENOM UPB (100K, 75K, 50K) :</td>
            <td style="background:#f1f5f9; font-weight:bold; color:#ef4444; text-align:right; border-right: 1px solid #cbd5e1; padding-right:5px;" id="tot-selisih-rp-besar-${mode}">Rp 0</td>
            <td style="background:#e0e7ff; border-left: 1px solid #cbd5e1;"></td>
        </tr>
        <tr>
            <td colspan="17" style="text-align:right; padding:6px 10px; font-weight:bold; background:#f1f5f9; color:#0f172a;">TOTAL DENOM UPK (20K - 1K) :</td>
            <td style="background:#f1f5f9; font-weight:bold; color:#ef4444; text-align:right; border-right: 1px solid #cbd5e1; padding-right:5px;" id="tot-selisih-rp-kecil-${mode}">Rp 0</td>
            <td style="background:#e0e7ff; border-left: 1px solid #cbd5e1;"></td>
        </tr>
        <tr>
            <td colspan="17" style="text-align:right; padding:6px 10px; font-weight:900; background:#e2e8f0; color:#0f172a;">GRAND TOTAL SELISIH KERTAS :</td>
            <td style="background:#e2e8f0; font-weight:900; color:#ef4444; text-align:right; border-right: 1px solid #cbd5e1; padding-right:5px;" id="grand-selisih-rp-kertas-${mode}">Rp 0</td>
            <td style="background:#e0e7ff; border-left: 1px solid #cbd5e1;"></td>
        </tr>
        <tr>
            <th rowspan="2" style="background:#fde047; color:#1e293b; padding:10px; border:1px solid #cbd5e1; font-weight:800;">DENOM KOIN</th>
            <th rowspan="2" style="background:#cbd5e1; color:#1e293b; padding:10px; border:1px solid #cbd5e1; font-weight:800;">UNSORTIR</th>
            <th colspan="3" style="background:#22c55e; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">GRESS</th>
            <th colspan="4" style="background:#f59e0b; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">ULE</th>
            <th colspan="4" style="background:#60a5fa; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">UTLE</th>
            <th colspan="3" style="background:#ef4444; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">RUSAK</th>
            <th colspan="2" style="background:#f43f5e; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">SELISIH</th>
            <th rowspan="2" style="background:#1e40af; color:white; padding:10px; border:1px solid #cbd5e1; font-weight:800;">TOTAL SALDO (Rp)</th>
        </tr>
        <tr style="background:#334155; color:white; font-size:11px;">
            <th style="border: 1px solid #cbd5e1; padding:8px;">2016</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">2010</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">LAMA</th>
            
            <th style="border: 1px solid #cbd5e1; padding:8px;">2016</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">2010</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">2003</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">1999</th>
            
            <th style="border: 1px solid #cbd5e1; padding:8px;">2016</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">2010</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">2003</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">1999</th>
            
            <th style="border: 1px solid #cbd5e1; padding:8px;">2016</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">2010</th>
            <th style="border: 1px solid #cbd5e1; padding:8px;">1999</th>
            
            <th style="background:#fb7185; color:white; border: 1px solid #cbd5e1; padding:8px;">KEPING</th>
            <th style="background:#e11d48; color:white; border: 1px solid #cbd5e1; padding:8px;">NOMINAL (RP)</th>
        </tr>
    `;

    koinUniques.forEach((denom, idx) => {
        let rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        html += `
        <tr style="background:${rowBg}; border:1px solid #cbd5e1;" class="closing-data-row" data-denom="${denom}" data-type="koin">
            <td style="font-weight:800; border:1px solid #cbd5e1; padding:8px; color:#0f172a;">${new Intl.NumberFormat('id-ID').format(denom)}</td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-unproses" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-gress-16" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-gress-10" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-gress-lama" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-ule-16" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-ule-10" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-ule-03" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-ule-99" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-utle-16" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-utle-10" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-utle-03" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-utle-99" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-rusak-16" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-rusak-10" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-rusak-99" value="0" readonly tabindex="-1" style="${inputStyle} color:#334155;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-mut-selisih" value="0" readonly tabindex="-1" style="${inputStyle}"></td>
            <td style="border:1px solid #cbd5e1; padding:4px;"><input type="text" class="readonly-input cl-mut-selisih-rp" value="Rp 0" readonly tabindex="-1" style="${inputStyle} width:100%; min-width:85px; text-align:right;"></td>
            <td style="border:1px solid #cbd5e1; padding:4px; font-weight:900; color:#1e40af; background:#eff6ff;"><input type="text" value="Rp 0" class="readonly-input closing-row-total" readonly tabindex="-1" style="width:100%; min-width:100px; text-align:right; border:none; background:transparent; font-weight:900; color:#1e40af; font-size:12px;"></td>
        </tr>`;
    });
    
    html += `
        <tr>
            <td colspan="17" style="text-align:right; padding:6px 10px; font-weight:900; background:#e2e8f0; color:#0f172a;">GRAND TOTAL SELISIH KOIN :</td>
            <td style="background:#e2e8f0; font-weight:900; color:#ef4444; text-align:right; border-right: 1px solid #cbd5e1; padding-right:5px;" id="grand-selisih-koin-rp-${mode}">Rp 0</td>
            <td style="background:#e0e7ff; border-left: 1px solid #cbd5e1;"></td>
        </tr>
    </tbody></table></div>`;
    return html;
}

function createKroscekTable(mode) {
    let html = `
        <div class="kroscek-accordion-container" style="display:flex; flex-direction:column; gap:15px;">
            <div>
                <button class="kroscek-accordion-btn" style="width: 100%; padding: 14px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 800; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="let c = this.nextElementSibling; c.style.display = c.style.display === 'none' ? 'block' : 'none'">
                    1. Ringkasan Saldo Khasanah [${mode.toUpperCase()}] <span>▼</span>
                </button>
                <div class="kroscek-accordion-content" style="display: none; padding: 15px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 0 0 6px 6px; overflow-x: auto;">
                    <div id="kroscek-saldo-khasanah-container-${mode}">
                        <div style="text-align:center; padding:20px; color:#64748b; font-weight:bold;">Silakan Kalkulasi Saldo terlebih dahulu...</div>
                    </div>
                </div>
            </div>

            <div>
                <button class="kroscek-accordion-btn" style="width: 100%; padding: 14px 20px; background: #334155; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 800; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="let c = this.nextElementSibling; c.style.display = c.style.display === 'none' ? 'block' : 'none'">
                    2. Ringkasan Pemakaian Uang [${mode.toUpperCase()}] <span>▼</span>
                </button>
                <div class="kroscek-accordion-content" style="display: none; padding: 15px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 0 0 6px 6px; overflow-x: auto;">
                    <div id="kroscek-pemakaian-uang-container-${mode}">
                        <div style="text-align:center; padding:20px; color:#64748b; font-weight:bold;">Silakan Kalkulasi Saldo terlebih dahulu...</div>
                    </div>
                </div>
            </div>

            <div>
                <button class="kroscek-accordion-btn" style="width: 100%; padding: 14px 20px; background: #334155; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 800; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="let c = this.nextElementSibling; c.style.display = c.style.display === 'none' ? 'block' : 'none'">
                    3. Referensi Data & Integrasi Excel [${mode.toUpperCase()}] <span>▼</span>
                </button>
                <div class="kroscek-accordion-content" style="display: none; padding: 15px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 0 0 6px 6px;">
                    <div style="background:#eff6ff; color:#1e40af; padding:20px; border-radius:8px; border:1px solid #93c5fd; margin-bottom:15px;">
                        <h3 style="margin:0 0 10px 0; font-size:16px;">📌 Mode Sumber Data Saldo Pagi H+1</h3>
                        <div style="display:flex; gap:20px; font-size:14px; font-weight:bold; margin-bottom:15px; border-bottom:1px solid #bfdbfe; padding-bottom:15px;">
                            <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                                <input type="radio" name="h1_mode_${mode}" value="otomatis" checked onchange="setH1Mode('${mode}', this.value)"> 🤖 Otomatis (Upload Excel)
                            </label>
                            <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                                <input type="radio" name="h1_mode_${mode}" value="manual" onchange="setH1Mode('${mode}', this.value)"> ✍️ Manual Input
                            </label>
                        </div>
                        <div id="h1-otomatis-section-${mode}">
                            <p style="margin:0 0 10px 0; font-size:12px; color:#3b82f6;">Upload file excel Laporan untuk menarik data SALDO PAGI H+1 secara otomatis.</p>
                            <input type="file" id="upload-h1-bca-${mode}" accept=".xlsx, .xls, .csv" style="display:none;" onchange="prosesUploadH1BCA(event, '${mode}')">
                            <button class="btn-action btn-upload-h1" style="background:#3b82f6; color:white; border:none; padding:10px 15px; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="document.getElementById('upload-h1-bca-${mode}').click()">📁 Upload Excel H+1 [${mode.toUpperCase()}]</button>
                        </div>
                        <div id="h1-manual-section-${mode}" style="display:none; color:#dc2626; font-size:13px; font-weight:bold;">
                            📝 Mode Manual aktif. Silakan isi angka nominal Saldo Pagi H+1 (bisa mines) pada kolom input di tabel <b>Akordion 2</b>.
                        </div>
                    </div>
                    <div id="excel-preview-wrapper-${mode}" style="display:none;">
                        <h4 style="margin:0 0 10px 0; font-size:14px; color:#1e293b;">Tabel Preview Isi Excel & Pilihan Kolom:</h4>
                        <div id="excel-preview-container-${mode}" style="overflow-x:auto; max-height:450px; border:1px solid #cbd5e1; border-radius:6px;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    return html;
}

function createCetakBCATable(mode) {
    return `
    <div style="background:#e0e7ff; padding:20px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
        <h2 style="margin:0; color:#1e40af;">🖨️ Cetak / Export [${mode.toUpperCase()}]</h2>
        <div style="display:flex; gap:10px;">
            <button style="background:#10b981; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="exportExcelClosingBCA('${mode}')">📊 Export Excel</button>
            <button style="background:#4f46e5; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="cetakJPGBCA('${mode}')">📷 Download JPG</button>
        </div>
    </div>
    <div id="cetak-preview-bca-${mode}" style="background:white; padding:20px; border-radius:8px; border:1px solid #cbd5e1;">
        <h3 style="text-align:center; font-size:18px; font-weight:bold; color:#0f172a; margin-bottom: 20px; text-transform:uppercase;">
            LAPORAN CLOSING KHASANAH BCA (${mode})<br>
            <small style="color:#64748b; font-size:12px;" id="cetak-tgl-bca-${mode}"></small>
        </h3>
        <div id="cetak-content-bca-${mode}" style="color:#64748b; text-align:center; min-width: 1500px;">
            Pastikan Anda telah melakukan kalkulasi saldo terlebih dahulu.
        </div>
    </div>`;
}

// ==========================================
// 4. LOGIKA MODAL PENGISIAN FISIK
// ==========================================
function openDetailModal(areaId, denom, label, type) {
    if(!cekAksesBCA('bca_input')) return;
    window.currentModalArea = areaId; 
    window.currentModalDenom = denom; 
    window.currentModalType = type;
    
    document.getElementById('modal-title').innerText = "UANG " + label;
    const container = document.getElementById('modal-rows-container'); 
    container.innerHTML = ''; 
    
    const table = document.getElementById("table-" + areaId);
    if(table) {
        const rows = table.querySelectorAll(`tr[data-denom="${denom}"][data-type="${type}"]`);
        let hasData = false;
        
        rows.forEach((tr, idx) => {
            const emisi = tr.getAttribute('data-emisi');
            
            let gress = parseInt(tr.querySelector('.gress').value) || 0; 
            if(gress > 0) { addModalRow(denom, emisi, 0, gress); hasData = true; }
            
            let ule = parseInt(tr.querySelector('.ule').value) || 0; 
            if(ule > 0) { addModalRow(denom, emisi, 1, ule); hasData = true; }
            
            let utle = parseInt(tr.querySelector('.utle').value) || 0; 
            if(utle > 0) { addModalRow(denom, emisi, 2, utle); hasData = true; }
            
            let rusak = parseInt(tr.querySelector('.rusak').value) || 0; 
            if(rusak > 0) { addModalRow(denom, emisi, 3, rusak); hasData = true; }
            
            if (idx === 0) {
                let butle = parseInt(tr.querySelector('.buntut-utle')?.value) || 0; 
                if(butle > 0) { addModalRow(denom, emisi, 4, butle); hasData = true; }
                
                let brusak = parseInt(tr.querySelector('.buntut-rusak')?.value) || 0; 
                if(brusak > 0) { addModalRow(denom, emisi, 5, brusak); hasData = true; }
            }
        });
        
        if (!hasData) { 
            const firstEmisi = rows.length > 0 ? rows[0].getAttribute('data-emisi') : null; 
            addModalRow(denom, firstEmisi, 0, 0); 
        }
    } else { 
        addModalRow(denom, null, 0, 0); 
    }
    document.getElementById('detail-modal').style.display = 'flex';
}

function addModalRow(denom, emisi = null, kondisiIndex = 0, lembar = 0) {
    if(!cekAksesBCA('bca_input')) return;
    const container = document.getElementById('modal-rows-container');
    let typeLabel = window.currentModalType === 'kertas' ? 'Lembar' : 'Keping';
    
    const emisiMap = {
        '100000': ["2022", "2016", "2014", "2004"], 
        '75000': ["2020"], 
        '50000': ["2022", "2016", "2005"],
        '20000': ["2022", "2016", "2004"], 
        '10000': ["2022", "2016", "2010"], 
        '5000': ["2022", "2016", "2001"],
        '2000': ["2022", "2016", "2009"], 
        '1000': ["2022", "2016", "2000"],
        'koin_1000': ["2016", "2010"], 
        'koin_500': ["2016", "2003"], 
        'koin_200': ["2016", "2003"], 
        'koin_100': ["2016", "1999"], 
        'koin_50': ["1999"]
    };
    
    let keyMap = window.currentModalType === 'koin' ? 'koin_' + denom : String(denom);
    let arrEmisi = emisiMap[keyMap] || ["2022", "2016", "2014"];
    
    let emisiOptionsHTML = ''; 
    arrEmisi.forEach(e => emisiOptionsHTML += `<option value="${e}" ${e === String(emisi) ? 'selected' : ''}>${e}</option>`);

    let kondisiOptions = `
        <option value="0" ${kondisiIndex === 0 ? 'selected' : ''}>Gress BI</option>
        <option value="1" ${kondisiIndex === 1 ? 'selected' : ''}>ULE</option>
        <option value="2" ${kondisiIndex === 2 ? 'selected' : ''}>UTLE</option>
        <option value="3" ${kondisiIndex === 3 ? 'selected' : ''}>Rusak / RRM</option>
        <option value="4" ${kondisiIndex === 4 ? 'selected' : ''}>Buntut UTLE</option>
        <option value="5" ${kondisiIndex === 5 ? 'selected' : ''}>Buntut Rusak</option>
    `;
    
    let isBuntut = (kondisiIndex === 4 || kondisiIndex === 5);
    let disableEmisi = isBuntut ? 'disabled style="opacity:0.5;"' : '';
    
    const row = document.createElement('div'); 
    row.className = 'modal-row';
    row.style.cssText = 'display: flex; gap: 15px; align-items: center; margin-bottom: 15px;';
    row.innerHTML = `
        <input type="number" min="0" value="${lembar}" class="mod-lembar" placeholder="${typeLabel}" style="width:110px; padding:12px; border-radius:8px; border:2px solid #cbd5e1; text-align:center; font-weight:800; font-size:15px; outline:none; color:#0f172a;">
        <select class="mod-kondisi" style="flex-grow:1; padding:12px; border-radius:8px; border:2px solid #cbd5e1; font-weight:700; font-size:14px; outline:none; cursor:pointer; color:#0f172a;" onchange="let em = this.parentElement.querySelector('.mod-emisi'); if(this.value=='4' || this.value=='5'){ em.disabled=true; em.style.opacity='0.5'; } else { em.disabled=false; em.style.opacity='1'; }">${kondisiOptions}</select>
        <select class="mod-emisi" ${disableEmisi} style="flex-grow:1; padding:12px; border-radius:8px; border:2px solid #cbd5e1; font-weight:700; font-size:14px; outline:none; cursor:pointer; color:#0f172a;">${emisiOptionsHTML}</select>
        <button type="button" class="btn-remove" style="background:white; color:#ef4444; border:2px solid #ef4444; border-radius:50%; width:32px; height:32px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center;" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(row);
}

function saveModal() {
    if(!cekAksesBCA('bca_input')) return;
    const areaId = window.currentModalArea; 
    const denom = window.currentModalDenom; 
    const type = window.currentModalType;
    const table = document.getElementById("table-" + areaId);
    
    if(table) {
        const tableRows = table.querySelectorAll(`tr[data-denom="${denom}"][data-type="${type}"]`);
        tableRows.forEach(tr => tr.querySelectorAll('.in-val').forEach(inp => inp.value = 0));
        
        document.querySelectorAll('.modal-row').forEach(row => {
            const lembar = parseInt(row.querySelector('.mod-lembar').value) || 0;
            const kondisiIndex = parseInt(row.querySelector('.mod-kondisi').value);
            const emisi = row.querySelector('.mod-emisi').value;
            
            let tr;
            if (kondisiIndex === 4 || kondisiIndex === 5) {
                tr = table.querySelector(`tr[data-denom="${denom}"][data-type="${type}"]`);
            } else {
                tr = table.querySelector(`tr[data-denom="${denom}"][data-type="${type}"][data-emisi="${emisi}"]`);
            }
            
            if (tr) {
                let targetInput;
                if (kondisiIndex === 0) targetInput = tr.querySelector('.gress'); 
                else if (kondisiIndex === 1) targetInput = tr.querySelector('.ule');
                else if (kondisiIndex === 2) targetInput = tr.querySelector('.utle'); 
                else if (kondisiIndex === 3) targetInput = tr.querySelector('.rusak');
                else if (kondisiIndex === 4) targetInput = tr.querySelector('.buntut-utle'); 
                else if (kondisiIndex === 5) targetInput = tr.querySelector('.buntut-rusak');
                
                if(targetInput) targetInput.value = parseInt(targetInput.value) + lembar;
            }
        });
        
        tableRows.forEach(tr => calculate(tr.querySelector('.in-val')));
    }
    document.getElementById('detail-modal').style.display = 'none';
    if(typeof Swal !== 'undefined') Swal.fire({ title: 'Tersimpan!', text: 'Detail fisik diperbarui.', icon: 'success', timer: 1000, showConfirmButton: false });
    else alert('Detail fisik diperbarui.');
}

// ==========================================
// 5. LOGIKA PERHITUNGAN & SINKRONISASI 
// ==========================================
function calculate(element) {
    if(!element) return;
    const row = element.closest('tr'); 
    const tbody = element.closest('tbody');
    const denom = parseInt(row.getAttribute('data-denom'));
    const typeKey = row.getAttribute('data-type');
    
    const denomRows = tbody.querySelectorAll(`tr[data-denom="${denom}"][data-type="${typeKey}"]`);
    let totalLembar = 0;
    
    denomRows.forEach((tr, idx) => {
        totalLembar += parseInt(tr.querySelector('.gress').value) || 0;
        totalLembar += parseInt(tr.querySelector('.ule').value) || 0;
        totalLembar += parseInt(tr.querySelector('.utle').value) || 0;
        totalLembar += parseInt(tr.querySelector('.rusak').value) || 0;
        
        if (idx === 0) {
            totalLembar += parseInt(tr.querySelector('.buntut-utle')?.value) || 0;
            totalLembar += parseInt(tr.querySelector('.buntut-rusak')?.value) || 0;
        }
    });

    if (denomRows[0]) {
        const outTotal = denomRows[0].querySelector('.out-total');
        if (outTotal) outTotal.value = formatRupiah(totalLembar * denom);
    }

    const subtabDiv = element.closest('.subtab-content'); 
    if(subtabDiv) {
        const subId = subtabDiv.id.replace('subtab-', '');
        let grandTotal = 0;
        
        subtabDiv.querySelectorAll('.out-total').forEach(ot => {
            grandTotal += parseInt(ot.value.replace(/[^0-9]/g, '')) || 0;
        });
        
        const qiGrand = document.getElementById("qi-grand-" + subId);
        if(qiGrand) qiGrand.innerText = formatRupiah(grandTotal);
        
        const qiValLabel = document.getElementById('qi-val-' + subId + '-' + typeKey + '-' + denom);
        if (qiValLabel) qiValLabel.innerText = totalLembar + (typeKey === 'kertas' ? ' Lembar' : ' Keping');
    }
    
    if (window.bcaInitialized) {
        const wrapper = element.closest('.mode-wrapper');
        const mode = wrapper ? wrapper.id.replace('wrapper-', '') : window.currentGlobalMode;
        calculateClosing(mode);
    }
}

function calculatePending(mode) {
    const tabContent = document.getElementById(`tab-bca-pending-sortir-${mode}`); 
    if(!tabContent) return;
    
    let grandTotalRp = 0;
    tabContent.querySelectorAll('.pending-data-row').forEach(tr => {
        let rowPieces = 0;
        tr.querySelectorAll('.pending-input').forEach(input => {
            rowPieces += parseInt(input.value) || 0;
        });
        
        const curDenom = parseInt(tr.getAttribute('data-denom'));
        const totalLembarInput = tr.querySelector('.pending-row-total');
        
        if (totalLembarInput) { 
            totalLembarInput.value = rowPieces; 
            grandTotalRp += (rowPieces * curDenom); 
        }
    });
    
    const grandDisplay = document.getElementById(`grand-pending-sortir-${mode}`);
    if(grandDisplay) grandDisplay.innerText = formatRupiah(grandTotalRp);
    
    if (window.bcaInitialized) calculateClosing(mode);
}

function calculateGeneric(tableId, mode) {
    const tabContent = document.getElementById(`tab-bca-${tableId}-uang-${mode}`); 
    if(!tabContent) return;
    
    let grandTotalRp = 0;
    tabContent.querySelectorAll(`.${tableId}-data-row`).forEach(tr => {
        let rowPieces = 0;
        tr.querySelectorAll(`.${tableId}-input`).forEach(input => {
            rowPieces += parseInt(input.value) || 0;
        });
        
        const curDenom = parseInt(tr.getAttribute('data-denom')) || 0;
        const totalRpInput = tr.querySelector(`.${tableId}-row-total`);
        
        if (totalRpInput && curDenom > 0) {
            const rowTotalRp = rowPieces * curDenom;
            totalRpInput.value = formatRupiah(rowTotalRp); 
            grandTotalRp += rowTotalRp;
        }
    });
    
    const grandDisplay = document.getElementById(`grand-${tableId}-uang-${mode}`);
    if(grandDisplay) grandDisplay.innerText = formatRupiah(grandTotalRp);
    
    if (window.bcaInitialized) calculateClosing(mode);
}

function calculateClosing(mode) {
    let fisikData = { kertas: {}, koin: {} };
    
    kertasUniques.forEach(d => {
        fisikData.kertas[d] = {
            gress_22:0, gress_16:0, gress_lama:0, 
            ule_22:0, ule_16:0, ule_14:0, ule_lama:0,
            utle_22:0, utle_16:0, utle_14:0, utle_lama:0, 
            rusak_22:0, rusak_16:0, rusak_lama:0
        };
    });
    
    koinUniques.forEach(d => {
        fisikData.koin[d] = {
            gress_16:0, gress_10:0, gress_lama:0, 
            ule_16:0, ule_10:0, ule_03:0, ule_99:0,
            utle_16:0, utle_10:0, utle_03:0, utle_99:0, 
            rusak_16:0, rusak_10:0, rusak_99:0
        };
    });

    document.querySelectorAll(`#wrapper-${mode} .subtab-content tbody tr`).forEach(tr => {
        if(!tr.hasAttribute('data-denom')) return;
        let denom = parseInt(tr.getAttribute('data-denom'));
        let emisi = tr.getAttribute('data-emisi');
        let type = tr.getAttribute('data-type');
        
        let gress = parseInt(tr.querySelector('.gress')?.value) || 0;
        let ule = parseInt(tr.querySelector('.ule')?.value) || 0;
        let utle = parseInt(tr.querySelector('.utle')?.value) || 0;
        let rusak = parseInt(tr.querySelector('.rusak')?.value) || 0;
        let buntut_utle = tr.querySelector('.buntut-utle') ? (parseInt(tr.querySelector('.buntut-utle').value) || 0) : 0;
        let buntut_rusak = tr.querySelector('.buntut-rusak') ? (parseInt(tr.querySelector('.buntut-rusak').value) || 0) : 0;

        if(type === 'kertas' && fisikData.kertas[denom]) {
            let tgt = fisikData.kertas[denom];
            
            if(emisi === '2022') { tgt.gress_22 += gress; tgt.ule_22 += ule; tgt.utle_22 += utle; tgt.rusak_22 += rusak; }
            else if(emisi === '2016') { tgt.gress_16 += gress; tgt.ule_16 += ule; tgt.utle_16 += utle; tgt.rusak_16 += rusak; }
            else if(emisi === '2014') { tgt.gress_lama += gress; tgt.ule_14 += ule; tgt.utle_14 += utle; tgt.rusak_lama += rusak; }
            else { tgt.gress_lama += gress; tgt.ule_lama += ule; tgt.utle_lama += utle; tgt.rusak_lama += rusak; }
            
            tgt.utle_lama += buntut_utle; 
            tgt.rusak_lama += buntut_rusak;
            
        } else if (type === 'koin' && fisikData.koin[denom]) {
            let tgt = fisikData.koin[denom];
            
            if(emisi === '2016') { tgt.gress_16 += gress; tgt.ule_16 += ule; tgt.utle_16 += utle; tgt.rusak_16 += rusak; }
            else if(emisi === '2010') { tgt.gress_10 += gress; tgt.ule_10 += ule; tgt.utle_10 += utle; tgt.rusak_10 += rusak; }
            else if(emisi === '2003') { tgt.gress_lama += gress; tgt.ule_03 += ule; tgt.utle_03 += utle; tgt.rusak_99 += rusak; }
            else { tgt.gress_lama += gress; tgt.ule_99 += ule; tgt.utle_99 += utle; tgt.rusak_99 += rusak; }
            
            tgt.utle_99 += buntut_utle; 
            tgt.rusak_99 += buntut_rusak;
        }
    });

    let pendingData = {};
    document.querySelectorAll(`#pending-tbody-${mode} .pending-data-row`).forEach(tr => {
        let denom = parseInt(tr.getAttribute('data-denom')); 
        let type = tr.getAttribute('data-type');
        let totalInput = tr.querySelector('.pending-row-total');
        pendingData[type + '_' + denom] = (pendingData[type + '_' + denom] || 0) + (parseInt(totalInput ? totalInput.value : 0) || 0);
    });

    let pemakaianData = {}; 
    document.querySelectorAll(`#pemakaian-table-${mode} tbody .pemakaian-data-row`).forEach(tr => {
        let denom = parseInt(tr.getAttribute('data-denom')); 
        let type = tr.getAttribute('data-type'); 
        let totalLembar = 0;
        tr.querySelectorAll('.pemakaian-input').forEach(inp => totalLembar += parseInt(inp.value) || 0);
        pemakaianData[type + '_' + denom] = totalLembar; 
    });

    let totalSelisihRpBesar = 0; 
    let totalSelisihRpKecil = 0; 
    let totalSelisihRpKoin = 0;

    document.querySelectorAll(`#closing-bca-table-${mode} .closing-data-row`).forEach(tr => {
        let denom = parseInt(tr.getAttribute('data-denom')); 
        let type = tr.getAttribute('data-type');
        
        let dataF = fisikData[type][denom]; 
        let pend = pendingData[type + '_' + denom] || 0; 
        let pakai = pemakaianData[type + '_' + denom] || 0;

        Object.keys(dataF).forEach(key => { 
            let inp = tr.querySelector(`.cl-${key.replace('_','-')}`); 
            if(inp) inp.value = dataF[key]; 
        });
        
        let unpInp = tr.querySelector('.cl-unproses'); 
        if(unpInp) unpInp.value = pend;
        
        let totFisikLbr = 0; 
        Object.values(dataF).forEach(v => totFisikLbr += v);
        
        let totalInputanLbr = pend + totFisikLbr;
        
        let h1Nominal = window.h1DataRp[mode][type + '_' + denom] || 0;
        let h1Lbr = h1Nominal / denom;
        
        let selisihLbr = totalInputanLbr - pakai - h1Lbr; 
        let selisihRp = selisihLbr * denom;

        let mutSelisihInp = tr.querySelector('.cl-mut-selisih'); 
        if (mutSelisihInp) mutSelisihInp.value = selisihLbr.toLocaleString('id-ID'); 
        
        if (type === 'kertas') { 
            if (denom >= 50000) totalSelisihRpBesar += selisihRp; 
            else totalSelisihRpKecil += selisihRp; 
        } 
        else if (type === 'koin') totalSelisihRpKoin += selisihRp;

        let selisihRpInp = tr.querySelector('.cl-mut-selisih-rp'); 
        if (selisihRpInp) selisihRpInp.value = formatRupiah(selisihRp);
        
        let saldoAkhirRp = totalInputanLbr * denom;
        let totInp = tr.querySelector('.closing-row-total'); 
        if(totInp) totInp.value = formatRupiah(saldoAkhirRp);
    });

    let elTotSelisihBesar = document.getElementById(`tot-selisih-rp-besar-${mode}`); 
    if (elTotSelisihBesar) elTotSelisihBesar.innerText = formatRupiah(totalSelisihRpBesar);
    
    let elTotSelisihKecil = document.getElementById(`tot-selisih-rp-kecil-${mode}`); 
    if (elTotSelisihKecil) elTotSelisihKecil.innerText = formatRupiah(totalSelisihRpKecil);
    
    let elGrandSelisihKertas = document.getElementById(`grand-selisih-rp-kertas-${mode}`); 
    if (elGrandSelisihKertas) elGrandSelisihKertas.innerText = formatRupiah(totalSelisihRpBesar + totalSelisihRpKecil);
    
    let elTotSelisihKoin = document.getElementById(`grand-selisih-koin-rp-${mode}`); 
    if (elTotSelisihKoin) elTotSelisihKoin.innerText = formatRupiah(totalSelisihRpKoin);
    
    let grandSelisihKeseluruhan = totalSelisihRpBesar + totalSelisihRpKecil + totalSelisihRpKoin;
    const banner = document.getElementById(`bottom-khasanah-total-${mode}`);
    if(banner) banner.innerHTML = `<span style="font-size:22px;">GRAND TOTAL SELISIH: <span style="color:#ef4444;">${formatRupiah(grandSelisihKeseluruhan)}</span></span>`;

    let closingTable = document.getElementById(`closing-bca-table-${mode}`);
    if(closingTable) {
        let printTable = closingTable.cloneNode(true);
        printTable.id = `closing-bca-print-table-${mode}`;
        
        printTable.querySelectorAll('input').forEach(inp => {
            let span = document.createElement('span'); 
            span.innerText = inp.value || '0'; 
            span.style.fontWeight = 'bold'; 
            span.style.color = inp.style.color || '#0f172a'; 
            span.style.fontSize = '12px'; 
            inp.parentNode.replaceChild(span, inp);
        });
        
        let tfootHtml = `
            <tfoot>
                <tr style="background:#fee2e2; border:2px solid #ef4444;">
                    <td colspan="19" style="padding:12px; font-weight:900; color:#b91c1c; text-align:center; font-size:16px; letter-spacing:1px;">
                        GRAND TOTAL SELISIH KESELURUHAN (KERTAS + KOIN) : ${formatRupiah(grandSelisihKeseluruhan)}
                    </td>
                </tr>
            </tfoot>`;
        
        let kroscekSaldoContainer = document.getElementById(`kroscek-saldo-khasanah-container-${mode}`);
        if (kroscekSaldoContainer) {
            kroscekSaldoContainer.innerHTML = `
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; text-align:center; font-size: 11px; white-space: nowrap;">
                        ${printTable.innerHTML}
                        ${tfootHtml}
                    </table>
                </div>`;
        }
        
        const cetakContent = document.getElementById(`cetak-content-bca-${mode}`);
        const cetakTgl = document.getElementById(`cetak-tgl-bca-${mode}`);
        if(cetakContent) {
            cetakContent.innerHTML = `
                <div style="overflow-x:auto; width:100%;">
                    <table id="tabel-export-final-${mode}" style="width:100%; border-collapse:collapse; text-align:center; font-size: 11px; white-space: nowrap; border: 2px solid #1e293b;">
                        ${printTable.innerHTML}
                        ${tfootHtml}
                    </table>
                </div>`;
            if(cetakTgl) cetakTgl.innerText = "Tanggal Cetak: " + new Date().toLocaleString('id-ID');
        }
    }
    
    buildRingkasanPemakaianUang(mode);
}

function setH1Mode(mode, val) {
    if(!cekAksesBCA('bca_kroscek')) return; 
    window.h1InputMode[mode] = val;
    
    if(val === 'otomatis') {
        document.getElementById(`h1-otomatis-section-${mode}`).style.display = 'block';
        document.getElementById(`h1-manual-section-${mode}`).style.display = 'none';
    } else {
        document.getElementById(`h1-otomatis-section-${mode}`).style.display = 'none';
        document.getElementById(`h1-manual-section-${mode}`).style.display = 'block';
    }
    buildRingkasanPemakaianUang(mode); 
}

function updateH1DataManual(mode, type, denom, valueStr) {
    if(!cekAksesBCA('bca_kroscek')) return;
    let val = parseInt(valueStr.replace(/[^0-9\-]/g, '')); 
    if(isNaN(val)) val = 0;
    window.h1DataRp[mode][type + '_' + denom] = val;
    calculateClosing(mode); 
}

function buildRingkasanPemakaianUang(mode) {
    let pemakaianTable = document.getElementById(`pemakaian-table-${mode}`);
    if (!pemakaianTable) return;
    
    let pemakaianHeaders = pemakaianTable.querySelectorAll('thead tr:nth-child(2) th');
    let branches = []; 
    for(let i=1; i < pemakaianHeaders.length - 1; i++){ 
        branches.push(pemakaianHeaders[i].innerText); 
    }

    let colCount = 2 + branches.length;
    let html = `
        <div style="overflow-x:auto; width:100%;">
            <table style="width:100%; min-width:600px; border-collapse:collapse; text-align:center; font-size:11px; border:2px solid #1e293b;">
                <thead>
                    <tr><th colspan="${colCount}" style="background:#fdba74; color:#0f172a; padding:8px; font-size:13px; font-weight:900;">RINGKASAN PEMAKAIAN UANG (NOMINAL) [${mode.toUpperCase()}]</th></tr>
                    <tr style="background:#1e293b; color:white;">
                        <th style="padding:6px; border:1px solid #cbd5e1; width:80px;">DENOM</th>
                        <th style="padding:6px; border:1px solid #cbd5e1; width:160px;">SALDO PAGI H+1</th>`;
                        
    branches.forEach(b => html += `<th style="padding:6px; border:1px solid #cbd5e1; min-width:100px;">PAKAI ${b}</th>`);
    
    html += `       </tr>
                </thead>
                <tbody>
                    <tr><td colspan="${colCount}" style="background:#ffffff; font-weight:bold; padding:8px; border:1px solid #cbd5e1; text-align:center;">KERTAS</td></tr>`;

    let totalH1All = 0; 
    let totalsPemAll = new Array(branches.length).fill(0);
    let totalH1Kertas = 0; 
    let totalsPemKertas = new Array(branches.length).fill(0);
    let totalH1Koin = 0; 
    let totalsPemKoin = new Array(branches.length).fill(0);
    
    let isManual = window.h1InputMode[mode] === 'manual'; 
    let canEdit = cekAksesBCA('bca_kroscek');

    let renderRow = (denom, idx, isKertas) => {
        let bg = idx % 2 === 0 ? '#fde047' : '#e2e8f0'; 
        let typeStr = isKertas ? 'kertas' : 'koin';
        let h1Val = (window.h1DataRp[mode] && window.h1DataRp[mode][typeStr + '_' + denom]) ? window.h1DataRp[mode][typeStr + '_' + denom] : 0;
        
        if (isKertas) totalH1Kertas += h1Val; 
        else totalH1Koin += h1Val;
        
        totalH1All += h1Val;

        let h1Html = '';
        if (isManual && canEdit) {
            h1Html = `<input type="text" value="${h1Val === 0 ? '' : new Intl.NumberFormat('id-ID').format(h1Val)}" onchange="updateH1DataManual('${mode}', '${typeStr}', ${denom}, this.value)" onfocus="this.value = this.value.replace(/[^0-9\-]/g, '')" onblur="let v = parseInt(this.value.replace(/[^0-9\\-]/g, '')); this.value = isNaN(v) ? '' : new Intl.NumberFormat('id-ID').format(v)" placeholder="0" style="width:90%; padding:4px; text-align:right; font-weight:bold; font-size:11px; border:1px solid #94a3b8; border-radius:4px; outline:none; color:#0f172a;">`;
        } else { 
            h1Html = `${h1Val === 0 ? '0' : new Intl.NumberFormat('id-ID').format(h1Val)}`; 
        }

        let rowHtml = `<tr style="background:${bg}; border:1px solid #1e293b; color:#0f172a;">
            <td style="padding:6px; font-weight:bold; border:1px solid #1e293b; text-align:center;">${new Intl.NumberFormat('id-ID').format(denom)}</td>
            <td style="padding:6px; font-weight:bold; border:1px solid #1e293b; text-align:right; padding-right:10px;">${h1Html}</td>`;
            
        let pemRow = pemakaianTable.querySelector(`tbody tr[data-denom="${denom}"][data-type="${typeStr}"]`);
        
        if(pemRow) {
            let inputs = pemRow.querySelectorAll('.pemakaian-input');
            branches.forEach((b, bIdx) => {
                let valRp = (parseInt(inputs[bIdx].value) || 0) * denom;
                if (isKertas) totalsPemKertas[bIdx] += valRp; 
                else totalsPemKoin[bIdx] += valRp;
                
                totalsPemAll[bIdx] += valRp;
                
                rowHtml += `<td style="padding:6px; font-weight:bold; border:1px solid #1e293b; text-align:right; padding-right:10px;">${valRp === 0 ? '0' : new Intl.NumberFormat('id-ID').format(valRp)}</td>`;
            });
        } else { 
            branches.forEach(() => {
                rowHtml += `<td style="padding:6px; font-weight:bold; border:1px solid #1e293b; text-align:right; padding-right:10px;">0</td>`;
            }); 
        }
        return rowHtml + `</tr>`;
    };

    let renderDenomsKertas = [100000, 75000, 50000, 20000, 10000, 5000, 2000, 1000];
    renderDenomsKertas.forEach((d, i) => html += renderRow(d, i, true));
    
    html += `
        <tr style="background:#86efac; border:1px solid #1e293b; color:#0f172a;">
            <td style="padding:8px; font-weight:900; border:1px solid #1e293b; text-align:center;">TOTAL KERTAS</td>
            <td style="padding:8px; font-weight:900; border:1px solid #1e293b; text-align:right; padding-right:10px;">${totalH1Kertas === 0 ? '0' : new Intl.NumberFormat('id-ID').format(totalH1Kertas)}</td>`;
            
    totalsPemKertas.forEach(t => html += `<td style="padding:8px; font-weight:900; border:1px solid #1e293b; text-align:right; padding-right:10px;">${t === 0 ? '0' : new Intl.NumberFormat('id-ID').format(t)}</td>`);
    
    html += `
        </tr>
        <tr><td colspan="${colCount}" style="background:#fde047; padding:4px; border:1px solid #1e293b;"></td></tr>
        <tr><td colspan="${colCount}" style="background:#ffffff; font-weight:bold; padding:8px; border:1px solid #cbd5e1; text-align:center;">COIN</td></tr>`;

    let renderDenomsKoin = [1000, 500, 200, 100, 50];
    renderDenomsKoin.forEach((d, i) => html += renderRow(d, i, false));
    
    html += `
        <tr style="background:#86efac; border:1px solid #1e293b; color:#0f172a;">
            <td style="padding:8px; font-weight:900; border:1px solid #1e293b; text-align:center;">TOTAL KOIN</td>
            <td style="padding:8px; font-weight:900; border:1px solid #1e293b; text-align:right; padding-right:10px;">${totalH1Koin === 0 ? '0' : new Intl.NumberFormat('id-ID').format(totalH1Koin)}</td>`;
            
    totalsPemKoin.forEach(t => html += `<td style="padding:8px; font-weight:900; border:1px solid #1e293b; text-align:right; padding-right:10px;">${t === 0 ? '0' : new Intl.NumberFormat('id-ID').format(t)}</td>`);
    
    html += `
        </tr>
        <tr style="background:#1e40af; border:2px solid #1e293b; color:#ffffff;">
            <td style="padding:10px; font-weight:900; border:1px solid #1e293b; text-align:center; font-size:12px;">GRAND TOTAL</td>
            <td style="padding:10px; font-weight:900; border:1px solid #1e293b; text-align:right; padding-right:10px; font-size:12px;">${totalH1All === 0 ? '0' : new Intl.NumberFormat('id-ID').format(totalH1All)}</td>`;
            
    totalsPemAll.forEach(t => html += `<td style="padding:10px; font-weight:900; border:1px solid #1e293b; text-align:right; padding-right:10px; font-size:12px;">${t === 0 ? '0' : new Intl.NumberFormat('id-ID').format(t)}</td>`);
    
    html += `</tr></tbody></table></div>`;
    
    let container = document.getElementById(`kroscek-pemakaian-uang-container-${mode}`);
    if(container) { 
        container.innerHTML = html; 
        terapkanUIAksesBCA(); 
    }
}

// -----------------------------------------------------
// LOGIKA PEMROSESAN EXCEL UPLOAD BCA H+1 DENGAN PILIHAN KOLOM
// -----------------------------------------------------
function prosesUploadH1BCA(event, mode) {
    if(!cekAksesBCA('bca_kroscek')) return; 
    const file = event.target.files[0]; 
    if (!file) return; 
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result); 
            const workbook = XLSX.read(data, {type: 'array'});
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: ""});
            
            // Build Table Preview HTML (Top 50 rows only to prevent lag)
            let previewHtml = `<table class="excel-imported-table" style="width:100%; border-collapse:collapse; font-size:11px; text-align:center; border:2px solid #cbd5e1; margin-top: 15px;">`;
            rows.slice(0, 50).forEach((row, rIdx) => {
                if(row.length === 0 || row.every(cell => cell === "")) return;
                previewHtml += `<tr>`;
                row.forEach(cell => {
                    if(rIdx === 0) previewHtml += `<th style="background:#1e293b; border:1px solid #94a3b8; padding:8px; font-weight:bold; color:#ffffff;">${cell}</th>`;
                    else previewHtml += `<td style="border:1px solid #94a3b8; padding:6px; color:#0f172a; font-weight:bold;">${cell}</td>`;
                });
                previewHtml += `</tr>`;
            });
            previewHtml += `</table>`;
            
            // Auto Detect Header Row (mencari baris yang ada tulisan "DENOM")
            let denomColIdx = -1; 
            let headerRowIdx = -1; 
            let headersList = [];
            
            for(let i = 0; i < Math.min(rows.length, 20); i++) {
                let cDenom = rows[i].findIndex(c => String(c).toUpperCase().trim() === 'DENOM');
                if (cDenom !== -1) { 
                    denomColIdx = cDenom; 
                    headerRowIdx = i; 
                    headersList = rows[i];
                    break; 
                }
            }

            if(denomColIdx === -1) {
                return typeof Swal !== 'undefined' ? Swal.fire('Peringatan', 'Format Excel salah: Kolom DENOM tidak ditemukan.', 'warning') : alert('Format Excel salah');
            }

            // Simpan data Excel secara Global berdasarkan Mode
            window.excelRowsData[mode] = rows;
            window.excelHeaderRowIdx[mode] = headerRowIdx;
            window.excelDenomColIdx[mode] = denomColIdx;
            
            // Buat HTML Pilihan Dropdown Kolom
            let selectorHtml = `
                <div class="h1-column-selector">
                    <label>🔍 PILIH KOLOM DATA UNTUK SALDO H+1:</label>
                    <select id="select-col-h1-${mode}" onchange="applyExcelColumn('${mode}')">
                        <option value="">-- Pilih Nama Kolom --</option>
            `;
            
            let defaultSelectedIdx = -1;
            headersList.forEach((h, idx) => {
                let colName = String(h).trim();
                if(colName && colName !== "") {
                    let isSelected = '';
                    // Deteksi otomatis pilihan default
                    if(colName.toUpperCase().includes('SALDO PAGI H+1') || colName.toUpperCase().includes('SALDO')) {
                        if(defaultSelectedIdx === -1) { 
                            defaultSelectedIdx = idx; 
                            isSelected = 'selected'; 
                        }
                    }
                    selectorHtml += `<option value="${idx}" ${isSelected}>${colName}</option>`;
                }
            });
            
            selectorHtml += `
                    </select>
                    <button type="button" onclick="applyExcelColumn('${mode}')">Terapkan Data Kolom</button>
                </div>
            `;
            
            // Tampilkan Dropdown dan Preview Tabel
            document.getElementById(`excel-preview-container-${mode}`).innerHTML = selectorHtml + previewHtml;
            document.getElementById(`excel-preview-wrapper-${mode}`).style.display = 'block';

            // Jika ada kolom Saldo Pagi, langsung eksekusi apply
            if(defaultSelectedIdx !== -1) {
                applyExcelColumn(mode);
            } else {
                if(typeof Swal !== 'undefined') Swal.fire('Info', 'Silakan pilih sendiri kolom Saldo H+1 dari dropdown yang muncul.', 'info');
            }
            
        } catch(err) { 
            if(typeof Swal !== 'undefined') Swal.fire('Error', 'Gagal memproses file Excel.', 'error'); 
        }
        event.target.value = '';
    }; 
    reader.readAsArrayBuffer(file);
}

// Fungsi Pengeksekusi Penarikan Data dari Pilihan Dropdown
function applyExcelColumn(mode) {
    let selectEl = document.getElementById(`select-col-h1-${mode}`);
    if(!selectEl || selectEl.value === "") return;

    let saldoH1ColIdx = parseInt(selectEl.value);
    let rows = window.excelRowsData[mode];
    let denomColIdx = window.excelDenomColIdx[mode];
    let startRowIdx = window.excelHeaderRowIdx[mode] + 1;

    window.h1DataRp[mode] = {};
    let matchCount = 0;

    for(let i = startRowIdx; i < rows.length; i++) {
        let row = rows[i];
        if(!row) continue;
        
        let rawDenom = String(row[denomColIdx] || '').toUpperCase();
        let denomStr = rawDenom.replace(/[^0-9]/g, '');

        let rawNominal = String(row[saldoH1ColIdx] || '');
        if (rawNominal.includes(',')) rawNominal = rawNominal.split(',')[0];
        let nominalVal = parseInt(rawNominal.replace(/[^0-9\-]/g, ''));

        if(denomStr && !isNaN(nominalVal)) {
            let denomVal = parseInt(denomStr);
            let type = 'kertas';

            if (rawDenom.includes('KOIN') || rawDenom.includes('COIN') || rawDenom.includes('C')) {
                type = 'koin';
            } else if (rawDenom.includes('KERTAS') || rawDenom.includes('KTS')) {
                type = 'kertas';
            } else {
                if ([500, 200, 100, 50].includes(denomVal)) type = 'koin';
                else if (denomVal === 1000) type = window.h1DataRp[mode]['kertas_1000'] !== undefined ? 'koin' : 'kertas';
                else type = 'kertas';
            }

            window.h1DataRp[mode][type + '_' + denomVal] = nominalVal;
            matchCount++;
        }
    }

    calculateClosing(mode);

    if(matchCount > 0) {
        if(typeof Swal !== 'undefined') Swal.fire({title: 'Sukses', text: `Data ditarik (${matchCount} denom) berdasarkan kolom yang Anda pilih.`, icon: 'success', timer: 1500, showConfirmButton: false});
    } else {
        if(typeof Swal !== 'undefined') Swal.fire('Peringatan', 'Tidak ada data angka valid di kolom tersebut.', 'warning');
    }
}

// -----------------------------------------------------
// FUNGSI EXPORT EXCEL (HTML BLOB) & CETAK JPG
// -----------------------------------------------------
function exportExcelClosingBCA(mode) {
    if(!cekAksesBCA('bca_view')) return Swal.fire("Ditolak", "Anda tidak memiliki izin Cetak/Export.", "error");
    calculateClosing(mode); 

    let table = document.getElementById(`tabel-export-final-${mode}`);
    if(!table) return alert('Silakan lakukan kalkulasi saldo terlebih dahulu!');
    
    let cloneTable = table.cloneNode(true);
    cloneTable.querySelectorAll('.closing-data-row').forEach(tr => {
        let denom = tr.getAttribute('data-denom'); 
        let type = tr.getAttribute('data-type');
        
        if(type === 'koin') {
            tr.cells[0].innerText = denom; 
        } else if(type === 'kertas') {
            tr.cells[0].innerText = "Rp " + denom;
        }
    });

    let htmlContent = cloneTable.outerHTML;
    let template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; font-family: 'Arial', sans-serif; } 
                td, th { border: 1px solid #cbd5e1; padding: 5px; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
    </html>`;

    let blob = new Blob([template], { type: 'application/vnd.ms-excel' });
    let url = URL.createObjectURL(blob); 
    let a = document.createElement('a'); 
    a.href = url;
    a.download = `Laporan_Closing_BCA_${mode.toUpperCase()}_` + new Date().toISOString().split('T')[0] + ".xls";
    
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a);
}

function cetakJPGBCA(mode) {
    if(!cekAksesBCA('bca_view')) return Swal.fire("Ditolak", "Anda tidak memiliki izin Cetak/Export.", "error");
    if(typeof html2canvas === 'undefined') return alert('Library html2canvas belum termuat!');
    
    calculateClosing(mode); 
    const el = document.getElementById(`cetak-preview-bca-${mode}`); 
    if(!el) return;
    
    const originalMaxHeight = el.style.maxHeight; 
    const originalOverflow = el.style.overflow;
    el.style.maxHeight = 'none'; 
    el.style.overflow = 'visible';
    
    let wrap = el.querySelector('div[style*="overflow-x: auto"]');
    if(wrap) { 
        wrap.style.overflowX = 'visible'; 
        wrap.style.width = 'max-content'; 
    }

    setTimeout(() => {
        html2canvas(el, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
            el.style.maxHeight = originalMaxHeight; 
            el.style.overflow = originalOverflow; 
            
            if(wrap) { 
                wrap.style.overflowX = 'auto'; 
                wrap.style.width = '100%'; 
            }
            
            let link = document.createElement('a'); 
            link.download = `Tabel_Closing_BCA_${mode.toUpperCase()}_` + new Date().toISOString().split('T')[0] + ".jpg"; 
            link.href = canvas.toDataURL('image/jpeg', 0.9); 
            link.click();
            
        }).catch(err => { 
            console.error(err); 
            alert("Terjadi kesalahan."); 
        });
    }, 500); 
}

// ==========================================
// 6. ROUTER AKSI (TAMBAH, EDIT, HAPUS BERDASARKAN TAB)
// ==========================================
function getCurrentActiveSubTabId() {
    return window.activeFisikSubTabs[window.currentGlobalMode];
}

function handleActionAdd() {
    if(!cekAksesBCA('bca_input')) return;
    if(window.currentActiveTabBCA === 'fisik-prosesan') createNewAreaByUser();
    else if(window.currentActiveTabBCA === 'pending-sortir') addDynamicColumn('pending');
    else if(window.currentActiveTabBCA === 'pemakaian-uang') addDynamicColumn('pemakaian');
}

function handleActionEdit() {
    if(!cekAksesBCA('bca_edit')) return;
    if(window.currentActiveTabBCA === 'fisik-prosesan') editCurrentAreaName();
    else if(window.currentActiveTabBCA === 'pending-sortir') editDynamicColumn('pending');
    else if(window.currentActiveTabBCA === 'pemakaian-uang') editDynamicColumn('pemakaian');
}

function handleActionDelete() {
    if(!cekAksesBCA('bca_hapus')) return;
    if(window.currentActiveTabBCA === 'fisik-prosesan') deleteCurrentArea();
    else if(window.currentActiveTabBCA === 'pending-sortir') deleteDynamicColumn('pending');
    else if(window.currentActiveTabBCA === 'pemakaian-uang') deleteDynamicColumn('pemakaian');
}

function createNewAreaByUser() {
    if(!cekAksesBCA('bca_input')) return;
    let mode = window.currentGlobalMode;
    
    if(typeof Swal !== 'undefined') {
        Swal.fire({
            title: `Buat Area Baru (${mode.toUpperCase()})`, 
            input: 'text', 
            inputPlaceholder: 'Nama Area',
            showCancelButton: true, 
            confirmButtonText: 'Buat'
        }).then((res) => {
            if (res.isConfirmed && res.value) {
                let newId = (mode === 'utama' ? 'u-' : 't-') + res.value.toLowerCase().replace(/[^a-z0-9]/g, '-');
                addFisikSubTab(newId, res.value.toUpperCase(), mode); 
                openFisikSubTab(newId, mode);
            }
        });
    } else {
        let val = prompt(`Masukkan Nama Area Baru (${mode.toUpperCase()}):`);
        if (val) {
            let newId = (mode === 'utama' ? 'u-' : 't-') + val.toLowerCase().replace(/[^a-z0-9]/g, '-');
            addFisikSubTab(newId, val.toUpperCase(), mode); 
            openFisikSubTab(newId, mode);
        }
    }
}

function editCurrentAreaName() {
    if(!cekAksesBCA('bca_edit')) return;
    let activeId = getCurrentActiveSubTabId(); 
    let mode = window.currentGlobalMode;
    
    if(!activeId) return typeof Swal !== 'undefined' ? Swal.fire('Oops', 'Pilih area terlebih dahulu.', 'warning') : alert('Pilih area');
    
    let btn = document.getElementById(`btn-subtab-${activeId}`);
    
    if(typeof Swal !== 'undefined') {
        Swal.fire({ 
            title: 'Edit Nama Area', 
            input: 'text', 
            inputValue: btn.innerText, 
            showCancelButton: true, 
            confirmButtonText: 'Simpan' 
        }).then((res) => {
            if (res.isConfirmed && res.value) {
                btn.innerText = res.value.toUpperCase();
                let titleEl = document.querySelector(`#subtab-${activeId} .table-title`);
                if(titleEl) titleEl.innerHTML = `🗂️ ${res.value.toUpperCase()} [${mode.toUpperCase()}]`;
            }
        });
    } else {
        let val = prompt("Masukkan Nama Area Baru:", btn.innerText);
        if (val) {
            btn.innerText = val.toUpperCase();
            let titleEl = document.querySelector(`#subtab-${activeId} .table-title`);
            if(titleEl) titleEl.innerHTML = `🗂️ ${val.toUpperCase()} [${mode.toUpperCase()}]`;
        }
    }
}

function deleteCurrentArea() {
    if(!cekAksesBCA('bca_hapus')) return;
    let activeId = getCurrentActiveSubTabId(); 
    let mode = window.currentGlobalMode;
    
    if(!activeId) return typeof Swal !== 'undefined' ? Swal.fire('Oops', 'Pilih area terlebih dahulu.', 'warning') : alert('Pilih area');
    
    if(typeof Swal !== 'undefined') {
        Swal.fire({ 
            title: 'Hapus Area?', 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef4444', 
            confirmButtonText: 'Hapus' 
        }).then((res) => {
            if (res.isConfirmed) {
                let btn = document.getElementById(`btn-subtab-${activeId}`); 
                let content = document.getElementById(`subtab-${activeId}`);
                
                if(btn) btn.remove(); 
                if(content) content.remove();
                
                window.activeFisikSubTabs[mode] = '';
                Swal.fire('Terhapus!', 'Data area berhasil dihapus.', 'success');
            }
        });
    } else {
        if(confirm('Hapus Area?')){
             let btn = document.getElementById(`btn-subtab-${activeId}`); 
             let content = document.getElementById(`subtab-${activeId}`);
             
             if(btn) btn.remove(); 
             if(content) content.remove(); 
             window.activeFisikSubTabs[mode] = '';
        }
    }
}

function addDynamicColumn(type) {
    if(!cekAksesBCA('bca_input')) return;
    let mode = window.currentGlobalMode;
    let title = type === 'pending' ? 'Pending Unsortir' : 'Pemakaian Uang';
    let tableId = type === 'pending' ? `table-pending-bca-${mode}` : `pemakaian-table-${mode}`;
    let inputClass = type === 'pending' ? 'pending-input' : 'pemakaian-input';
    let calcFunc = type === 'pending' ? `calculatePending('${mode}')` : `calculateGeneric('pemakaian', '${mode}')`;
    
    Swal.fire({ 
        title: `Tambah Kolom ${title} (${mode.toUpperCase()})`, 
        input: 'text', 
        showCancelButton: true 
    }).then(res => {
        if(res.isConfirmed && res.value) {
            let colName = res.value.toUpperCase(); 
            let table = document.getElementById(tableId);
            let thead = table.querySelector('thead'); 
            let headerRows = thead.querySelectorAll('tr');
            
            let titleTh = headerRows[0].querySelector('th'); 
            titleTh.colSpan = parseInt(titleTh.colSpan || 1) + 1;
            
            let headerRow = headerRows[1]; 
            let totalTh = headerRow.lastElementChild;
            let newTh = document.createElement('th'); 
            
            newTh.style.cssText = `background: #2563eb; color: white; border: 1px solid #1e293b; padding:10px;`; 
            newTh.innerText = colName; 
            headerRow.insertBefore(newTh, totalTh);
            
            let tbody = table.querySelector('tbody');
            tbody.querySelectorAll('tr').forEach(tr => {
                if(tr.children.length === 1 && tr.firstElementChild.colSpan > 1) { 
                    tr.firstElementChild.colSpan = parseInt(tr.firstElementChild.colSpan || 1) + 1; 
                    return; 
                }
                
                let totalTd = tr.lastElementChild; 
                let newTd = document.createElement('td'); 
                newTd.style.cssText = "border:1px solid #cbd5e1;";
                newTd.innerHTML = `<input type="number" min="0" value="0" class="${inputClass}" style="width:100%; padding:8px; border:none; background:transparent; text-align:center; font-weight:bold;" onfocus="if(this.value=='0')this.value=''" onblur="if(this.value=='')this.value='0'" oninput="${calcFunc}">`;
                tr.insertBefore(newTd, totalTd);
            });
        }
    });
}

function editDynamicColumn(type) {
    if(!cekAksesBCA('bca_edit')) return;
    let mode = window.currentGlobalMode;
    let tableId = type === 'pending' ? `table-pending-bca-${mode}` : `pemakaian-table-${mode}`;
    
    let table = document.getElementById(tableId); 
    let headerRow = table.querySelector('thead tr:nth-child(2)');
    let headers = Array.from(headerRow.querySelectorAll('th'));
    let options = {}; 
    
    for(let i = 1; i < headers.length - 1; i++) { 
        options[i] = headers[i].innerText; 
    }
    
    if(Object.keys(options).length === 0) return Swal.fire('Oops', 'Tidak ada kolom cabang.', 'warning');
    
    Swal.fire({ 
        title: 'Pilih Kolom', 
        input: 'select', 
        inputOptions: options, 
        showCancelButton: true 
    }).then(res => {
        if(res.isConfirmed && res.value) {
            let colIdx = res.value;
            Swal.fire({ 
                title: 'Ubah Nama Kolom', 
                input: 'text', 
                inputValue: options[colIdx], 
                showCancelButton: true 
            }).then(resEdit => {
                if(resEdit.isConfirmed && resEdit.value) headers[colIdx].innerText = resEdit.value.toUpperCase();
            });
        }
    });
}

function deleteDynamicColumn(type) {
    if(!cekAksesBCA('bca_hapus')) return;
    let mode = window.currentGlobalMode;
    let tableId = type === 'pending' ? `table-pending-bca-${mode}` : `pemakaian-table-${mode}`;
    let calcFunc = type === 'pending' ? () => calculatePending(mode) : () => calculateGeneric('pemakaian', mode);
    
    let table = document.getElementById(tableId); 
    let headerRows = table.querySelector('thead').querySelectorAll('tr');
    let headerRow = headerRows[1]; 
    let headers = Array.from(headerRow.querySelectorAll('th'));
    
    let options = {}; 
    for(let i = 1; i < headers.length - 1; i++) { 
        options[i] = headers[i].innerText; 
    }
    
    if(Object.keys(options).length === 0) return Swal.fire('Oops', 'Tidak ada kolom yang bisa dihapus.', 'warning');
    
    Swal.fire({ 
        title: 'Hapus Kolom', 
        input: 'select', 
        inputOptions: options, 
        showCancelButton: true, 
        confirmButtonColor: '#ef4444', 
        confirmButtonText: 'Hapus' 
    }).then(res => {
        if(res.isConfirmed && res.value) {
            let colIdx = parseInt(res.value);
            
            let titleTh = headerRows[0].querySelector('th'); 
            titleTh.colSpan = parseInt(titleTh.colSpan || 1) - 1;
            
            headerRow.removeChild(headers[colIdx]);
            
            let tbody = table.querySelector('tbody');
            tbody.querySelectorAll('tr').forEach(tr => {
                if(tr.children.length === 1 && tr.firstElementChild.colSpan > 1) {
                    tr.firstElementChild.colSpan = parseInt(tr.firstElementChild.colSpan || 1) - 1;
                } else { 
                    tr.removeChild(tr.children[colIdx]); 
                } 
            });
            calcFunc();
        }
    });
}

function prosesEODBCA() {
    if(!cekAksesBCA('bca_eod')) return Swal.fire("Akses Ditolak", "Anda tidak memiliki hak untuk melakukan EOD.", "error");
    
    if(typeof Swal !== 'undefined') {
        Swal.fire({ 
            title: 'Proses EOD BCA?', 
            text: "Data riwayat (Utama & Titipan) akan di-reset menjadi 0.", 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef4444', 
            confirmButtonText: 'Ya, EOD Sekarang!' 
        }).then((result) => { 
            if (result.isConfirmed) { 
                eksekusiResetEOD(); 
                Swal.fire('EOD Selesai', 'Proses akhir hari selesai.', 'success'); 
            } 
        });
    } else {
        if(confirm('Proses EOD BCA? Data riwayat (Utama & Titipan) akan di-reset menjadi 0.')) { 
            eksekusiResetEOD(); 
            alert('EOD Selesai'); 
        }
    }
}

function eksekusiResetEOD() {
    document.querySelectorAll('.in-val, .pending-input, .pemakaian-input, .cl-mut-selisih, .mod-lembar').forEach(input => input.value = 0);
    document.querySelectorAll('.out-total, .pemakaian-row-total, .closing-row-total').forEach(total => total.value = 'Rp 0');
    document.querySelectorAll('.pending-row-total').forEach(total => total.value = '0');
    
    window.h1DataRp = { utama: {}, titipan: {} };
    window.excelRowsData = { utama: null, titipan: null };
    
    ['utama', 'titipan'].forEach(mode => {
        document.getElementById(`excel-preview-container-${mode}`).innerHTML = '';
        document.getElementById(`excel-preview-wrapper-${mode}`).style.display = 'none';
        
        const autoRadio = document.querySelector(`input[name="h1_mode_${mode}"][value="otomatis"]`);
        if (autoRadio) { 
            autoRadio.checked = true; 
            setH1Mode(mode, 'otomatis'); 
        }
    });

    document.querySelectorAll('.table-wrapper').forEach(wrapper => { 
        let firstInput = wrapper.querySelector('.in-val'); 
        if(firstInput) calculate(firstInput); 
    });
    
    ['utama', 'titipan'].forEach(mode => { 
        calculatePending(mode); 
        calculateGeneric('pemakaian', mode); 
        calculateClosing(mode); 
    });
}