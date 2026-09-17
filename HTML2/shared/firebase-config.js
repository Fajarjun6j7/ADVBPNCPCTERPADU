// Konfigurasi Firebase (Gunakan Database Lama yang Ada Datanya)
const firebaseConfig = { 
    apiKey: "AIzaSyAjFyz-mVD75248aZwkxmjdI4MrhNWyCQg", 
    authDomain: "rostercpcadvbpn-d9c02.firebaseapp.com", 
    databaseURL: "https://rostercpcadvbpn-d9c02-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "rostercpcadvbpn-d9c02", 
    storageBucket: "rostercpcadvbpn-d9c02.firebasestorage.app", 
    messagingSenderId: "278319324849", 
    appId: "1:278319324849:web:5aa712a0c2a4e980e14c90" 
};

// Inisialisasi Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Helper untuk Manajemen Login User
const AuthHelper = {
    setUserSession: function(user) { 
        localStorage.setItem('cpc_user', JSON.stringify(user)); 
    },
    getUserSession: function() { 
        const user = localStorage.getItem('cpc_user'); 
        return user ? JSON.parse(user) : null; 
    },
    checkAccess: function() { 
        const user = this.getUserSession(); 
        if (!user) { 
            alert('Silakan login terlebih dahulu!'); 
            window.location.href = '../portal/index.html'; 
        } 
        return user; 
    },
    
    // ==========================================
    // FUNGSI GLOBAL CEK HAK AKSES
    // ==========================================
    cekAkses: function(kodeAkses, userAksesRealtimeDb = null) {
        const user = this.getUserSession();
        if (!user) return false;
        
        // 1. Bypass otomatis untuk Super Admin
        if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') return true;

        // 2. Pengecekan realtime (jika modul melempar data Firebase terbaru ke fungsi ini)
        if (userAksesRealtimeDb && userAksesRealtimeDb.aksesList) {
            return userAksesRealtimeDb.aksesList.includes(kodeAkses);
        }

        // 3. Fallback pengecekan dari Session Storage (jika diset saat login)
        if (user.aksesList && Array.isArray(user.aksesList)) {
            return user.aksesList.includes(kodeAkses);
        }

        return false; // Tolak jika tidak ada kecocokan
    },

    logout: function() { 
        localStorage.removeItem('cpc_user'); 
        window.location.href = '../portal/index.html'; 
    }
};

// Cek status koneksi internet/database global
document.addEventListener('DOMContentLoaded', () => {
    const statusIndikator = document.getElementById('online-status');
    if(statusIndikator) {
        db.ref('.info/connected').on('value', snap => {
            if (snap.val() === true) { 
                statusIndikator.innerText = "🟢 Tersambung"; 
                statusIndikator.classList.remove('offline'); 
                setTimeout(() => statusIndikator.style.display = 'none', 3000); 
            } else { 
                statusIndikator.innerText = "🔴 Terputus"; 
                statusIndikator.classList.add('offline'); 
                statusIndikator.style.display = 'flex'; 
            }
        });
    }
});