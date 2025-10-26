/**
 * admin_dashboard.js: Client-side logic for the Admin Dashboard overview page.
 * Enforces admin role check, fetches system metrics/user list, and renders charts.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // CRITICAL FIX: Do NOT use checkAuthAndRedirect(true) here as its internal setTimeout 
    // introduces a race condition with the synchronous role check below.
    
    // --- 1. Perform immediate Authentication and Authorization Check ---
    let isAuthenticated = isLoggedIn();
    let isAdmin = false;

    if (isAuthenticated) {
        const token = getAuthToken();
        const payload = decodeJwt(token);
        
        if (payload && payload.role === 'admin') {
            isAdmin = true;
        }
    }

    if (!isAdmin) {
        // If not logged in or not admin, show access denied and redirect immediately.
        alert('Access Denied. Admin privileges required.');
        
        // Decide where to redirect: login if token is missing, dashboard if role is wrong
        const redirectPath = isAuthenticated ? '/dashboard' : '/login';
        
        window.location.href = redirectPath;
        return; // Stop further script execution
    }
    
    // --- 2. If check passes, load data ---
    loadAdminData();
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
        
        // CRITICAL FIX: Safely extract properties using default empty objects
        const metrics = response.metrics || {};
        const disease_distribution = response.disease_distribution || {};
        
        // --- 1. Render Metrics (Populates the styled HTML grid) ---
        // FIX: Use optional chaining or fallback to '0' to prevent display errors
        metricsGrid.innerHTML = `
            <div class="metric-card"><h4>${metrics.total_users || 0}</h4><p>Total Users</p></div>
            <div class="metric-card"><h4>${metrics.total_scans || 0}</h4><p>Total Scans</p></div>
            <div class="metric-card"><h4>${metrics.total_farms || 0}</h4><p>Total Farms</p></div>
            <div class="metric-card"><h4>${metrics.total_trees || 0}</h4><p>Total Trees</p></div>
        `;
        
        // --- 2. Render Disease Distribution Chart ---
        if (Object.keys(disease_distribution).length > 0) {
            renderGlobalDiseaseChart(disease_distribution);
        } else {
            // Display error/no data message if distribution is empty
            const chartParent = document.getElementById('globalDiseaseChartCanvas').parentElement;
            chartParent.innerHTML = '<p style="text-align:center;">No disease data available for charting.</p>';
            const distributionList = document.getElementById('distributionList');
            if (distributionList) distributionList.innerHTML = '<li>No scan data available for distribution.</li>';
        }


    } catch (error) {
        console.error("Error loading admin metrics:", error);
        // FIX: Ensure the error message is displayed when API call fails
        metricsGrid.innerHTML = '<p style="grid-column: 1 / -1; color:red;">Failed to load metrics. Check API status.</p>';
        const distributionList = document.getElementById('distributionList');
        if (distributionList) distributionList.innerHTML = '<li>Error loading chart data.</li>';
        const chartParent = document.getElementById('globalDiseaseChartCanvas').parentElement;
        chartParent.innerHTML = 'Error loading chart data.';
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