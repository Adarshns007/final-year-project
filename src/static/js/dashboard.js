/**
 * dashboard.js: Client-side logic for the user dashboard page.
 * Handles fetching farm data, recent scans, and rendering UI elements.
 */

let allFarms = []; // FIX: Declared globally for modal access

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ensure user is authenticated and redirect if not.
    checkAuthAndRedirect(true); 

    const token = getAuthToken();
    let userPayload = null;
    
    if (token) {
        userPayload = decodeJwt(token);

        if (userPayload) {
            // FIX 1: Prioritize username from the JWT payload for display
            const displayUsername = userPayload.username || userPayload.email || 'User';
            
            // FIX 2: Update the welcome greeting based on role
            const welcomeText = (userPayload.role === 'admin') 
                ? `Hello, Admin (${displayUsername})!` 
                : `Hello, ${displayUsername}!`;
                
            document.getElementById('welcome-user').textContent = welcomeText;
            
            // CRITICAL CHECK: Show admin link if role is correctly retrieved
            if (userPayload.role === 'admin') {
                const adminLink = document.getElementById('adminLink');
                if (adminLink) {
                     adminLink.style.display = 'block';
                }
            } else {
                const adminLink = document.getElementById('adminLink');
                if (adminLink) {
                     adminLink.style.display = 'none';
                }
            }
        } else {
             // If payload is invalid/expired, log out
            AuthAPI.logout();
            return;
        }
        
        // Load data only if token is confirmed present
        loadDashboardData();
        setupEventListeners();
    } else {
        // Fallback: If for some reason token is not found here, redirect.
        console.error("Authentication token not found on dashboard load. Redirecting.");
        window.location.href = '/login';
    }
});

/**
 * Function to load and display the Geo-Fencing alert.
 */
async function loadOutbreakAlert() {
    // CRASH FIX: These elements are now guaranteed to exist in dashboard.html
    const alertBox = document.getElementById('outbreakAlertContainer');
    const messageElement = document.getElementById('outbreakAlertMessage');
    
    // Reset state
    alertBox.style.display = 'none';
    alertBox.classList.remove('risk');
    messageElement.innerHTML = 'Checking regional scan data for the last 7 days within 5km...';
    
    try {
        const response = await apiCall('/api/user/outbreak-alert', 'GET');
        
        // Only display if a message or risk is found
        if (response.message || response.risk_found) {
            alertBox.style.display = 'block';
        }

        if (response.risk_found && response.outbreaks) {
            alertBox.classList.add('risk');
            messageElement.innerHTML = "<b>⚠️ HIGH RISK ALERT:</b> Disease spikes detected near the following farms:<ul>";
            
            for (const farmName in response.outbreaks) {
                const data = response.outbreaks[farmName];
                messageElement.innerHTML += `<li><b>${farmName}:</b> Prevalence is ${data.current_rate} (Up ${data.increase_percent}!)</li>`;
            }
            messageElement.innerHTML += "</ul>**Immediate action is recommended.**";
        } else {
            // General status message (e.g., "No geo-tagged farms found" or "No outbreak detected")
            messageElement.innerHTML = response.message || "No significant disease outbreak risk detected in your region.";
            alertBox.classList.remove('risk');
        }

    } catch (error) {
        alertBox.style.display = 'block'; 
        alertBox.classList.add('risk');
        messageElement.innerHTML = `Failed to check dashboard alerts. API Error: ${error.message}`;
        console.error("Geo-Fencing Alert Failed:", error);
    }
}


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
        card.setAttribute('data-farm-id', farm.farm_id);
        
        // FIX: Display Geo-Anchor status and Edit button
        const geoStatus = farm.latitude && farm.longitude
            ? `<span style="color:green; font-weight:bold;">📍 Geo-Tagged</span> <button class="btn secondary edit-geo-btn" data-farm-id="${farm.farm_id}">Edit Location</button>`
            : `<span style="color:red; font-weight:bold;">🚫 No GPS Set</span> <button class="btn primary edit-geo-btn" data-farm-id="${farm.farm_id}">Set Location</button>`;
        
        card.innerHTML = `
            <h4>${farm.farm_name}</h4>
            <p>${farm.location_details || 'No location details'}</p>
            <p style="font-size:0.9em; color:#777;">ID: ${farm.farm_id}</p>
            <div style="margin-top: 5px; margin-bottom: 10px;">${geoStatus}</div>

            <a href="/scan?farm_id=${farm.farm_id}" class="btn primary" style="padding: 5px 10px; margin-top: 10px;">Scan to this Farm</a>
            
            <button class="btn secondary view-trees-btn" data-farm-id="${farm.farm_id}" style="padding: 5px 10px; margin-top: 10px;">View Trees</button>
            
            <div id="treeList-${farm.farm_id}" style="margin-top: 10px;"></div>
        `;
        container.appendChild(card);
    });
    
    document.querySelectorAll('.view-trees-btn').forEach(button => {
        button.addEventListener('click', loadTreesForFarm);
    });
    
    // FIX: Attach event listeners to the new Edit Geo-Anchor buttons
    document.querySelectorAll('.edit-geo-btn').forEach(button => {
        button.addEventListener('click', openEditGeoModal);
    });
    
    populateTreeModalFarmSelect(farms);
}

/**
 * Function to load and display trees for a specific farm on the Dashboard, creating links.
 */
async function loadTreesForFarm(e) {
    const farmId = e.currentTarget.getAttribute('data-farm-id');
    const treeListContainer = document.getElementById(`treeList-${farmId}`);
    
    const isShowing = e.currentTarget.textContent === 'Hide Trees';
    
    if (isShowing) {
        // Hide logic
        treeListContainer.innerHTML = '';
        e.currentTarget.textContent = 'View Trees';
    } else {
        // Show logic
        treeListContainer.innerHTML = 'Loading trees...';
        e.currentTarget.textContent = 'Hide Trees';
        
        try {
            const trees = await UserAPI.getTreesByFarm(farmId);
            treeListContainer.innerHTML = '';
            
            if (trees.length === 0) {
                treeListContainer.innerHTML = '<p style="font-size: 0.85em; color: #cc0000;">No trees registered.</p>';
                return;
            }
            
            trees.forEach(tree => {
                // Render the tree name as a clickable link to its detail page
                const link = document.createElement('a');
                link.href = `/tree/${tree.tree_id}`; // Uses the /tree/<int:tree_id> route
                link.textContent = tree.tree_name;
                link.style.display = 'block';
                link.style.fontSize = '0.9em';
                link.style.marginTop = '5px';
                link.style.textDecoration = 'underline'; 
                link.style.color = 'var(--primary-color)';
                treeListContainer.appendChild(link);
            });
            
        } catch (error) {
            treeListContainer.innerHTML = '<p style="font-size: 0.85em; color:red;">Failed to load trees.</p>';
        }
    }
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
            <a href="/gallery?id=${scan.image_id}" 
               data-image-id="${scan.image_id}" 
               class="view-scan-detail-btn" 
               style="text-decoration: none; color: var(--primary-color); cursor: pointer;">View</a>
        `;
        list.appendChild(listItem);
    });
    
    document.querySelectorAll('.view-scan-detail-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const imageId = e.currentTarget.getAttribute('data-image-id');
            if (imageId) {
                // Redirect to gallery page with ID parameter
                window.location.href = `/gallery?id=${imageId}`;
            }
        });
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

        // 1. Load Geo-Fencing Alert (MUST run first)
        await loadOutbreakAlert(); 

        // 2. Fetch Farms (Requires Authorization header)
        const farms = await UserAPI.getFarms();
        allFarms = farms; // FIX: Ensure global array is populated
        renderFarms(farms);

        // 3. Fetch Recent Scans (Gallery is used as source)
        const recentScans = await UserAPI.getGallery();
        renderRecentScans(recentScans);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Show error message on UI, indicating auth failure if 401
        const errorMessage = error.message.includes('401') 
            ? 'Authentication failed. Please log in again.' 
            : 'Failed to load dashboard data. Check your network or API status.';
        
        // Display critical error to the user
        document.getElementById('farmsContainer').innerHTML = `<p style="color:red;">${errorMessage}</p>`;
        document.getElementById('recentScansList').innerHTML = `<li><p style="color:red;">${errorMessage}</p></li>`;
    }
}

/**
 * Populates the farm dropdown inside the Add Tree Modal.
 */
function populateTreeModalFarmSelect(farms) {
    const select = document.getElementById('treeFarmSelect');
    select.innerHTML = '<option value="" disabled selected>Select Farm to Add Tree</option>';
    
    if (farms.length === 0) {
        select.innerHTML = '<option value="" disabled selected>No farms available</option>';
        return;
    }
    
    farms.forEach(farm => {
        const option = document.createElement('option');
        option.value = farm.farm_id;
        option.textContent = farm.farm_name;
        select.appendChild(option);
    });
}

/**
 * FIX: Function to handle opening the modal for editing/setting farm location.
 */
async function openEditGeoModal(e) {
    const farmId = e.currentTarget.getAttribute('data-farm-id');
    const farm = allFarms.find(f => f.farm_id == farmId); 

    if (!farm) return;

    // Set modal elements
    document.getElementById('geoModalFarmId').value = farmId;
    document.getElementById('geoModalFarmName').textContent = farm.farm_name;
    document.getElementById('editFarmLatitude').value = farm.latitude || '';
    document.getElementById('editFarmLongitude').value = farm.longitude || '';
    document.getElementById('geoMessage').textContent = ''; // Clear message on open

    // Open the modal 
    const modal = document.getElementById('editGeoModal');
    if (modal) modal.style.display = 'block';
}


/**
 * Sets up all interactive elements on the dashboard, including new Add Tree functionality.
 */
function setupEventListeners() {
    // --- Logout Button ---
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            AuthAPI.logout();
        });
    }

    // --- CRITICAL FIX: Admin Link Click Handler ---
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            // FIX: Prevent default anchor tag behavior to ensure the navigation 
            // is handled by JS and not blocked by background processes.
            e.preventDefault();
            window.location.href = '/admin/dashboard';
        });
    }


    // --- New Scan Button ---
    const newScanLink = document.getElementById('newScanLink');
    if (newScanLink) {
        newScanLink.addEventListener('click', (e) => {
            e.preventDefault(); 
            window.location.href = '/scan'; 
        });
    }

    // --- Add Farm Modal and Form ---
    const addFarmModal = document.getElementById('addFarmModal');
    const addFarmForm = document.getElementById('addFarmForm');
    const farmMessage = document.getElementById('farmMessage');
    const autoDetectButton = document.getElementById('autoDetectLocation'); 

    // CRASH FIX: Check if addFarmButton exists
    const addFarmButton = document.getElementById('addFarmButton');
    if (addFarmButton) {
        addFarmButton.addEventListener('click', () => {
            // Clear old coordinates and reset message when opening
            addFarmForm.reset(); 
            farmMessage.textContent = '';
            addFarmModal.style.display = 'block';
        });
    }

    // Geolocation handler for Add Farm
    if (autoDetectButton) {
        autoDetectButton.addEventListener('click', () => {
            if (!navigator.geolocation) {
                farmMessage.style.color = 'red';
                farmMessage.textContent = 'Geolocation is not supported by your browser.';
                return;
            }
            
            autoDetectButton.disabled = true;
            autoDetectButton.textContent = 'Detecting...';
            farmMessage.textContent = 'Please allow browser location access.';
            farmMessage.style.color = '#337ab7'; 

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(8);
                    const lon = position.coords.longitude.toFixed(8);
                    
                    document.getElementById('newFarmLatitude').value = lat;
                    document.getElementById('newFarmLongitude').value = lon;
                    
                    farmMessage.textContent = `Location detected successfully: ${lat}, ${lon}`;
                    farmMessage.style.color = 'green';
                    autoDetectButton.textContent = 'Location Detected';
                    setTimeout(() => { 
                        autoDetectButton.disabled = false;
                        autoDetectButton.textContent = 'Auto-Detect Current Location'; 
                    }, 3000); 
                },
                (error) => {
                    farmMessage.textContent = `Error detecting location: ${error.message}. Please enter manually.`;
                    farmMessage.style.color = 'red';
                    autoDetectButton.disabled = false;
                    autoDetectButton.textContent = 'Auto-Detect Current Location';
                }
            );
        });
    }

    if (addFarmForm) { // CRASH FIX: Ensure form exists before attaching listener
        addFarmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const farmName = document.getElementById('newFarmName').value;
            const locationDetails = document.getElementById('newFarmLocation').value;
            
            const latitude = document.getElementById('newFarmLatitude').value || null;
            const longitude = document.getElementById('newFarmLongitude').value || null;
            
            try {
                const response = await UserAPI.createFarm(farmName, locationDetails, latitude, longitude);
                
                farmMessage.style.color = 'green';
                farmMessage.textContent = response.message || 'Farm added successfully!';
                
                loadDashboardData(); 
                
                setTimeout(() => {
                    addFarmForm.reset();
                    addFarmModal.style.display = 'none';
                }, 1000);

            } catch (error) {
                farmMessage.style.color = 'red';
                farmMessage.textContent = error.message || 'Error creating farm.';
            }
        });
    }

    // --- FIX: Location Edit Modal Handlers ---
    const editGeoModal = document.getElementById('editGeoModal');
    const editGeoForm = document.getElementById('editGeoForm');
    const geoMessage = document.getElementById('geoMessage');
    const editAutoDetectButton = document.getElementById('editAutoDetectLocation');

    // Geolocation handler for Edit Farm
    if (editAutoDetectButton) {
        editAutoDetectButton.addEventListener('click', () => {
            if (!navigator.geolocation) {
                geoMessage.style.color = 'red';
                geoMessage.textContent = 'Geolocation is not supported.';
                return;
            }
            
            editAutoDetectButton.disabled = true;
            editAutoDetectButton.textContent = 'Detecting...';
            geoMessage.textContent = 'Please allow browser location access.';
            geoMessage.style.color = '#337ab7'; 

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(8);
                    const lon = position.coords.longitude.toFixed(8);
                    
                    document.getElementById('editFarmLatitude').value = lat;
                    document.getElementById('editFarmLongitude').value = lon;
                    
                    geoMessage.textContent = `Location detected successfully: ${lat}, ${lon}`;
                    geoMessage.style.color = 'green';
                    editAutoDetectButton.textContent = 'Location Detected';
                    setTimeout(() => { 
                        editAutoDetectButton.disabled = false;
                        editAutoDetectButton.textContent = 'Auto-Detect Current Location'; 
                    }, 3000); 
                },
                (error) => {
                    geoMessage.textContent = `Error detecting location: ${error.message}. Please enter manually.`;
                    geoMessage.style.color = 'red';
                    editAutoDetectButton.disabled = false;
                    editAutoDetectButton.textContent = 'Auto-Detect Current Location';
                }
            );
        });
    }

    if (editGeoForm) { // CRASH FIX: Ensure form exists before attaching listener
        editGeoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const farmId = document.getElementById('geoModalFarmId').value;
            const latitude = document.getElementById('editFarmLatitude').value || null;
            const longitude = document.getElementById('editFarmLongitude').value || null;
            
            try {
                // Send PUT request to update only the geo-coordinates
                const response = await apiCall(`/api/user/farm/${farmId}`, 'PUT', { 
                    latitude: latitude,
                    longitude: longitude
                }, true);
                
                geoMessage.style.color = 'green';
                geoMessage.textContent = response.message || 'Location updated successfully!';
                
                loadDashboardData(); 
                
                setTimeout(() => {
                    editGeoModal.style.display = 'none';
                }, 1000);

            } catch (error) {
                geoMessage.style.color = 'red';
                geoMessage.textContent = error.message || 'Error updating location.';
            }
        });
    }

    // --- Add Tree Modal and Form ---
    const addTreeModal = document.getElementById('addTreeModal');
    const addTreeForm = document.getElementById('addTreeForm');
    const treeMessage = document.getElementById('treeMessage');

    // CRASH FIX: Check if addTreeButton exists
    const addTreeButton = document.getElementById('addTreeButton');
    if (addTreeButton) {
        addTreeButton.addEventListener('click', () => {
            addTreeModal.style.display = 'block';
        });
    }

    if (addTreeForm) { // CRASH FIX: Ensure form exists before attaching listener
        addTreeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const farmId = document.getElementById('treeFarmSelect').value;
            const treeName = document.getElementById('newTreeName').value;
            const ageYears = document.getElementById('newTreeAge').value || null;
            const plantingDate = document.getElementById('newPlantingDate').value || null;
            
            try {
                const response = await UserAPI.createTree(farmId, treeName, ageYears, plantingDate);
                treeMessage.style.color = 'green';
                treeMessage.textContent = response.message || 'Tree added successfully!';
                
                loadDashboardData(); 

                setTimeout(() => {
                    addTreeForm.reset();
                    addTreeModal.style.display = 'none';
                }, 1000);

            } catch (error) {
                treeMessage.style.color = 'red';
                treeMessage.textContent = error.message || 'Error creating tree.';
            }
        });
    }


    // Close modal when clicking outside 
    window.onclick = function(event) {
        const editGeoModal = document.getElementById('editGeoModal');
        if (event.target == addFarmModal) {
            addFarmModal.style.display = "none";
        }
        if (event.target == addTreeModal) {
            addTreeModal.style.display = "none";
        }
        if (editGeoModal && event.target == editGeoModal) {
            editGeoModal.style.display = "none";
        }
    }
}