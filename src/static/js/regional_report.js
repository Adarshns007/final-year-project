/**
 * regional_report.js: Client-side logic for the Anonymous Regional Disease Report.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    setupEventListeners();
});

let regionalChartInstance = null;

// --- CRITICAL: Client-Side Severity Index (Kept for table/tooltip reference) ---
const DISEASE_SEVERITY_INDEX = {
    'Healthy': 0,
    'Sooty Mould': 1,
    'Powdery Mildew': 2,
    'Gall Midge': 2,
    'Anthracnose': 3,
    'Bacterial Canker': 3,
    'Cutting Weevil': 3,
    'die back': 3,
};

// Reuse the color map from user_statistic.js
const DISEASE_COLOR_MAP = {
    'Anthracnose': '#f0ad4e',
    'Bacterial Canker': '#337ab7',
    'Cutting Weevil': '#9966FF',
    'die back': '#dc3545',
    'Gall Midge': '#ffc107',
    'Powdery Mildew': '#20c997',
    'Sooty Mould': '#6c757d',
};


function setupEventListeners() {
    const detectButton = document.getElementById('autoDetectLocation');
    const generateButton = document.getElementById('generateReport');
    const latInput = document.getElementById('reportLatitude');
    const lonInput = document.getElementById('reportLongitude');

    // 1. Geolocation Logic
    detectButton.addEventListener('click', () => {
        if (!navigator.geolocation) {
            return displayMessage("Geolocation is not supported by your browser.", true);
        }
        
        detectButton.disabled = true;
        detectButton.textContent = 'Detecting...';
        displayMessage("Please allow browser location access.", false);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                latInput.value = position.coords.latitude.toFixed(8);
                lonInput.value = position.coords.longitude.toFixed(8);
                displayMessage("Location detected successfully!", false);
            },
            (error) => {
                displayMessage(`Error detecting location: ${error.message}. Enter manually.`, true);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
        
        setTimeout(() => {
            detectButton.disabled = false;
            detectButton.textContent = 'Detect Current GPS';
        }, 1500);
    });
    
    // 2. Report Generation Logic
    generateButton.addEventListener('click', async () => {
        const latitude = latInput.value;
        const longitude = lonInput.value;
        
        if (!latitude || !longitude) {
            return displayMessage("Please enter or detect both Latitude and Longitude.", true);
        }
        
        generateButton.disabled = true;
        generateButton.textContent = 'Analyzing...';
        
        await loadRegionalStatistics(latitude, longitude);
        
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Report';
    });
}

/**
 * Fetches regional disease counts and prepares data for percentage calculation.
 */
async function loadRegionalStatistics(latitude, longitude) {
    const chartMessage = document.getElementById('chartMessage');
    const summaryContainer = document.getElementById('regionalDataSummary');
    const treatmentContainer = document.getElementById('treatmentSummary'); // NEW CONTAINER

    chartMessage.textContent = 'Fetching data from surrounding 5km...';
    
    // Clear previous results
    if (summaryContainer) summaryContainer.innerHTML = '';
    if (treatmentContainer) treatmentContainer.innerHTML = '';
    
    try {
        const endpoint = `/api/user/regional-stats?latitude=${latitude}&longitude=${longitude}`;
        const response = await apiCall(endpoint, 'GET'); 
        
        const regionalData = response.regional_data || {};
        const topTreatments = response.top_treatments || []; // NEW FIELD
        
        if (Object.keys(regionalData).length === 0) {
            chartMessage.textContent = response.message || 'No active disease outbreaks found within 5km.';
            if (regionalChartInstance) regionalChartInstance.destroy();
            return;
        }
        
        renderRegionalChart(regionalData);
        renderSummaryTable(regionalData);
        renderTopTreatments(topTreatments); // NEW FUNCTION CALL
        
        displayMessage("Regional disease risk assessment loaded successfully.", false);

    } catch (error) {
        chartMessage.textContent = `Failed to load regional data: ${error.message}`;
        displayMessage(error.message || "Failed to load regional data.", true);
        if (regionalChartInstance) regionalChartInstance.destroy();
    }
}

/**
 * Renders the regional disease distribution Doughnut Chart (Option 1).
 */
function renderRegionalChart(distributionData) {
    const canvas = document.getElementById('regionalDiseaseChartCanvas');
    const chartMessage = document.getElementById('chartMessage');
    
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    chartMessage.textContent = ''; 

    const labels = Object.keys(distributionData);
    const rawCounts = Object.values(distributionData);
    const totalScans = rawCounts.reduce((sum, count) => sum + count, 0);
    const colors = labels.map(label => DISEASE_COLOR_MAP[label] || '#cccccc');

    if (regionalChartInstance) {
        regionalChartInstance.destroy();
    }
    
    regionalChartInstance = new Chart(ctx, {
        type: 'doughnut', 
        data: {
            labels: labels,
            datasets: [{
                label: 'Diseased Scans Count',
                data: rawCounts,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: `Regional Disease Distribution (Total Scans: ${totalScans})`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const rawCount = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((rawCount / total) * 100).toFixed(1) + '%' : '0%';
                            
                            return `${label}: ${percentage} (${rawCount} scan${rawCount !== 1 ? 's' : ''})`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Renders the data table summary.
 */
function renderSummaryTable(distributionData) {
    const summaryContainer = document.getElementById('regionalDataSummary');
    if (!summaryContainer) return;
    
    const rawCounts = Object.values(distributionData);
    const totalScans = rawCounts.reduce((sum, count) => sum + count, 0);

    let tableHTML = `
        <h4 style="margin-top: 30px; color: var(--primary-color);">Detailed Disease Breakdown</h4>
        <table class="data-table" style="width: 100%; margin-top: 15px;">
            <thead>
                <tr>
                    <th>Disease</th>
                    <th>Count</th>
                    <th>Percentage</th>
                    <th>Severity Index</th>
                </tr>
            </thead>
            <tbody>
    `;

    const sortedEntries = Object.entries(distributionData)
        .sort(([, countA], [, countB]) => countB - countA);

    sortedEntries.forEach(([disease, count]) => {
        const percentage = totalScans > 0 ? ((count / totalScans) * 100).toFixed(1) + '%' : '0%';
        const severity = DISEASE_SEVERITY_INDEX[disease] || 'N/A';
        const severityColor = severity >= 3 ? 'red' : severity >= 2 ? 'orange' : 'green';
        
        tableHTML += `
            <tr>
                <td>${disease}</td>
                <td>${count}</td>
                <td>${percentage}</td>
                <td style="font-weight: bold; color: ${severityColor};">${severity}</td>
            </tr>
        `;
    });

    tableHTML += `
            <tr style="font-weight: bold; background-color: #f0f0f0;">
                <td>TOTAL</td>
                <td>${totalScans}</td>
                <td>100.0%</td>
                <td>-</td>
            </tr>
            </tbody>
        </table>
    `;
    
    summaryContainer.innerHTML = tableHTML;
}

/**
 * NEW FUNCTION: Renders the treatment solutions for the top 2 diseases.
 */
function renderTopTreatments(topTreatments) {
    const treatmentContainer = document.getElementById('treatmentSummary');
    if (!treatmentContainer) return;

    if (topTreatments.length === 0) {
        treatmentContainer.innerHTML = '';
        return;
    }
    
    let treatmentsHTML = `
        <h2 style="color: #d9534f; margin-top: 40px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
            Action Plan: Top ${topTreatments.length} Regional Threats
        </h2>
        <p style="margin-bottom: 20px;">Based on regional data, here are the most effective treatments for the top prevalent diseases:</p>
    `;

    topTreatments.forEach((threat, index) => {
        const count = threat.count;
        const total = topTreatments.reduce((sum, t) => sum + t.count, 0);
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 'N/A';
        
        treatmentsHTML += `
            <div style="background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; border-left: 5px solid ${DISEASE_COLOR_MAP[threat.name] || '#333'};">
                <h3 style="color: var(--primary-color); margin-top: 0;">
                    ${index + 1}. ${threat.name} <span style="font-size: 0.9em; color: #777;">(${count} scan${count !== 1 ? 's' : ''} reported)</span>
                </h3>
                
                <h4 style="font-size: 1.1em; color: green; margin-top: 15px;">Organic Treatment:</h4>
                <p style="margin-left: 10px;">${threat.organic || 'No specific organic treatment recorded.'}</p>
                
                <h4 style="font-size: 1.1em; color: #d9534f; margin-top: 15px;">Chemical Treatment:</h4>
                <p style="margin-left: 10px;">${threat.chemical || 'No specific chemical treatment recorded.'}</p>
            </div>
        `;
    });
    
    treatmentContainer.innerHTML = treatmentsHTML;
}