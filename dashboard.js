const firebaseConfig = {
    apiKey: "AIzaSyDKmLXcBbT7tp4sQVmxEXtpB7Q-3tNfgQg",
    databaseURL: "https://iot-wuluh-default-rtdb.firebaseio.com/",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const loadingOverlay = document.getElementById('loadingOverlay');
const currentTimeElement = document.getElementById('current-time');
const suhuValue = document.getElementById('suhu-value');
const kelembapanValue = document.getElementById('kelembapan-value');
const beratValue = document.getElementById('berat-value');
const statusDisplay = document.getElementById('status-display');
const fanControl = document.getElementById('fan-control');
const heaterControl = document.getElementById('heater-control');
const setPointInput = document.getElementById('set-point-input');
const setPointBtn = document.getElementById('set-point-btn');
const currentSetPoint = document.getElementById('current-set-point');
const fanIndicator = document.getElementById('fan-indicator');
const heaterIndicator = document.getElementById('heater-indicator');
const fanStatusText = document.getElementById('fan-status-text');
const heaterStatusText = document.getElementById('heater-status-text');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

let isFirstLoad = true;

document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    setupFirebaseListeners();
    setupEventListeners();
    
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 1500);
});

function updateCurrentTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    currentTimeElement.textContent = now.toLocaleDateString('id-ID', options);
}

function initializeUI() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Sidebar toggle functionality
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    
    // Initialize indicators
    fanIndicator.className = 'status-indicator indicator-off';
    heaterIndicator.className = 'status-indicator indicator-off';
    
    // Set active navigation based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'dashboard.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function setupFirebaseListeners() {
    database.ref('monitoring').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateSensorValues(data);
            updateStatusDisplay(data);
            updateStatusIndicators(data);
            
            if (isFirstLoad) {
                isFirstLoad = false;
                setPointInput.value = data.set_point_suhu || 40;
                currentSetPoint.textContent = data.set_point_suhu || 40;
            }
        }
    });
    
    database.ref('control').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            fanControl.checked = data.fan === "ON";
            heaterControl.checked = data.heater === "ON";
            
            // Update monitoring display with control data
            database.ref('monitoring').once('value').then((monitoringSnapshot) => {
                const monitoringData = monitoringSnapshot.val() || {};
                updateStatusDisplay({
                    ...monitoringData,
                    fan: data.fan, 
                    heater: data.heater
                });
                updateStatusIndicators({
                    fan: data.fan, 
                    heater: data.heater
                });
            });
        }
    });
    
    database.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
            showToast('Terhubung', 'Koneksi ke Firebase berhasil', 'success');
        } else {
            showToast('Terputus', 'Koneksi ke Firebase terputus', 'error');
        }
    });
    
    // Listen for history data (last 5 entries)
    database.ref('riwayat').limitToLast(5).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Process history data if needed
            console.log("Riwayat data updated");
        }
    });
}

function updateSensorValues(data) {
    suhuValue.textContent = data.suhu ? data.suhu.toFixed(1) : '--';
    kelembapanValue.textContent = data.kelembapan ? data.kelembapan.toFixed(1) : '--';
    beratValue.textContent = data.berat ? data.berat.toFixed(1) : '--';
    currentSetPoint.textContent = data.set_point_suhu ? data.set_point_suhu.toFixed(1) : '--';
}

function updateStatusDisplay(data) {
    let displayText = '';
    const timestamp = new Date().toLocaleTimeString();
    
    displayText += `WAKTU: ${timestamp}\n`;
    
    if (data.suhu !== undefined) {
        displayText += `SUHU: ${data.suhu.toFixed(1)}°C\n`;
    }
    
    if (data.kelembapan !== undefined) {
        displayText += `KELEMBAPAN: ${data.kelembapan.toFixed(1)}%\n`;
    }
    
    if (data.berat !== undefined) {
        displayText += `BERAT: ${data.berat.toFixed(1)}g\n`;
    }
    
    if (data.set_point_suhu !== undefined) {
        displayText += `SET POINT: ${data.set_point_suhu.toFixed(1)}°C\n`;
    }
    
    if (data.fan !== undefined) {
        const fanStatus = data.fan === "ON" ? 
            '<span class="status-on">ON</span>' : 
            '<span class="status-off">OFF</span>';
        displayText += `FAN: ${fanStatus}\n`;
    }
    
    if (data.heater !== undefined) {
        const heaterStatus = data.heater === "ON" ? 
            '<span class="status-on">ON</span>' : 
            '<span class="status-off">OFF</span>';
        displayText += `HEATER: ${heaterStatus}\n`;
    }
    
    // Add system status
    displayText += `STATUS: SISTEM AKTIF`;
    
    statusDisplay.innerHTML = displayText;
}

function updateStatusIndicators(data) {
    if (data.fan !== undefined) {
        fanIndicator.className = data.fan === "ON" 
            ? 'status-indicator indicator-on' 
            : 'status-indicator indicator-off';
        fanStatusText.textContent = data.fan === "ON" ? "AKTIF" : "NONAKTIF";
        fanStatusText.className = data.fan === "ON" ? "status-on" : "status-off";
    }
    
    if (data.heater !== undefined) {
        heaterIndicator.className = data.heater === "ON" 
            ? 'status-indicator indicator-on' 
            : 'status-indicator indicator-off';
        heaterStatusText.textContent = data.heater === "ON" ? "AKTIF" : "NONAKTIF";
        heaterStatusText.className = data.heater === "ON" ? "status-on" : "status-off";
    }
}

function setupEventListeners() {
    fanControl.addEventListener('change', function() {
        const newStatus = this.checked ? 'ON' : 'OFF';
        
        // Update control in firebase
        database.ref('control/fan').set(newStatus)
            .then(() => {
                // Also update monitoring
                database.ref('monitoring/fan').set(newStatus)
                    .then(() => {
                        showToast('Sukses', `Kipas ${newStatus}`, 'success');
                    })
                    .catch((error) => {
                        showToast('Error', `Gagal memperbarui status kipas di monitoring`, 'error');
                    });
            })
            .catch((error) => {
                showToast('Error', `Gagal mengubah status kipas`, 'error');
                this.checked = !this.checked;
            });
    });
    
    heaterControl.addEventListener('change', function() {
        const newStatus = this.checked ? 'ON' : 'OFF';
        
        // Update control in firebase
        database.ref('control/heater').set(newStatus)
            .then(() => {
                // Also update monitoring
                database.ref('monitoring/heater').set(newStatus)
                    .then(() => {
                        showToast('Sukses', `Pemanas ${newStatus}`, 'success');
                    })
                    .catch((error) => {
                        showToast('Error', `Gagal memperbarui status pemanas di monitoring`, 'error');
                    });
            })
            .catch((error) => {
                showToast('Error', `Gagal mengubah status pemanas`, 'error');
                this.checked = !this.checked;
            });
    });
    
    setPointBtn.addEventListener('click', function() {
        const newSetPoint = parseFloat(setPointInput.value);
        
        if (isNaN(newSetPoint) || newSetPoint < 20 || newSetPoint > 80) {
            showToast('Error', 'Nilai set point harus antara 20-80°C', 'error');
            return;
        }
        
        database.ref('monitoring/set_point_suhu').set(newSetPoint)
            .then(() => {
                currentSetPoint.textContent = newSetPoint;
                showToast('Sukses', `Set point suhu diubah menjadi ${newSetPoint}°C`, 'success');
            })
            .catch((error) => {
                showToast('Error', `Gagal mengubah set point`, 'error');
            });
    });
}

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    const toastTime = document.getElementById('toast-time');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toastTime.textContent = new Date().toLocaleTimeString();
    
    toast.className = 'toast';
    
    if (type === 'success') {
        toast.classList.add('bg-success', 'text-white');
    } else if (type === 'error') {
        toast.classList.add('bg-danger', 'text-white');
    } else {
        toast.classList.add('bg-info', 'text-white');
    }
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}