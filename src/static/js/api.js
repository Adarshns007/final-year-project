/**
 * api.js: Centralized module for all interactions with the Flask backend API.
 * Uses Fetch API and manages the JWT token stored in localStorage.
 */

// Base URL for the Flask API
const API_BASE_URL = window.location.origin;

// *** CRITICAL CHANGE: Attach to window object for global access ***
// These functions must be available globally for utils.js and other scripts
window.getAuthToken = () => {
    return localStorage.getItem('authToken');
};

window.setAuthToken = (token) => {
    localStorage.setItem('authToken', token);
};

window.removeAuthToken = () => {
    localStorage.removeItem('authToken');
};

/**
 * Generic API call function.
 * Handles fetching data from the backend, including authorization headers.
 * @param {string} endpoint - The API path (e.g., '/api/user/farm').
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE).
 * @param {object | FormData | null} body - Data to send (JSON object or FormData).
 * @param {boolean} requiresAuth - Whether to include the Authorization header.
 * @returns {Promise<object>} The JSON response data.
 * @throws {Error} If the API call fails or returns an error.
 */
async function apiCall(endpoint, method = 'GET', body = null, requiresAuth = true) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {};
    let fetchBody = body;
    
    // Determine content type: FormData for file uploads, application/json for most other data
    const isFormData = body instanceof FormData;
    if (!isFormData && body) {
        headers['Content-Type'] = 'application/json';
        fetchBody = JSON.stringify(body);
    }

    if (requiresAuth) {
        // Use the globally available getAuthToken
        const token = window.getAuthToken(); 
        if (!token) {
            console.error("Authorization required but token is missing for endpoint:", endpoint);
            // Redirect to login page if token is missing for a protected route
            window.location.href = '/login'; 
            throw new Error("Authentication token missing.");
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method: method,
        headers: headers,
        // Only include body for methods that support it (POST, PUT, PATCH)
        ...(method !== 'GET' && method !== 'HEAD' && { body: fetchBody })
    };

    try {
        const response = await fetch(url, options);
        
        // Handle 401 Unauthorized specifically for authenticated requests
        if (response.status === 401 && requiresAuth) {
            window.removeAuthToken(); // Use global removeAuthToken to clear invalid token
            window.location.href = '/login'; // Redirect to login
            throw new Error("Token expired or invalid (401).");
        }
        
        // Handle 204 No Content for successful operations with no response body
        if (response.status === 204) {
            return { message: "Operation successful" };
        }
        
        // Attempt to parse JSON response for other status codes
        // Check if the content type is JSON before trying to parse
        const contentType = response.headers.get('content-type');
        let data = {};
        if (contentType && contentType.includes('application/json')) {
             data = await response.json();
        } else {
             // If not JSON, try to read text and include status in error message
             const text = await response.text();
             if (!response.ok) {
                 throw new Error(`API Error: ${response.status} ${response.statusText}. Response body: ${text.substring(0, 100)}`);
             }
             // If OK but no JSON (e.g., 200 with empty body), return default
             return { message: "Operation successful", raw_response: text };
        }


        // If response is not OK (e.g., 400, 500, etc.), throw an error with message from backend
        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status} ${response.statusText}`);
        }

        return data; // Return the parsed JSON data

    } catch (error) {
        console.error('API Call Error:', error);
        throw error; // Re-throw to be handled by the caller
    }
}

// --- Specific API Functions ---

// 1. Auth Functions (Public - generally do not require an Authorization header)
const AuthAPI = {
    /**
     * Registers a new user.
     * @param {string} username
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>} Response data from signup.
     */
    signup: (username, email, password) => apiCall('/api/auth/signup', 'POST', { username, email, password }, false),
    
    /**
     * Authenticates a user and stores the received JWT token.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>} Response data from signin, including user info.
     */
    signin: async (email, password) => {
        try {
            const data = await apiCall('/api/auth/signin', 'POST', { email, password }, false);
            console.log("AuthAPI.signin: Backend response data:", data); // Debugging log
            if (data && data.token) {
                console.log("AuthAPI.signin: Token received, storing:", data.token); // Debugging log
                window.setAuthToken(data.token); // Store the token globally
            } else {
                console.warn("AuthAPI.signin: No token found in backend response:", data); // Debugging log
            }
            return data;
        } catch (error) {
            console.error("AuthAPI.signin: Error during signin process:", error); // Debugging log
            throw error; // Re-throw the error for UI handling
        }
    },
    
    /**
     * Logs out the user by removing the JWT token from local storage.
     * @returns {void}
     */
    logout: async () => {
        // Optionally call backend logout if it clears server-side sessions, but typically not needed for JWTs.
        // await apiCall('/api/auth/logout', 'POST', null, true); 
        window.removeAuthToken(); // Remove token globally
        window.location.href = '/login'; // Redirect to login page
    }
};

// 2. User Data Functions (Requires Auth - these endpoints need an Authorization header)
const UserAPI = {
    getFarms: () => apiCall('/api/user/farm', 'GET'),
    getGallery: () => apiCall('/api/scan/gallery', 'GET'), // Assuming gallery data is user-specific
    createFarm: (farm_name, location_details) => apiCall('/api/user/farm', 'POST', { farm_name, location_details }),
    getTreesByFarm: (farm_id) => apiCall(`/api/user/farm/${farm_id}/tree`, 'GET'),
    createTree: (farm_id, tree_name, age_years, planting_date) => 
        apiCall('/api/user/tree', 'POST', { farm_id, tree_name, age_years, planting_date }),
    getUserProfile: () => apiCall('/api/user/profile', 'GET'),
    updateUserProfile: (username) => apiCall('/api/user', 'PUT', { username }),
    updatePassword: (current_password, new_password) => apiCall('/api/user/password', 'PUT', { current_password, new_password }),
    submitFeedback: (subject, message, rating) => apiCall('/api/user/feedback', 'POST', { subject, message, rating }),
};

// 3. Scan Functions (Requires Auth - these endpoints need an Authorization header)
const ScanAPI = {
    /**
     * Uploads an image for analysis.
     * @param {FormData} formData - FormData object containing the image file.
     * @returns {Promise<object>} Analysis result.
     */
    uploadAndAnalyze: (formData) => apiCall('/api/scan/upload-and-analyze', 'POST', formData, true),
    
    // Add other scan-related API calls here as needed (e.g., get scan by ID, delete scan)
};