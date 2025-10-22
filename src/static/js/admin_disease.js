/**
 * admin_diseases.js: Client-side logic for Admin Disease Management.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    
    if (isLoggedIn() && decodeJwt(getAuthToken()).role === 'admin') {
        loadDiseases();
    } else {
        alert('Access Denied.');
        window.location.href = '/dashboard';
    }
});

const diseaseListContainer = document.getElementById('diseaseList');
const adminApiCall = (endpoint, method = 'GET', body = null) => apiCall(endpoint, method, body, true);

/**
 * Fetches all disease information.
 */
async function loadDiseases() {
    diseaseListContainer.innerHTML = '<p style="grid-column: 1 / -1;">Fetching disease data...</p>';
    try {
        // GET /api/admin/diseases
        const diseases = await adminApiCall('/api/admin/diseases', 'GET');
        renderDiseases(diseases);
    } catch (error) {
        diseaseListContainer.innerHTML = `<p style="grid-column: 1 / -1; color:red;">Failed to load diseases: ${error.message}</p>`;
    }
}

/**
 * Renders the diseases as editable cards.
 * @param {Array<Object>} diseases 
 */
function renderDiseases(diseases) {
    diseaseListContainer.innerHTML = '';
    
    diseases.forEach(disease => {
        const card = document.createElement('div');
        card.className = 'disease-card';
        card.innerHTML = `
            <h3>${disease.name} ${disease.name === 'Healthy' ? '(Default)' : ''}</h3>
            <form data-id="${disease.disease_id}" class="disease-form">
                <div class="form-group">
                    <label for="desc-${disease.disease_id}">Description:</label>
                    <textarea id="desc-${disease.disease_id}" name="description" required>${disease.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="org-${disease.disease_id}">Organic Treatment:</label>
                    <textarea id="org-${disease.disease_id}" name="organic_treatment" required>${disease.organic_treatment || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="chem-${disease.disease_id}">Chemical Treatment:</label>
                    <textarea id="chem-${disease.disease_id}" name="chemical_treatment" required>${disease.chemical_treatment || ''}</textarea>
                </div>
                
                <button type="submit" class="btn primary" style="width: 100%; margin-top: 10px;">Save Changes</button>
            </form>
        `;
        diseaseListContainer.appendChild(card);
    });

    // Add event listeners to all forms
    document.querySelectorAll('.disease-form').forEach(form => {
        form.addEventListener('submit', handleUpdateDisease);
    });
}

/**
 * Handles the form submission to update a disease's info.
 */
async function handleUpdateDisease(e) {
    e.preventDefault();
    const form = e.target;
    const diseaseId = form.getAttribute('data-id');
    const button = form.querySelector('button');
    
    const description = form.elements.namedItem('description').value;
    const organic_treatment = form.elements.namedItem('organic_treatment').value;     // <-- NEW FIELD
    const chemical_treatment = form.elements.namedItem('chemical_treatment').value;   // <-- NEW FIELD
    
    try {
        button.disabled = true;
        button.textContent = 'Saving...';
        
        // PUT /api/admin/diseases/<disease_id>
        const response = await adminApiCall(`/api/admin/diseases/${diseaseId}`, 'PUT', {
            description,
            organic_treatment, // <-- SEND NEW FIELD
            chemical_treatment // <-- SEND NEW FIELD
        });
        
        displayMessage(response.message, false);
        
    } catch (error) {
        displayMessage(error.message || 'Failed to save changes.', true);
    } finally {
        button.disabled = false;
        button.textContent = 'Save Changes';
    }
}