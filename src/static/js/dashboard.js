/**
 * dashboard.js: Client-side logic for the user dashboard page.
 * Handles fetching farm data, recent scans, and rendering UI elements.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ensure user is authenticated and redirect if not.
    // This function relies on getAuthToken() from api.js
    checkAuthAndRedirect(true); 

    // After checkAuthAndRedirect, the token should be in localStorage if we're on dashboard.
    const token = getAuthToken(); // Directly retrieve the token

    if (token) {
        const userPayload = decodeJwt(token);

        if (userPayload) {
            document.getElementById('welcome-user').textContent = `Hello, ${userPayload.username || userPayload.email}!`;
            if (userPayload.role === 'admin') {
                document.getElementById('adminLink').style.display = 'block';
            }
        }
        
        // Load data only if token is confirmed present
        loadDashboardData();
        setupEventListeners();
    } else {
        // Fallback: If for some reason token is not found here, redirect.
        // This *shouldn't* happen if checkAuthAndRedirect worked, but good for robustness.
        console.error("Authentication token not found on dashboard load. Redirecting.");
        window.location.href = '/login';
    }
});

/**
 * Renders the list of farms into the farms container.
 */
function renderFarms(farms) {
    const container = document.getElementById('farmsContainer');
    container.innerHTML = ''; // Clear loading message

    if (farms.length === 0) {
        container.innerHTML = '<p>You have no farms yet. Use the "Add New Farm" button to get started!</p>';
        return;
    }

    farms.forEach(farm => {
        const card = document.createElement('div');
        card.className = 'farm-card';
        card.innerHTML = `
            <h4><a href="/farm/${farm.farm_id}">${farm.farm_name}</a></h4>
            <p>${farm.location_details || 'No location details'}</p>
            <p style="font-size:0.9em; color:#777;">ID: ${farm.farm_id}</p>
            <a href="/scan?farm_id=${farm.farm_id}" class="btn primary" style="padding: 5px 10px; margin-top: 10px;">Scan to this Farm</a>
        `;
        container.appendChild(card);
    });
}

/**
 * Renders the list of recent scans.
 */
function renderRecentScans(scans) {
    const list = document.getElementById('recentScansList');
    list.innerHTML = '';

    if (scans.length === 0) {
        list.innerHTML = '<li><p>No recent scans found.</p></li>';
        return;
    }

    scans.slice(0, 5).forEach(scan => { // Display top 5 recent scans
        const listItem = document.createElement('li');
        const statusClass = scan.predicted_class === 'Healthy' ? 'healthy' : 'default';
        
        listItem.innerHTML = `
            <span>
                Analysis of ${scan.tree_name ? 'Tree: ' + scan.tree_name : 'Quick Scan'}
                (${new Date(scan.upload_date).toLocaleDateString()})
            </span>
            <span class="status-badge ${statusClass}">
                ${scan.predicted_class}
            </span>
            <a href="/gallery/${scan.image_id}" style="text-decoration: none; color: var(--primary-color);">View</a>
        `;
        list.appendChild(listItem);
    });
}

/**
 * Loads farm and recent scan data from the Flask APIs.
 */
async function loadDashboardData() {
    try {
        // Clear previous error messages/loading states
        document.getElementById('farmsContainer').innerHTML = '<p>Loading farms...</p>';
        document.getElementById('recentScansList').innerHTML = '<li><p>Loading recent scans...</p></li>';

        // Fetch Farms (Requires Authorization header)
        const farms = await UserAPI.getFarms();
        renderFarms(farms);

        // Fetch Recent Scans (Gallery is used as source)
        const recentScans = await UserAPI.getGallery();
        renderRecentScans(recentScans);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Show error message on UI, indicating auth failure if 401
        const errorMessage = error.message.includes('401') ? 'Authentication failed. Please check your credentials and log in again.' : 'Failed to load dashboard data. Check network status.';
        
        document.getElementById('farmsContainer').innerHTML = `<p style="color:red;">${errorMessage}</p>`;
        document.getElementById('recentScansList').innerHTML = `<li><p style="color:red;">${errorMessage}</p></li>`;
    }
}

/**
 * Sets up all interactive elements on the dashboard.
 */
function setupEventListeners() {
    // --- Logout Button ---
    document.getElementById('logoutButton').addEventListener('click', () => {
        // Call the logout function from api.js
        AuthAPI.logout();
    });

    // --- Add Farm Modal and Form ---
    const addFarmModal = document.getElementById('addFarmModal');
    const addFarmForm = document.getElementById('addFarmForm');
    const farmMessage = document.getElementById('farmMessage');

    document.getElementById('addFarmButton').addEventListener('click', () => {
        addFarmModal.style.display = 'block';
    });
    
    addFarmForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const farmName = document.getElementById('newFarmName').value;
        const locationDetails = document.getElementById('newFarmLocation').value;
        
        try {
            const response = await UserAPI.createFarm(farmName, locationDetails);
            farmMessage.style.color = 'green';
            farmMessage.textContent = response.message || 'Farm added successfully!';
            
            // Reload dashboard data to show the new farm
            loadDashboardData(); 
            
            // Clear form and hide modal after a delay
            setTimeout(() => {
                addFarmForm.reset();
                addFarmModal.style.display = 'none';
            }, 1000);

        } catch (error) {
            farmMessage.style.color = 'red';
            farmMessage.textContent = error.message || 'Error creating farm.';
        }
    });

    // Close modal when clicking outside (simple modal closing)
    window.onclick = function(event) {
        if (event.target == addFarmModal) {
            addFarmModal.style.display = "none";
        }
    }
}