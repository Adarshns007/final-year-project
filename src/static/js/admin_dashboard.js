/**
 * admin_dashboard.js: Client-side logic for the Admin Dashboard overview page.
 * Enforces admin role check, fetches system metrics/user list, and renders charts.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ensure user is authenticated and redirect if not.
    checkAuthAndRedirect(true); 
    
    let adminRoleCheck = false;

    // Perform client-side role check immediately
    if (isLoggedIn()) {
        const token = getAuthToken();
        const payload = decodeJwt(token);
        
        if (payload && payload.role === 'admin') {
            adminRoleCheck = true;
            loadAdminData();
        }
    }

    if (!adminRoleCheck) {
        alert('Access Denied. Redirecting to user dashboard.');
        window.location.href = '/dashboard';
    }
});

// Global chart instance for admin dashboard
let globalDiseaseChartInstance = null;

// Helper function to make an admin-required API call (must be defined in api.js)
const adminApiCall = (endpoint, method = 'GET', body = null) => apiCall(endpoint, method, body, true);


/**
 * Fetches and renders all admin data.
 */
async function loadAdminData() {
    await loadAdminMetrics();
    await loadAdminUsers();
}

/**
 * Fetches and renders system metrics and disease distribution data.
 */
async function loadAdminMetrics() {
    const metricsGrid = document.getElementById('metricsGrid');
    
    try {
        // GET /api/admin/metrics
        const response = await adminApiCall('/api/admin/metrics', 'GET');
        const { metrics, disease_distribution } = response;
        
        // --- 1. Render Metrics (Populates the styled HTML grid) ---
        metricsGrid.innerHTML = `
            <div class="metric-card"><h4>${metrics.total_users}</h4><p>Total Users</p></div>
            <div class="metric-card"><h4>${metrics.total_scans}</h4><p>Total Scans</p></div>
            <div class="metric-card"><h4>${metrics.total_farms}</h4><p>Total Farms</p></div>
            <div class="metric-card"><h4>${metrics.total_trees}</h4><p>Total Trees</p></div>
        `;
        
        // --- 2. Render Disease Distribution Chart ---
        renderGlobalDiseaseChart(disease_distribution);

    } catch (error) {
        console.error("Error loading admin metrics:", error);
        metricsGrid.innerHTML = '<p style="grid-column: 1 / -1; color:red;">Failed to load metrics. Check API status.</p>';
        document.getElementById('globalDiseaseChartCanvas').parentElement.innerHTML = 'Error loading chart data.';
    }
}

/**
 * Renders the global disease distribution Pie Chart using Chart.js, including percentages list.
 */
function renderGlobalDiseaseChart(distributionData) {
    // Ensure the canvas context exists
    const canvas = document.getElementById('globalDiseaseChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const labels = Object.keys(distributionData);
    const dataValues = Object.values(distributionData);
    
    // Calculate total scans to determine percentages
    const totalScans = dataValues.reduce((sum, value) => sum + value, 0);

    // Simple color assignment for chart segments
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#5cb85c', '#c9c9c9'
    ]; 

    // Destroy previous chart instance if it exists
    if (globalDiseaseChartInstance) {
        globalDiseaseChartInstance.destroy();
    }
    
    globalDiseaseChartInstance = new Chart(ctx, {
        type: 'doughnut', // Changed to doughnut for a modern look
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allows chart to fill container nicely
            plugins: {
                legend: {
                    position: 'bottom', // Move legend to bottom
                    labels: {
                        boxWidth: 10,
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            // Show percentage in the tooltip
                            const percentage = totalScans > 0 ? ((context.raw / totalScans) * 100).toFixed(1) + '%' : '0%';
                            return `${label} ${context.raw} scans (${percentage})`;
                        }
                    }
                }
            }
        }
    });

    // RENDER PERCENTAGE LIST NEXT TO CHART 
    const distributionList = document.getElementById('distributionList');
    if (distributionList) {
        distributionList.innerHTML = ''; 
        
        if (totalScans > 0) {
            labels.forEach((label, index) => {
                const count = dataValues[index];
                const percentage = ((count / totalScans) * 100).toFixed(1);
                
                const listItem = document.createElement('li');
                listItem.style.color = colors[index % colors.length]; // Use chart color for marker
                listItem.style.fontWeight = 'bold';
                listItem.style.padding = '3px 0';
                
                listItem.innerHTML = `
                    <span style="display: inline-block; width: 10px; height: 10px; background-color: ${colors[index % colors.length]}; border-radius: 50%; margin-right: 5px;"></span>
                    ${label}: ${count} (${percentage}%)
                `;
                distributionList.appendChild(listItem);
            });
        } else {
             distributionList.innerHTML = '<li>No scan data available for distribution.</li>';
        }
    }
}

/**
 * Fetches and renders a list of all users.
 */
async function loadAdminUsers() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return; // Prevent crash if element is missing
    
    usersList.innerHTML = '<li>Loading users...</li>';
    
    try {
        // GET /api/admin/users
        const users = await adminApiCall('/api/admin/users', 'GET');
        
        usersList.innerHTML = '';
        users.slice(0, 8).forEach(user => { // Show top 8 recent users
            const listItem = document.createElement('li');
            listItem.style.padding = '8px 0';
            listItem.style.borderBottom = '1px dashed #eee';
            listItem.innerHTML = `
                <span style="font-weight: bold;">${user.username}</span> 
                (${user.email}) - Role: <span style="color: ${user.role === 'admin' ? 'red' : 'green'}; font-weight: bold;">${user.role.toUpperCase()}</span>
            `;
            usersList.appendChild(listItem);
        });

        if (users.length > 8) {
             usersList.innerHTML += `<li style="padding: 8px 0;"><a href="/admin/users">View All Users (${users.length})</a></li>`;
        }

    } catch (error) {
        console.error("Error loading admin users:", error);
        usersList.innerHTML = '<li style="color:red;">Failed to load user list.</li>';
    }
}