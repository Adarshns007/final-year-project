/**
 * admin_feedbacks.js: Client-side logic for the Admin Feedback Management page.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    
    // Check for admin role client-side
    if (isLoggedIn() && decodeJwt(getAuthToken()).role === 'admin') {
        loadFeedbacks();
    } else {
        alert('Access Denied. Redirecting to user dashboard.');
        window.location.href = '/dashboard';
    }
});

const feedbackTableBody = document.getElementById('feedbacksTableBody');
const tableMessage = document.getElementById('tableMessage');

// Helper function to make an admin-required API call (must be defined in api.js)
const adminApiCall = (endpoint, method = 'GET', body = null) => apiCall(endpoint, method, body, true);


/**
 * Fetches and renders all feedback data.
 */
async function loadFeedbacks() {
    feedbackTableBody.innerHTML = '<tr><td colspan="7">Fetching data...</td></tr>';
    tableMessage.textContent = '';
    
    try {
        // GET /api/admin/feedbacks
        const feedbacks = await adminApiCall('/api/admin/feedbacks', 'GET');
        
        if (feedbacks.length === 0) {
            feedbackTableBody.innerHTML = '<tr><td colspan="7">No feedback submissions found.</td></tr>';
            return;
        }

        renderFeedbacks(feedbacks);

    } catch (error) {
        console.error("Error loading feedbacks:", error);
        feedbackTableBody.innerHTML = `<tr><td colspan="7" style="color:red;">Failed to load feedback: ${error.message}</td></tr>`;
    }
}

/**
 * Renders the fetched feedback data into the table.
 * @param {Array<Object>} feedbacks - List of feedback objects.
 */
function renderFeedbacks(feedbacks) {
    feedbackTableBody.innerHTML = ''; // Clear loading message

    feedbacks.forEach(feedback => {
        const row = document.createElement('tr');
        
        // Truncate subject for table view, use the row click for full details (not implemented here)
        const subjectSnippet = feedback.subject.length > 50 ? feedback.subject.substring(0, 50) + '...' : feedback.subject;
        const statusClass = feedback.status.replace('_', '-');
        
        row.innerHTML = `
            <td>${feedback.feedback_id}</td>
            <td title="${feedback.message}">${subjectSnippet}</td>
            <td>${feedback.username}<br><small>${feedback.email}</small></td>
            <td>${feedback.rating || 'N/A'}</td>
            <td>${new Date(feedback.submitted_at).toLocaleDateString()}</td>
            <td><span class="status-badge ${statusClass}">${feedback.status.toUpperCase()}</span></td>
            <td>
                <select class="action-select" data-id="${feedback.feedback_id}" data-current-status="${feedback.status}">
                    <option value="" disabled selected>Change Status</option>
                    <option value="new" ${feedback.status === 'new' ? 'disabled' : ''}>New</option>
                    <option value="in_review" ${feedback.status === 'in_review' ? 'disabled' : ''}>In Review</option>
                    <option value="resolved" ${feedback.status === 'resolved' ? 'disabled' : ''}>Resolved</option>
                </select>
            </td>
        `;
        feedbackTableBody.appendChild(row);
    });
    
    // Add event listener for status change
    document.querySelectorAll('.action-select').forEach(select => {
        select.addEventListener('change', handleStatusUpdate);
    });
}

/**
 * Handles the status change event when an admin selects a new status.
 * @param {Event} e 
 */
async function handleStatusUpdate(e) {
    const selectElement = e.target;
    const feedbackId = selectElement.getAttribute('data-id');
    const newStatus = selectElement.value;
    const originalStatus = selectElement.getAttribute('data-current-status');
    
    if (!newStatus) return; // Should not happen with current setup

    if (!confirm(`Are you sure you want to change feedback ID ${feedbackId} status to ${newStatus.toUpperCase()}?`)) {
        selectElement.value = ''; // Reset selection if canceled
        return;
    }

    try {
        // PUT /api/admin/feedbacks/<feedback_id>
        const response = await adminApiCall(`/api/admin/feedbacks/${feedbackId}`, 'PUT', { status: newStatus });
        
        displayMessage(response.message, false);
        
        // Optimistically update the UI: Reload data or just update the single row
        loadFeedbacks(); 
        
    } catch (error) {
        displayMessage(error.message || `Failed to update status for ID ${feedbackId}.`, true);
        selectElement.value = originalStatus; // Revert on failure
    }
}