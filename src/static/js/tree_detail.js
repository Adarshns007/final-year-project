/**
 * tree_detail.js: Client-side logic for the Tree Detail page.
 * Fetches tree metadata and the list of associated images/scans.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    
    // 1. Get Tree ID from URL
    const treeId = getTreeIdFromUrl();
    
    if (treeId) {
        loadTreeDetails(treeId);
    } else {
        document.getElementById('treeNameHeader').textContent = 'Error';
        document.getElementById('treeDetails').innerHTML = '<p style="grid-column: 1 / -1; color: red;">Tree ID not found in URL.</p>';
        document.getElementById('treeScanHistory').innerHTML = '<p style="grid-column: 1 / -1;">Cannot load history.</p>';
    }
});

/**
 * Extracts the tree ID from the URL path (e.g., /tree/123 -> 123).
 * @returns {string | null} The tree ID.
 */
function getTreeIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    // Assuming URL pattern is /tree/<treeId>
    // Example: ['', 'tree', '123']
    if (pathParts.length >= 3 && pathParts[1] === 'tree' && !isNaN(parseInt(pathParts[2]))) {
        return pathParts[2];
    }
    return null;
}

/**
 * Fetches tree metadata and its scan history.
 * @param {string} treeId 
 */
async function loadTreeDetails(treeId) {
    try {
        // 1. Fetch Tree Details (GET /api/user/tree/<tree_id>)
        const treeDetail = await apiCall(`/api/user/tree/${treeId}`, 'GET');

        // 2. Render Tree Metadata
        renderTreeMetadata(treeDetail);
        
        // 3. Fetch Tree's Scan History (Must assume a new API endpoint for this, 
        //    or filter the main gallery list on the client/server side).
        //    We'll assume a dedicated endpoint is the cleaner way: 
        //    GET /api/user/tree/<tree_id>/images (which needs a backend implementation)
        const scanHistory = await fetchTreeImages(treeId); 
        renderScanHistory(scanHistory);
        
    } catch (error) {
        console.error("Error loading tree details:", error);
        displayMessage(error.message || "Failed to load tree information.", true);
        document.getElementById('treeNameHeader').textContent = 'Error Loading Data';
        document.getElementById('treeScanHistory').innerHTML = '<p style="grid-column: 1 / -1; color: red;">Failed to load scan history.</p>';
    }
}

/**
 * Renders the fetched tree details into the HTML elements.
 * @param {object} detail 
 */
function renderTreeMetadata(detail) {
    document.title = `LeafGuard - ${detail.tree_name}`;
    document.getElementById('pageTitle').textContent = `Tree: ${detail.tree_name}`;
    document.getElementById('treeNameHeader').textContent = detail.tree_name;
    
    document.getElementById('farmName').textContent = detail.farm_name;
    document.getElementById('treeId').textContent = detail.tree_id;
    document.getElementById('treeAge').textContent = detail.age_years || 'N/A';
    
    // Date formatting (MySQL date objects might need careful handling, 
    // assuming it returns a standard date string or object)
    const plantingDate = detail.planting_date ? new Date(detail.planting_date).toLocaleDateString() : 'N/A';
    document.getElementById('plantingDate').textContent = plantingDate;
    
    // Update action links
    const scanLink = document.getElementById('scanTreeLink');
    scanLink.href = `/scan?farm_id=${detail.farm_id}&tree_id=${detail.tree_id}`;
    document.getElementById('editTreeButton').addEventListener('click', () => {
        // Redirect to a theoretical edit page
        window.location.href = `/tree/${detail.tree_id}/edit`;
    });
}

/**
 * Renders the list of scans associated with this tree.
 * NOTE: This reuses the rendering logic from gallery.js for consistency.
 * @param {Array<Object>} images 
 */
function renderScanHistory(images) {
    const historyContainer = document.getElementById('treeScanHistory');
    historyContainer.innerHTML = '';

    document.getElementById('scanCount').textContent = images.length;
    
    if (images.length === 0) {
        historyContainer.innerHTML = '<p style="grid-column: 1 / -1;">No scan records found for this tree.</p>';
        return;
    }
    
    // Reusing the gallery rendering logic (you may need to copy/refactor 
    // the renderGallery card creation into a reusable function in utils.js 
    // for true modularity, but we'll simplify here):
    images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'gallery-card'; // Reuse gallery styles
        card.setAttribute('data-image-id', image.image_id);
        
        const statusClass = image.predicted_class === 'Healthy' ? 'healthy' : 'default';
        const dateStr = new Date(image.upload_date).toLocaleDateString();

        card.innerHTML = `
            <img src="${image.file_path}" alt="Scan ID ${image.image_id}">
            <div class="card-details">
                <h4>${image.predicted_class}</h4>
                <p>Confidence: ${(image.confidence_score * 100).toFixed(1)}%</p>
                <p style="font-size: 0.9em; color: #777;">Date: ${dateStr}</p>
                <span class="status-badge ${statusClass}">${image.predicted_class}</span>
                <a href="/gallery/${image.image_id}" class="btn primary" style="padding: 5px 10px; margin-top: 10px;">View Details</a>
            </div>
        `;
        
        historyContainer.appendChild(card);
    });
}

// --- Placeholder for API call to fetch tree's images ---
// NOTE: This function requires a new backend route (e.g., /api/user/tree/<id>/images)
async function fetchTreeImages(treeId) {
    // This API endpoint still needs to be implemented on the Flask side.
    const endpoint = `/api/user/tree/${treeId}/images`; 
    try {
        // Return dummy data if API call fails during development
        return await apiCall(endpoint, 'GET');
    } catch(e) {
        console.warn(`[DEVELOPMENT NOTE] Missing API route: ${endpoint}`);
        // Fallback or throw error
        throw e;
    }
}