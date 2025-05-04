document.addEventListener('DOMContentLoaded', function() {
    const firebaseConfig = {
        apiKey: "AIzaSyDKmLXcBbT7tp4sQVmxEXtpB7Q-3tNfgQg",
        databaseURL: "https://iot-wuluh-default-rtdb.firebaseio.com/",
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    let chartInstance = null;
    let currentPage = 1;
    let pageSize = 10;
    let allData = [];
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    fetchData();
    
    document.getElementById('load-more').addEventListener('click', function() {
        currentPage++;
        renderTableData();
    });
    
    function updateDateTime() {
        const now = new Date();
        document.getElementById('current-date').textContent = formatDate(now);
        document.getElementById('current-time').textContent = formatTime(now);
    }
    
    function formatDate(date) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    }
    
    function formatTime(date) {
        return date.toLocaleTimeString('id-ID');
    }
    
    function fetchData() {
        const suhuRef = database.ref('riwayat/riwayat_suhu');
        const kelembapanRef = database.ref('riwayat/riwayat_kelembapan');
        const beratRef = database.ref('riwayat/riwayat_berat');
        
        Promise.all([
            suhuRef.once('value'),
            kelembapanRef.once('value'),
            beratRef.once('value')
        ]).then(function(snapshots) {
            const suhuData = snapshots[0].val() || {};
            const kelembapanData = snapshots[1].val() || {};
            const beratData = snapshots[2].val() || {};
            
            processData(suhuData, kelembapanData, beratData);
        }).catch(function(error) {
            console.error('Error fetching data:', error);
            document.getElementById('table-body').innerHTML = 
                `<tr><td colspan="4" class="text-center text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
                </td></tr>`;
        });
    }
    
    function processData(suhuData, kelembapanData, beratData) {
        allData = [];
        const timestamps = new Set();
        
        Object.keys(suhuData).forEach(key => timestamps.add(suhuData[key].timestamp));
        Object.keys(kelembapanData).forEach(key => timestamps.add(kelembapanData[key].timestamp));
        Object.keys(beratData).forEach(key => timestamps.add(beratData[key].timestamp));
        
        Array.from(timestamps).sort().forEach(timestamp => {
            const suhuEntry = Object.values(suhuData).find(entry => entry.timestamp === timestamp);
            const kelembapanEntry = Object.values(kelembapanData).find(entry => entry.timestamp === timestamp);
            const beratEntry = Object.values(beratData).find(entry => entry.timestamp === timestamp);
            
            allData.push({
                timestamp: timestamp,
                suhu: suhuEntry ? suhuEntry.nilai : null,
                kelembapan: kelembapanEntry ? kelembapanEntry.nilai : null,
                berat: beratEntry ? beratEntry.nilai : null
            });
        });
        
        allData.reverse();
        
        renderTableData();
        renderChart();
    }
    
    function renderTableData() {
        const tableBody = document.getElementById('table-body');
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageData = allData.slice(start, end);
        
        if (currentPage === 1) {
            tableBody.innerHTML = '';
        }
        
        if (pageData.length === 0 && currentPage === 1) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Tidak ada data</td></tr>`;
            return;
        }
        
        pageData.forEach(item => {
            const row = document.createElement('tr');
            
            const timestampCell = document.createElement('td');
            const date = new Date(item.timestamp);
            timestampCell.textContent = `${formatDate(date)} ${formatTime(date)}`;
            row.appendChild(timestampCell);
            
            const suhuCell = document.createElement('td');
            suhuCell.textContent = item.suhu !== null ? item.suhu.toFixed(1) : '-';
            row.appendChild(suhuCell);
            
            const kelembapanCell = document.createElement('td');
            kelembapanCell.textContent = item.kelembapan !== null ? item.kelembapan : '-';
            row.appendChild(kelembapanCell);
            
            const beratCell = document.createElement('td');
            beratCell.textContent = item.berat !== null ? item.berat : '-';
            row.appendChild(beratCell);
            
            tableBody.appendChild(row);
        });
        
        document.getElementById('data-info').textContent = `Menampilkan ${Math.min(end, allData.length)} dari ${allData.length} data`;
        
        document.getElementById('load-more').style.display = end < allData.length ? 'block' : 'none';
    }
    
    function renderChart() {
        const ctx = document.getElementById('chart-canvas').getContext('2d');
        
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        const chartData = allData.slice(0, 20).reverse();
        
        const labels = chartData.map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
        });
        
        const suhuDataset = {
            label: 'Suhu (°C)',
            data: chartData.map(item => item.suhu),
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.4,
            fill: true
        };
        
        const kelembapanDataset = {
            label: 'Kelembapan (%)',
            data: chartData.map(item => item.kelembapan),
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.4,
            fill: true
        };
        
        const beratDataset = {
            label: 'Berat (g)',
            data: chartData.map(item => item.berat),
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4,
            fill: true,
            hidden: true
        };
        
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [suhuDataset, kelembapanDataset, beratDataset]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
});