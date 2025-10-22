/**
 * user_statistic.js: Client-side logic for the User Statistics page.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    
    // In a real application, Chart.js or similar would be loaded here.
    
    loadStatistics();
    
    document.getElementById('applyFilter').addEventListener('click', loadStatistics);
});


// Helper API function for statistics (must be added to api.js)
const StatsAPI = {
    getStatistics: (startDate, endDate) => {
        let endpoint = '/api/user/statistics';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        return apiCall(endpoint, 'GET');
    }
};

/**
 * Fetches and renders the user's statistics.
 */
async function loadStatistics() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    try {
        displayMessage("Loading statistics...", false);
        
        // This requires implementing the /api/user/statistics backend route
        const data = await StatsAPI.getStatistics(startDate, endDate); 

        renderDiseaseChart(data.disease_distribution);
        renderTreeScanChart(data.tree_scan_counts);
        
        displayMessage("Statistics loaded successfully.", false);

    } catch (error) {
        displayMessage(error.message || "Failed to load statistics data.", true);
        // Clear charts on error
        document.getElementById('diseaseChart').textContent = 'Error loading data.';
        document.getElementById('treeScanChart').textContent = 'Error loading data.';
    }
}

/**
 * Renders the disease distribution chart data (placeholder).
 */
function renderDiseaseChart(distributionData) {
    const chartDiv = document.getElementById('diseaseChart');
    const legend = document.getElementById('diseaseLegend');
    chartDiv.innerHTML = '<p style="text-align: center;">Chart Placeholder (Use Chart.js)</p>';
    legend.innerHTML = '';
    
    // Convert object to array for rendering
    const sortedData = Object.entries(distributionData)
        .sort(([, a], [, b]) => b - a);

    let total = sortedData.reduce((sum, [key, count]) => sum + count, 0);
    
    sortedData.forEach(([disease, count]) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        const listItem = document.createElement('li');
        listItem.textContent = `${disease}: ${count} (${percentage}%)`;
        legend.appendChild(listItem);
    });
}

/**
 * Renders the tree scan counts chart data (placeholder).
 */
function renderTreeScanChart(treeScanCounts) {
    const chartDiv = document.getElementById('treeScanChart');
    const legend = document.getElementById('treeScanLegend');
    chartDiv.innerHTML = '<p style="text-align: center;">Chart Placeholder (Use Chart.js)</p>';
    legend.innerHTML = '';

    let total = treeScanCounts.reduce((sum, item) => sum + item.count, 0);
    
    treeScanCounts.forEach(item => {
        const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
        const listItem = document.createElement('li');
        listItem.textContent = `${item.tree_name}: ${item.count} (${percentage}%)`;
        legend.appendChild(listItem);
    });
}

// Global chart instances to be able to destroy and re-render them
let diseaseChartInstance = null;
let treeChartInstance = null;

// Helper API function for statistics (must be added to api.js)
const StatsAPI = {
    getStatistics: (startDate, endDate) => {
        let endpoint = '/api/user/statistics';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        return apiCall(endpoint, 'GET');
    }
};

/**
 * Fetches and renders the user's statistics.
 */
async function loadStatistics() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    try {
        displayMessage("Loading statistics...", false);
        
        const data = await StatsAPI.getStatistics(startDate, endDate); 
        
        if (data.total_scans === 0) {
            // Handle empty data state
            document.getElementById('diseaseChartCanvas').parentElement.innerHTML = '<p style="text-align: center;">No scan data for this period.</p>';
            document.getElementById('treeScanChartCanvas').parentElement.innerHTML = '<p style="text-align: center;">No tree data for this period.</p>';
            document.getElementById('diseaseLegend').innerHTML = '';
            document.getElementById('treeScanLegend').innerHTML = '';
            displayMessage(data.message || "Statistics loaded (No data).", false);
            return;
        }

        renderDiseaseChart(data.disease_distribution);
        renderTreeScanChart(data.tree_scan_counts);
        
        displayMessage("Statistics loaded successfully.", false);

    } catch (error) {
        displayMessage(error.message || "Failed to load statistics data.", true);
        // Clear charts on error
        document.getElementById('diseaseChartCanvas').parentElement.innerHTML = 'Error loading data.';
        document.getElementById('treeScanChartCanvas').parentElement.innerHTML = 'Error loading data.';
    }
}

/**
 * Renders the disease distribution Pie Chart.
 */
function renderDiseaseChart(distributionData) {
    const ctx = document.getElementById('diseaseChartCanvas').getContext('2d');
    
    // Convert object data to Chart.js format
    const labels = Object.keys(distributionData);
    const dataValues = Object.values(distributionData);
    
    const colors = labels.map(label => label === 'Healthy' ? '#5cb85c' : '#f0ad4e');

    // Destroy previous chart instance if it exists
    if (diseaseChartInstance) {
        diseaseChartInstance.destroy();
    }
    
    diseaseChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                    }
                },
                title: {
                    display: false,
                }
            }
        }
    });
    // Remove the simple legend and let Chart.js handle it, or modify to show custom legend
    document.getElementById('diseaseLegend').innerHTML = ''; 
}

/**
 * Renders the tree scan counts Bar Chart.
 */
function renderTreeScanChart(treeScanCounts) {
    const ctx = document.getElementById('treeScanChartCanvas').getContext('2d');
    
    const labels = treeScanCounts.map(item => item.tree_name);
    const dataValues = treeScanCounts.map(item => item.count);

    // Destroy previous chart instance if it exists
    if (treeChartInstance) {
        treeChartInstance.destroy();
    }

    treeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Scans per Tree',
                data: dataValues,
                backgroundColor: '#337ab7', // Blue color
                borderColor: '#2e6217',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Scans'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false,
                },
            }
        }
    });
    document.getElementById('treeScanLegend').innerHTML = '';
}