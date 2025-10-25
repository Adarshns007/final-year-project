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
const uploadText = document.getElementById('uploadText');

// NEW ELEMENTS FOR WEBCAM/GEO-TAGGING
const cameraStartButton = document.getElementById('cameraStartButton');
const captureButton = document.getElementById('captureButton');
const uploadFileButton = document.getElementById('uploadFileButton');
const retakeButton = document.getElementById('retakeButton');
const liveVideo = document.getElementById('liveVideo');
const captureCanvas = document.getElementById('captureCanvas');
const uploadButtonsContainer = document.getElementById('uploadButtons');
const scanLatitudeField = document.getElementById('scanLatitude');
const scanLongitudeField = document.getElementById('scanLongitude');
const locationStatusElement = document.getElementById('locationStatus'); // New status element

let mediaStream = null; 
let capturedBlob = null; 
let currentGps = { lat: null, lon: null }; // Storage for GPS data

// New result display elements (unchanged)
const resultImageOriginal = document.getElementById('resultImageOriginal');
const resultImageAnalyzed = document.getElementById('resultImageAnalyzed');
const predictedClassHeader = document.getElementById('predictedClassHeader');
const diseaseStatusTag = document.getElementById('diseaseStatusTag');
const confidenceProgressBar = document.getElementById('confidenceProgressBar');
const confidenceScoreText = document.getElementById('confidenceScoreText');
const organicTreatmentText = document.getElementById('organicTreatmentText');
const chemicalTreatmentText = document.getElementById('chemicalTreatmentText');
const affectedDescription = document.getElementById('affectedDescription');
const rawOutputList = document.getElementById('rawOutputList'); 


let allFarms = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true);
    
    setTimeout(() => {
        loadFarmTreeData();
    }, 200); 
    
    setupInputButtons();
    setupFormSubmission();
    resetUploadArea();
    // FIX: Start initial location tracking right away
    startLocationTracking(); 
});

// --- Data Loading and Filtering (unchanged) ---
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


// --- GEO LOCATION TRACKING ---

function updateLocationStatus(message, isError = false) {
    locationStatusElement.textContent = `Location status: ${message}`;
    locationStatusElement.style.color = isError ? '#a94442' : '#3c763d';
}

function startLocationTracking() {
    if (!navigator.geolocation) {
        updateLocationStatus("Geolocation not supported.", true);
        return;
    }

    updateLocationStatus("Awaiting GPS lock...");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentGps.lat = position.coords.latitude.toFixed(8);
            currentGps.lon = position.coords.longitude.toFixed(8);
            
            // Populate hidden fields
            scanLatitudeField.value = currentGps.lat;
            scanLongitudeField.value = currentGps.lon;
            
            updateLocationStatus(`GPS locked: ${currentGps.lat}, ${currentGps.lon}`);
        },
        (error) => {
            // Note: Error 1 means permission denied
            if (error.code === 1) {
                updateLocationStatus("Permission denied. Scan location will not be saved.", true);
            } else {
                updateLocationStatus("Unable to determine location.", true);
            }
            currentGps = { lat: null, lon: null };
            scanLatitudeField.value = '';
            scanLongitudeField.value = '';
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

// --- UI State Management for Upload Area ---

function resetUploadArea() {
    stopWebcam(); 
    imagePreview.style.display = 'none';
    imagePreview.src = '';
    imageFile.value = ''; 
    capturedBlob = null; 

    liveVideo.style.display = 'none'; 

    uploadText.textContent = 'Select an image source:';
    cameraStartButton.style.display = 'block';
    captureButton.style.display = 'none';
    uploadFileButton.style.display = 'block';
    retakeButton.style.display = 'none';
    uploadButtonsContainer.style.display = 'flex'; 
    
    // Re-run GPS tracking on reset
    startLocationTracking(); 
}


// --- WEBCAM Logic ---

function stopWebcam() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        liveVideo.srcObject = null;
        mediaStream = null;
    }
}

async function startWebcam() {
    resetUploadArea(); 
    imagePreview.style.display = 'none'; 

    try {
        uploadText.textContent = 'Requesting camera access...';
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        mediaStream = stream;
        liveVideo.srcObject = stream;
        liveVideo.style.display = 'block'; 
        
        cameraStartButton.style.display = 'none';
        captureButton.style.display = 'block';
        uploadFileButton.style.display = 'none';
        retakeButton.style.display = 'none'; 
        
        uploadText.textContent = 'Live Camera Feed: Position the Leaf';

    } catch (error) {
        displayMessage(`Camera access denied or failed. Please use Upload File.`, true);
        resetUploadArea(); 
        console.error("Camera access error:", error);
    }
}

function capturePhoto() {
    if (!mediaStream) {
        displayMessage("No active camera stream to capture from.", true);
        return;
    }

    stopWebcam();
    
    const context = captureCanvas.getContext('2d');
    
    captureCanvas.width = liveVideo.videoWidth;
    captureCanvas.height = liveVideo.videoHeight;
    
    context.drawImage(liveVideo, 0, 0, captureCanvas.width, captureCanvas.height);
    
    captureCanvas.toBlob((blob) => {
        capturedBlob = blob;
        
        const imgUrl = URL.createObjectURL(blob);
        imagePreview.src = imgUrl;
        imagePreview.style.display = 'block';
        
        uploadText.textContent = 'Photo Captured. Click Analyze.';

    }, 'image/jpeg');

    cameraStartButton.style.display = 'none';
    captureButton.style.display = 'none';
    uploadFileButton.style.display = 'none';
    retakeButton.style.display = 'block';
}


function setupInputButtons() {
    
    cameraStartButton.addEventListener('click', startWebcam);
    captureButton.addEventListener('click', capturePhoto);

    uploadFileButton.addEventListener('click', () => {
        stopWebcam();
        // Trigger the hidden file input for standard file selection
        imageFile.removeAttribute('capture'); 
        imageFile.click();
    });

    imageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Display uploaded file and update UI
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
                liveVideo.style.display = 'none';
                uploadText.textContent = 'Image Selected from Disk.';
            };
            reader.readAsDataURL(file);
            
            cameraStartButton.style.display = 'none';
            captureButton.style.display = 'none';
            uploadFileButton.style.display = 'none';
            retakeButton.style.display = 'block';
            
            // Ensure location status is refreshed for file upload too
            startLocationTracking(); 
        } 
    });

    retakeButton.addEventListener('click', () => {
        resetUploadArea(); // This handles both retake and changing image
    });
}


// --- Form Submission (Updated for Blob/File Handling) ---

function setupFormSubmission() {
    scanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let fileToUpload = null;

        if (capturedBlob) {
            // Case 1: Photo was captured from webcam
            fileToUpload = new File([capturedBlob], 'webcam_capture.jpeg', { type: 'image/jpeg' });
        } else if (imageFile.files.length) {
            // Case 2: File was uploaded from device storage
            fileToUpload = imageFile.files[0];
        } else {
            return displayMessage("Please select or capture an image file first.", true);
        }

        const formData = new FormData();
        formData.append('image', fileToUpload);
        
        // FIX: Append real-time GPS data to the form submission
        if (scanLatitudeField.value && scanLongitudeField.value) {
            formData.append('scan_latitude', scanLatitudeField.value);
            formData.append('scan_longitude', scanLongitudeField.value);
        }

        const treeId = treeSelect.value;
        const farmId = farmSelect.value; 
        
        if (treeId) {
            formData.append('tree_id', treeId);
        }
        
        // ... (Analysis Process)
        analyzeButton.disabled = true;
        buttonText.textContent = 'Analyzing... Please wait (10-30s)';
        resultsSection.style.display = 'none';
        displayMessage("Processing image and running ML model...", false);
        
        try {
            const response = await ScanAPI.uploadAndAnalyze(formData);
            
            displayMessage("Analysis complete! See results below.", false);
            renderResults(response.result, response.image_id, response.file_path);

        } catch (error) {
            displayMessage(error.message || "An error occurred during analysis.", true);
            console.error("Analysis Error:", error);
        } finally {
            analyzeButton.disabled = false;
            buttonText.textContent = 'Analyze Image';
        }
    });
}

/**
 * Populates the results section with the prediction data. (Unchanged)
 */
function renderResults(result, imageId, filePath) {
    const confidencePercent = (result.confidence * 100).toFixed(1);
    const predictedClass = result.class;
    const isHealthy = predictedClass.toLowerCase() === 'healthy'; 
    const primaryColor = isHealthy ? '#5cb85c' : '#d9534f'; 
    const treatments = result.treatment_details || {}; 

    // --- Image Display ---
    resultImageOriginal.src = filePath;
    resultImageAnalyzed.src = filePath;
    
    // --- Prediction Summary & Confidence Bar ---
    predictedClassHeader.textContent = predictedClass;
    predictedClassHeader.style.color = primaryColor;
    
    diseaseStatusTag.textContent = isHealthy ? 'Healthy' : 'Disease Detected';
    diseaseStatusTag.className = `disease-status ${isHealthy ? 'healthy' : ''}`; 

    confidenceProgressBar.style.width = `${confidencePercent}%`;
    confidenceProgressBar.style.backgroundColor = primaryColor;
    confidenceProgressBar.classList.toggle('healthy', isHealthy); 
    confidenceScoreText.textContent = `${confidencePercent}%`;
    
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