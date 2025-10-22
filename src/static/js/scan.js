/**
 * scan.js: Client-side logic for the image scanning and analysis page.
 */

const farmSelect = document.getElementById('farmSelect');
const treeSelect = document.getElementById('treeSelect');
const imageFile = document.getElementById('imageFile');
const imagePreview = document.getElementById('imagePreview');
const scanForm = document.getElementById('scanForm');
const resultsSection = document.getElementById('resultsSection');
const analyzeButton = document.getElementById('analyzeButton');
const buttonText = document.getElementById('buttonText');

let allFarms = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true);
    loadFarmTreeData();
    setupImagePreview();
    setupFormSubmission();
});

// --- Data Loading and Filtering ---

async function loadFarmTreeData() {
    try {
        const farms = await UserAPI.getFarms();
        allFarms = farms;
        
        // Populate Farm dropdown
        farms.forEach(farm => {
            const option = document.createElement('option');
            option.value = farm.farm_id;
            option.textContent = farm.farm_name;
            farmSelect.appendChild(option);
        });

        // Event listener for Farm selection change
        farmSelect.addEventListener('change', populateTreeDropdown);
        
        // Initial tree population if a farm is pre-selected (e.g., from URL query params)
        // This handles the case where the user navigates from the dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedFarmId = urlParams.get('farm_id');
        if (preselectedFarmId) {
            farmSelect.value = preselectedFarmId;
            populateTreeDropdown();
        }

    } catch (error) {
        displayMessage("Failed to load farm data. Quick scans are still available.", true);
        farmSelect.disabled = true;
        treeSelect.disabled = true;
    }
}

async function populateTreeDropdown() {
    const farmId = farmSelect.value;
    
    // Clear previous options
    treeSelect.innerHTML = '<option value="">Select a Tree</option>';
    treeSelect.disabled = true;

    if (!farmId) {
        return; // No farm selected, keep tree disabled
    }

    try {
        treeSelect.disabled = false;
        // Fetch trees for the selected farm
        const trees = await UserAPI.getTreesByFarm(farmId); 
        
        trees.forEach(tree => {
            const option = document.createElement('option');
            option.value = tree.tree_id;
            option.textContent = tree.tree_name;
            treeSelect.appendChild(option);
        });

        // Check for pre-selected tree ID if needed
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedTreeId = urlParams.get('tree_id');
        if (preselectedTreeId) {
            treeSelect.value = preselectedTreeId;
        }
        
    } catch (error) {
        displayMessage("Failed to load trees for this farm.", true);
        treeSelect.disabled = true;
    }
}

// --- Image Preview Logic ---

function setupImagePreview() {
    imageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
                document.getElementById('uploadText').textContent = 'Change Image';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
            document.getElementById('uploadText').textContent = 'Click here or drag and drop an image to upload';
        }
    });
}

// --- Form Submission and Analysis ---

function setupFormSubmission() {
    scanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!imageFile.files.length) {
            return displayMessage("Please select an image file first.", true);
        }

        // 1. Prepare FormData
        const formData = new FormData();
        formData.append('image', imageFile.files[0]);
        
        const treeId = treeSelect.value;
        if (treeId) {
            formData.append('tree_id', treeId);
        } else {
            // Check if farm is selected without a tree
            if (farmSelect.value) {
                // Should enforce tree selection, or allow linking to farm (if the backend supports linking an image directly to a farm_id, which our current schema doesn't fully support cleanly without a tree_id, so we prioritize tree_id or no link).
                displayMessage("Please select a specific tree or perform a Quick Scan.", true);
                return;
            }
        }
        
        // 2. UI State: Loading
        analyzeButton.disabled = true;
        buttonText.textContent = 'Analyzing... Please wait (10-30s)';
        resultsSection.style.display = 'none';
        displayMessage("Processing image and running ML model...", false);
        
        try {
            // 3. API Call
            const response = await ScanAPI.uploadAndAnalyze(formData);
            
            // 4. Handle Success
            displayMessage("Analysis complete! See results below.", false);
            renderResults(response.result, response.image_id);

        } catch (error) {
            displayMessage(error.message || "An error occurred during analysis.", true);
        } finally {
            // 5. Reset UI State
            analyzeButton.disabled = false;
            buttonText.textContent = 'Analyze Image';
        }
    });
}

/**
 * Populates the results section with the prediction data.
 * @param {object} result - The prediction result object.
 * @param {number} imageId - The ID of the saved image record.
 */
function renderResults(result, imageId) {
    document.getElementById('predictedClass').textContent = result.class;
    document.getElementById('confidenceScore').textContent = `${(result.confidence * 100).toFixed(2)}%`;
    
    const rawList = document.getElementById('rawOutputList');
    rawList.innerHTML = '';
    
    // Sort the raw output by probability (descending)
    const sortedRaw = Object.entries(result.raw_data)
        .sort(([, a], [, b]) => b - a);

    sortedRaw.forEach(([disease, probability]) => {
        const item = document.createElement('div');
        item.className = 'results-item';
        item.innerHTML = `
            <span>${disease}</span>
            <strong>${(probability * 100).toFixed(2)}%</strong>
        `;
        rawList.appendChild(item);
    });
    
    document.getElementById('viewInGalleryLink').href = `/gallery/${imageId}`;
    resultsSection.style.display = 'block';
}