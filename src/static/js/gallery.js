/**
 * gallery.js: Client-side logic for the Scan Gallery page.
 */

const galleryGrid = document.getElementById('galleryGrid');
const detailModal = document.getElementById('imageDetailModal');
const closeBtn = document.querySelector('.close-btn');
const archiveButton = document.getElementById('archiveButton');

// Define Trash API Call (using apiCall helper)
const TrashAPI = {
    archiveImage: (imageId) => apiCall(`/api/trash/archive/${imageId}`, 'POST'),
};

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    loadGalleryImages();
    setupModalListeners();
    
    // FIX: Check URL for image ID parameter and open modal immediately
    const urlParams = new URLSearchParams(window.location.search);
    const initialImageId = urlParams.get('id');
    
    if (initialImageId) {
        // Use a slight delay to ensure the DOM and event listeners are fully ready
        setTimeout(() => {
            openImageDetail(initialImageId);
        }, 200); 
    }
});

/**
 * Loads all analyzed images from the API and renders them.
 */
async function loadGalleryImages() {
    try {
        const images = await apiCall('/api/gallery/', 'GET');
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
        card.setAttribute('data-image-id', image.image_id); 
        
        const statusClass = image.predicted_class === 'Healthy' ? 'healthy' : 'default';
        const dateStr = new Date(image.upload_date).toLocaleDateString();

        card.innerHTML = `
            <img src="${image.file_path}" alt="Scan ID ${image.image_id}">
            <div class="card-details">
                <h4>${image.predicted_class}</h4>
                <p>Tree: ${image.tree_name || 'Quick Scan'}</p>
                <p style="font-size: 0.9em;">Conf: ${(image.confidence_score * 100).toFixed(1)}%</p>
                <p style="font-size: 0.9em; color: #777;">Date: ${dateStr}</p>
                <span class="status-badge ${statusClass}">${image.predicted_class}</span>
            </div>
        `;
        
        // Ensure the click listener reliably reads the ID from the card element
        card.addEventListener('click', (event) => {
            const clickedCard = event.currentTarget; 
            const imageId = clickedCard.getAttribute('data-image-id');
            
            if (imageId) {
                openImageDetail(imageId);
            } else {
                console.error("CRITICAL: Image ID not found on clicked card.");
            }
        });
        galleryGrid.appendChild(card);
    });
}

/**
 * Fetches the detailed information for a specific image and opens the modal.
 * @param {number} imageId - The ID of the image to display.
 */
async function openImageDetail(imageId) {
    document.getElementById('archiveMessage').textContent = '';
    
    try {
        const detail = await apiCall(`/api/gallery/${imageId}`, 'GET', null, true); 
        
        if (!detail) {
            throw new Error(`API returned no data for Image ID: ${imageId}.`);
        }
        
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
        
        const rawData = detail.raw_output && typeof detail.raw_output === 'object' ? detail.raw_output : {};

        const sortedRaw = Object.entries(rawData)
            .sort(([, a], [, b]) => b - a);

        sortedRaw.forEach(([disease, probability]) => {
            const item = document.createElement('div');
            item.className = 'results-item';
            item.innerHTML = `<span>${disease}</span><strong>${(probability * 100).toFixed(2)}%</strong>`;
            rawOutputList.appendChild(item);
        });
        
        // Set up archive button event handler
        archiveButton.onclick = null; 
        archiveButton.textContent = 'Move to Trash Bin';
        archiveButton.disabled = false;
        archiveButton.onclick = () => handleArchiveImage(detail.image_id);
        
        detailModal.style.display = 'block';

    } catch (error) {
        console.error(`Error fetching image details for ID ${imageId}:`, error);
        displayMessage(error.message || "Failed to load image details. Check console for API error.", true);
        detailModal.style.display = 'none';
    }
}

/**
 * Handles moving the current image from the gallery to the trash bin.
 * @param {number} imageId 
 */
async function handleArchiveImage(imageId) {
    const button = archiveButton;
    const messageElement = document.getElementById('archiveMessage');
    
    if (!confirm(`Are you sure you want to move scan ID ${imageId} to the Trash Bin?`)) {
        return;
    }

    button.disabled = true;
    button.textContent = 'Archiving...';
    messageElement.textContent = '';
    
    try {
        const response = await TrashAPI.archiveImage(imageId);
        messageElement.style.color = 'green';
        messageElement.textContent = response.message || 'Image moved to Trash Bin successfully!';
        
        setTimeout(() => {
            detailModal.style.display = "none";
            loadGalleryImages(); 
        }, 800);
        
    } catch (error) {
        messageElement.style.color = 'red';
        messageElement.textContent = error.message || 'Failed to move image to trash.';
    } finally {
        button.disabled = false;
        button.textContent = 'Move to Trash Bin';
    }
}

/**
 * Sets up listeners for closing the modal.
 */
function setupModalListeners() {
    closeBtn.onclick = function() {
        detailModal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == detailModal) {
            detailModal.style.display = "none";
        }
    }
}