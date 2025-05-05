const firebaseConfig = {
    apiKey: "AIzaSyDKmLXcBbT7tp4sQVmxEXtpB7Q-3tNfgQg",
    databaseURL: "https://iot-wuluh-default-rtdb.firebaseio.com/",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const loadingOverlay = document.getElementById('loadingOverlay');
const currentTimeElement = document.getElementById('current-time');
const historyTableBody = document.getElementById('historyTableBody');
const pagination = document.getElementById('pagination');
const refreshBtn = document.getElementById('refreshBtn');
const exportBtn = document.getElementById('exportBtn');
const chartTypeSelect = document.getElementById('chartType');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

let historyData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 10;
let historyChart;

document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    loadHistoryData();
    setupEventListeners();
    initializeChart();
    
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
    
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
}

function loadHistoryData() {
    database.ref('riwayat').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            historyData = [];
            
            Object.keys(data).forEach(key => {
                historyData.push({
                    id: key,
                    ...data[key]
                });
            });
            
            historyData.sort((a, b) => {
                const timeA = convertToDateTime(a.timestamp);
                const timeB = convertToDateTime(b.timestamp);
                return timeB - timeA;
            });
            
            filteredData = [...historyData];
            updateHistoryTable();
            updateChart();
            
            showToast('Data Diperbarui', 'Data riwayat berhasil dimuat', 'success');
        } else {
            historyTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Tidak ada data riwayat</td></tr>';
            showToast('Informasi', 'Tidak ada data riwayat', 'info');
        }
    });
}

function setupEventListeners() {
    refreshBtn.addEventListener('click', function() {
        loadingOverlay.style.display = 'flex';
        
        database.ref('riwayat').once('value')
            .then(() => {
                loadingOverlay.style.display = 'none';
                showToast('Sukses', 'Data riwayat disegarkan', 'success');
            })
            .catch((error) => {
                loadingOverlay.style.display = 'none';
                showToast('Error', 'Gagal menyegarkan data', 'error');
            });
    });
    
    exportBtn.addEventListener('click', function() {
        if (filteredData.length === 0) {
            showToast('Error', 'Tidak ada data untuk diekspor', 'error');
            return;
        }
        
        exportToCSV();
    });
    
    chartTypeSelect.addEventListener('change', function() {
        updateChart();
    });
}

function updateHistoryTable() {
    historyTableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Tidak ada data riwayat</td></tr>';
        pagination.innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const item = filteredData[i];
        const row = document.createElement('tr');
        
        const fanStatus = item.fan ? item.fan : "-";
        const heaterStatus = item.heater ? item.heater : "-";
        
        const fanBadge = fanStatus === "ON" 
            ? `<span class="status-badge status-on">ON</span>` 
            : fanStatus === "OFF" 
                ? `<span class="status-badge status-off">OFF</span>` 
                : "-";
                
        const heaterBadge = heaterStatus === "ON" 
            ? `<span class="status-badge status-on">ON</span>` 
            : heaterStatus === "OFF" 
                ? `<span class="status-badge status-off">OFF</span>` 
                : "-";
        
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${item.timestamp}</td>
            <td>${item.suhu ? item.suhu.toFixed(1) : '-'}</td>
            <td>${item.kelembapan ? item.kelembapan.toFixed(1) : '-'}</td>
            <td>${item.berat ? item.berat.toFixed(2) : '-'}</td>
            <td>${fanBadge}</td>
            <td>${heaterBadge}</td>
        `;
        
        historyTableBody.appendChild(row);
    }
    
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    pagination.innerHTML = '';
    
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>`;
    pagination.appendChild(prevLi);
    
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(pageLi);
    }
    
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>`;
    pagination.appendChild(nextLi);
    
    document.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                updateHistoryTable();
            }
        });
    });
}

function initializeChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Suhu (°C)',
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                borderWidth: 2,
                data: [],
                tension: 0.4,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Waktu'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Nilai'
                    },
                    beginAtZero: false
                }
            }
        }
    });
}

function updateChart() {
    if (filteredData.length === 0) return;
    
    const type = chartTypeSelect.value;
    let label, data, color, bgColor, yTitle;
    
    switch(type) {
        case 'temperature':
            label = 'Suhu (°C)';
            data = filteredData.map(item => item.suhu || 0);
            color = '#dc3545';
            bgColor = 'rgba(220, 53, 69, 0.1)';
            yTitle = 'Suhu (°C)';
            break;
        case 'humidity':
            label = 'Kelembapan (%)';
            data = filteredData.map(item => item.kelembapan || 0);
            color = '#0d6efd';
            bgColor = 'rgba(13, 110, 253, 0.1)';
            yTitle = 'Kelembapan (%)';
            break;
        case 'weight':
            label = 'Berat (g)';
            data = filteredData.map(item => item.berat || 0);
            color = '#198754';
            bgColor = 'rgba(25, 135, 84, 0.1)';
            yTitle = 'Berat (g)';
            break;
    }
    
    const labels = filteredData.map(item => item.timestamp);
    
    historyChart.data.labels = labels;
    historyChart.data.datasets[0].label = label;
    historyChart.data.datasets[0].data = data;
    historyChart.data.datasets[0].borderColor = color;
    historyChart.data.datasets[0].backgroundColor = bgColor;
    historyChart.options.scales.y.title.text = yTitle;
    
    historyChart.update();
}

function exportToCSV() {
    let csvContent = 'No,Waktu,Suhu (°C),Kelembapan (%),Berat (g),Kipas,Pemanas\n';
    
    filteredData.forEach((item, index) => {
        csvContent += `${index + 1},${item.timestamp},${item.suhu || ''},${item.kelembapan || ''},${item.berat || ''},${item.fan || ''},${item.heater || ''}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `riwayat_belimbing_wuluh_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Sukses', 'File CSV berhasil diunduh', 'success');
}

function convertToDateTime(timeString) {
    const today = new Date();
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
    
    return date;
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