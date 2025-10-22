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

// New result display elements
const resultImageOriginal = document.getElementById('resultImageOriginal');
const resultImageAnalyzed = document.getElementById('resultImageAnalyzed');
const predictedClassHeader = document.getElementById('predictedClassHeader');
const diseaseStatusTag = document.getElementById('diseaseStatusTag');
const confidenceProgressBar = document.getElementById('confidenceProgressBar');
const confidenceScoreText = document.getElementById('confidenceScoreText');
const organicTreatmentText = document.getElementById('organicTreatmentText');
const chemicalTreatmentText = document.getElementById('chemicalTreatmentText');
const affectedDescription = document.getElementById('affectedDescription');


let allFarms = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true);
    
    setTimeout(() => {
        loadFarmTreeData();
    }, 200); 
    
    setupImagePreview();
    setupFormSubmission();
});

// --- Data Loading and Filtering ---

async function loadFarmTreeData() {
    try {
        if (typeof UserAPI === 'undefined' || typeof UserAPI.getFarms !== 'function') {
            throw new Error("UserAPI not loaded correctly.");
        }
        
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
        
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedFarmId = urlParams.get('farm_id');
        if (preselectedFarmId) {
            farmSelect.value = preselectedFarmId;
            populateTreeDropdown();
        }

    } catch (error) {
        displayMessage(error.message || "Failed to load farm data. Quick scans are still available.", true);
    }
}

async function populateTreeDropdown() {
    const farmId = farmSelect.value;
    
    treeSelect.innerHTML = '<option value="">Quick Scan (No link)</option>'; 
    treeSelect.disabled = true;

    if (!farmId) {
        return; 
    }

    try {
        treeSelect.disabled = false;
        const trees = await UserAPI.getTreesByFarm(farmId); 
        
        trees.forEach(tree => {
            const option = document.createElement('option');
            option.value = tree.tree_id;
            option.textContent = tree.tree_name;
            treeSelect.appendChild(option);
        });

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

        const formData = new FormData();
        formData.append('image', imageFile.files[0]);
        
        const treeId = treeSelect.value;
        const farmId = farmSelect.value; 
        
        if (treeId) {
            formData.append('tree_id', treeId);
        } else if (farmId && !treeId) {
            // Do nothing—this is a quick scan. If treeId is blank, the backend ignores it.
        }
        
        analyzeButton.disabled = true;
        buttonText.textContent = 'Analyzing... Please wait (10-30s)';
        resultsSection.style.display = 'none';
        displayMessage("Processing image and running ML model...", false);
        
        try {
            const response = await ScanAPI.uploadAndAnalyze(formData);
            
            displayMessage("Analysis complete! See results below.", false);
            renderResults(response.result, response.image_id, response.file_path);

        } catch (error) {
            displayMessage(error.message || "An error occurred during analysis. (Hint: ML Model might be missing or DB not populated)", true);
            console.error(error);
        } finally {
            analyzeButton.disabled = false;
            buttonText.textContent = 'Analyze Image';
        }
    });
}

/**
 * Populates the results section with the prediction data.
 * @param {object} result - The prediction result object containing class, confidence, raw_data, and treatment_details.
 * @param {number} imageId - The ID of the saved image record.
 * @param {string} filePath - The URL to the uploaded image file.
 */
function renderResults(result, imageId, filePath) {
    const confidencePercent = (result.confidence * 100).toFixed(1);
    const predictedClass = result.class;
    const isHealthy = predictedClass.toLowerCase() === 'healthy'; 
    const primaryColor = isHealthy ? '#5cb85c' : '#d9534f'; 
    const treatments = result.treatment_details || {}; 

    // --- Image Display ---
    resultImageOriginal.src = filePath;
    resultImageAnalyzed.src = filePath; // FIX: Set analyzed image source to be the original image path.
    
    // --- Prediction Summary & Confidence Bar ---
    
    // 1. Prediction Header (Disease Name)
    predictedClassHeader.textContent = predictedClass;
    predictedClassHeader.style.color = primaryColor;
    
    // 2. Status Tag (Disease Detected/Healthy)
    diseaseStatusTag.textContent = isHealthy ? 'Healthy' : 'Disease Detected';
    diseaseStatusTag.className = `disease-status ${isHealthy ? 'healthy' : ''}`; 

    // 3. Confidence Text (e.g., 99.9%)
    // The main percentage is displayed on the bar and tag.
    
    // 4. Progress Bar
    confidenceProgressBar.style.width = `${confidencePercent}%`;
    confidenceProgressBar.style.backgroundColor = primaryColor;
    confidenceProgressBar.classList.toggle('healthy', isHealthy); 
    confidenceScoreText.textContent = `${confidencePercent}%`;
    
    // 5. Affected Description
    if (isHealthy) {
        affectedDescription.textContent = `The leaf appears healthy with ${confidencePercent}% certainty. Continue monitoring.`;
    } else {
        affectedDescription.textContent = `The leaf is affected by ${predictedClass} with ${confidencePercent}% confidence. Immediate action is recommended.`;
    }

    // --- Treatment Details ---
    const organicText = (treatments.organic && treatments.organic !== "N/A") 
                        ? treatments.organic 
                        : 'No specific organic treatment recorded for this disease yet. Please update the admin database.';
    
    const chemicalText = (treatments.chemical && treatments.chemical !== "N/A") 
                        ? treatments.chemical 
                        : 'No specific chemical treatment recorded for this disease yet. Please update the admin database.';

    organicTreatmentText.textContent = organicText;
    chemicalTreatmentText.textContent = chemicalText;


    // --- Probability Breakdown ---
    const rawList = document.getElementById('rawOutputList');
    rawList.innerHTML = '';
    
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