/**
 * gallery.js: Client-side logic for the Scan Gallery page.
 */

const galleryGrid = document.getElementById('galleryGrid');
const detailModal = document.getElementById('imageDetailModal');
const closeBtn = document.querySelector('.close-btn');

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    loadGalleryImages();
    setupModalListeners();
});

/**
 * Loads all analyzed images from the API and renders them.
 */
async function loadGalleryImages() {
    try {
        const images = await UserAPI.getGallery();
        renderGallery(images);
    } catch (error) {
        galleryGrid.innerHTML = `<p style="grid-column: 1 / -1; color:red;">Failed to load gallery data: ${error.message}</p>`;
    }
}

/**
 * Renders the image array into the gallery grid.
 * @param {Array<Object>} images - List of image objects with prediction data.
 */
function renderGallery(images) {
    galleryGrid.innerHTML = ''; // Clear loading message

    if (images.length === 0) {
        galleryGrid.innerHTML = '<p style="grid-column: 1 / -1;">No scans found in your gallery.</p>';
        return;
    }

    images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.setAttribute('data-image-id', image.image_id); // Store ID for detail fetch
        
        const statusClass = image.predicted_class === 'Healthy' ? 'healthy' : 'default';
        const dateStr = new Date(image.upload_date).toLocaleDateString();

        card.innerHTML = `
            <img src="${image.file_path}" alt="Scan ID ${image.image_id}">
            <div class="card-details">
                <h4>${image.predicted_class}</h4>
                <p>Tree: ${image.tree_name || 'Quick Scan'}</p>
                <p style="font-size: 0.9em; color: #777;">Date: ${dateStr}</p>
                <span class="status-badge ${statusClass}">${image.predicted_class}</span>
            </div>
        `;
        
        card.addEventListener('click', () => openImageDetail(image.image_id));
        galleryGrid.appendChild(card);
    });
}

/**
 * Fetches the detailed information for a specific image and opens the modal.
 * @param {number} imageId - The ID of the image to display.
 */
async function openImageDetail(imageId) {
    try {
        // Since we don't have a separate endpoint for single image detail 
        // with prediction *and* raw data yet, we'll implement a simple API call 
        // to a dedicated detail route that should be created in the backend 
        // (e.g., /api/user/gallery/<imageID>). 
        // For now, we assume a detail endpoint exists:
        const detail = await apiCall(`/api/user/gallery/${imageId}`, 'GET', null, true);
        
        // Populate modal with fetched data
        document.getElementById('modalImage').src = detail.file_path;
        document.getElementById('modalImageId').textContent = detail.image_id;
        document.getElementById('modalFarmName').textContent = detail.farm_name || 'N/A';
        document.getElementById('modalTreeName').textContent = detail.tree_name || 'N/A';
        document.getElementById('modalAnalysisDate').textContent = new Date(detail.upload_date).toLocaleString();
        
        const classElement = document.getElementById('modalPredictedClass');
        classElement.textContent = detail.predicted_class;
        classElement.className = `status-badge ${detail.predicted_class === 'Healthy' ? 'healthy' : 'default'}`;
        
        document.getElementById('modalConfidenceScore').textContent = `${(detail.confidence_score * 100).toFixed(2)}%`;

        // Render raw probabilities
        const rawOutputList = document.getElementById('modalRawOutputList');
        rawOutputList.innerHTML = '';
        
        const sortedRaw = Object.entries(detail.raw_output)
            .sort(([, a], [, b]) => b - a);

        sortedRaw.forEach(([disease, probability]) => {
            const item = document.createElement('div');
            item.className = 'results-item';
            item.innerHTML = `<span>${disease}</span><strong>${(probability * 100).toFixed(2)}%</strong>`;
            rawOutputList.appendChild(item);
        });

        detailModal.style.display = 'block';

    } catch (error) {
        console.error("Error fetching image details:", error);
        displayMessage(error.message || "Failed to load image details.", true);
    }
}

/**
 * Sets up listeners for closing the modal.
 */
function setupModalListeners() {
    // Close button click
    closeBtn.onclick = function() {
        detailModal.style.display = "none";
    }

    // Click outside the modal content
    window.onclick = function(event) {
        if (event.target == detailModal) {
            detailModal.style.display = "none";
        }
    }
}