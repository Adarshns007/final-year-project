/**
 * user_statistic.js: Client-side logic for the User Statistics page.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    
    // In a real application, Chart.js or similar would be loaded here.
    
    loadStatistics();
    
    document.getElementById('applyFilter').addEventListener('click', loadStatistics);
});

// Global chart instances to be able to destroy and re-render them
let diseaseChartInstance = null;
let treeChartInstance = null;

// FIX: Centralized Color Map for Disease Classes
const DISEASE_COLOR_MAP = {
    'Healthy': '#5cb85c',        // Green
    'Anthracnose': '#f0ad4e',    // Orange
    'Bacterial Canker': '#337ab7',// Blue
    'Cutting Weevil': '#9966FF',  // Purple
    'die back': '#dc3545',       // Red
    'Gall Midge': '#ffc107',     // Yellow
    'Powdery Mildew': '#20c997',  // Turquoise
    'Sooty Mould': '#6c757d',     // Gray/Slate
};


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
    
    // Ensure chart containers exist in the current scope
    const diseaseChartContainer = document.getElementById('diseaseChartContainer');
    const treeScanChartContainer = document.getElementById('treeScanChartContainer');
    
    try {
        displayMessage("Loading statistics...", false);
        
        const data = await StatsAPI.getStatistics(startDate, endDate); 
        
        if (data.total_scans === 0) {
            // Handle empty data state
            if (diseaseChartContainer) diseaseChartContainer.innerHTML = '<p style="text-align: center;">No scan data for this period.</p>';
            if (treeScanChartContainer) treeScanChartContainer.innerHTML = '<p style="text-align: center;">No tree data for this period.</p>';
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
        if (diseaseChartContainer) diseaseChartContainer.innerHTML = 'Error loading data.';
        if (treeScanChartContainer) treeScanChartContainer.innerHTML = 'Error loading data.';
    }
}

/**
 * Renders the disease distribution Pie Chart.
 */
function renderDiseaseChart(distributionData) {
    const canvas = document.getElementById('diseaseChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Convert object data to Chart.js format
    const labels = Object.keys(distributionData);
    const dataValues = Object.values(distributionData);
    
    // Map labels to the unique colors defined in the map
    const colors = labels.map(label => DISEASE_COLOR_MAP[label] || '#cccccc'); // Fallback to gray

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
            maintainAspectRatio: false, // Crucial for respecting fixed container height
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
    document.getElementById('diseaseLegend').innerHTML = ''; 
}

/**
 * Renders the tree scan counts Bar Chart.
 */
function renderTreeScanChart(treeScanCounts) {
    const canvas = document.getElementById('treeScanChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
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
                backgroundColor: '#337ab7', // Blue color (kept consistent for Bar Chart)
                borderColor: '#2e6217',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Crucial for respecting fixed container height
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