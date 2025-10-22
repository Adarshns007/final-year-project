/**
 * admin_dashboard.js: Client-side logic for the Admin Dashboard overview page.
 * Enforces admin role check, fetches system metrics/user list, and renders charts.
 */

document.addEventListener('DOMContentLoaded', () => {
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
        
        // --- 1. Render Metrics ---
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
 * Renders the global disease distribution Pie Chart using Chart.js.
 */
function renderGlobalDiseaseChart(distributionData) {
    // Ensure the canvas context exists
    const canvas = document.getElementById('globalDiseaseChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const labels = Object.keys(distributionData);
    const dataValues = Object.values(distributionData);
    
    // Simple color assignment for chart segments
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#5cb85c', '#c9c9c9'
    ]; 

    // Destroy previous chart instance if it exists
    if (globalDiseaseChartInstance) {
        globalDiseaseChartInstance.destroy();
    }
    
    globalDiseaseChartInstance = new Chart(ctx, {
        type: 'doughnut',
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
            plugins: {
                legend: {
                    position: 'right',
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

    // Remove the simple list/legend placeholder (was originally #distributionList)
    const distributionList = document.getElementById('distributionList');
    if (distributionList) distributionList.innerHTML = ''; 
}

/**
 * Fetches and renders a list of all users.
 */
async function loadAdminUsers() {
    const usersList = document.getElementById('usersList');
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
                (${user.email}) - Role: ${user.role}
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