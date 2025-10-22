/**
 * user_trash.js: Client-side logic for the User Trash Bin (Archived Images).
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    loadTrashContent();
});

const trashGrid = document.getElementById('trashGrid');

// Helper functions for trash API calls (must be defined in api.js)
const TrashAPI = {
    getTrash: () => apiCall('/api/trash/', 'GET'),
    restoreImage: (imageId) => apiCall(`/api/trash/restore/${imageId}`, 'POST'),
    // Note: Permanent delete API route is needed:
    // permanentDelete: (imageId) => apiCall(`/api/trash/delete-permanent/${imageId}`, 'DELETE'),
};

/**
 * Fetches and renders the list of archived images.
 */
async function loadTrashContent() {
    trashGrid.innerHTML = '<p style="grid-column: 1 / -1;">Fetching archived data...</p>';
    try {
        const archivedImages = await TrashAPI.getTrash();
        renderTrashGrid(archivedImages);
    } catch (error) {
        trashGrid.innerHTML = `<p style="grid-column: 1 / -1; color:red;">Failed to load trash content: ${error.message}</p>`;
    }
}

/**
 * Renders the archived images into the grid.
 * @param {Array<Object>} images - List of archived image objects.
 */
function renderTrashGrid(images) {
    trashGrid.innerHTML = '';
    
    if (images.length === 0) {
        trashGrid.innerHTML = '<p style="grid-column: 1 / -1;">Your trash bin is empty.</p>';
        return;
    }

    images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'trash-card';
        
        const dateStr = new Date(image.archived_at).toLocaleDateString();

        card.innerHTML = `
            <img src="${image.file_path}" alt="Archived Scan ID ${image.image_id}">
            <div class="card-details">
                <h4>${image.predicted_class}</h4>
                <p style="font-size: 0.9em; color: #777;">Archived: ${dateStr}</p>
                <div style="margin-top: 15px;">
                    <button class="btn primary restore-btn" data-id="${image.image_id}" style="padding: 8px 15px;">Restore</button>
                    </div>
            </div>
        `;
        
        trashGrid.appendChild(card);
    });
    
    document.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', handleRestore);
    });
}

/**
 * Handles restoring an image from trash.
 */
async function handleRestore(e) {
    const imageId = e.target.getAttribute('data-id');
    e.target.disabled = true;
    e.target.textContent = 'Restoring...';

    if (!confirm(`Are you sure you want to restore image ID ${imageId} to your gallery?`)) {
        e.target.disabled = false;
        e.target.textContent = 'Restore';
        return;
    }

    try {
        const response = await TrashAPI.restoreImage(imageId);
        displayMessage(response.message, false);
        
        // Reload the trash content after restoration
        loadTrashContent();
        
    } catch (error) {
        displayMessage(error.message || `Failed to restore image ID ${imageId}.`, true);
        e.target.disabled = false;
        e.target.textContent = 'Restore';
    }
}