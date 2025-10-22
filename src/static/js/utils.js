/**
 * utils.js: Contains utility functions used across multiple frontend scripts.
 */

/**
 * Decodes a JWT token and returns its payload.
 * @param {string} token - The JWT token.
 * @returns {object | null} The decoded payload or null if invalid.
 */
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT:", e);
        return null;
    }
}

/**
 * Checks if a user is logged in by validating the JWT token in localStorage.
 * IMPORTANT: Relies on window.getAuthToken being defined by api.js
 * @returns {boolean} True if logged in, false otherwise.
 */
function isLoggedIn() {
    if (typeof window.getAuthToken !== 'function') {
        console.error("isLoggedIn: window.getAuthToken is not defined. Check script loading order.");
        return false;
    }
    const token = window.getAuthToken(); 
    if (!token) {
        return false;
    }
    const payload = decodeJwt(token);
    if (payload && payload.exp) {
        const currentTime = Date.now() / 1000; 
        return payload.exp > currentTime;
    }
    return !!payload;
}

/**
 * Checks authentication status and redirects if necessary.
 * FIX: Uses setTimeout to mitigate the race condition upon new page navigation.
 * @param {boolean} redirectToLoginIfLoggedOut - If true, redirects to /login if not authenticated.
 * @param {boolean} redirectToDashboardIfLoggedIn - If true, redirects to /dashboard if authenticated.
 */
function checkAuthAndRedirect(redirectToLoginIfLoggedOut = false, redirectToDashboardIfLoggedIn = false) {
    // CRITICAL FIX: The timeout ensures the browser has time to stabilize 
    // the local storage reading after page navigation.
    setTimeout(() => {
        if (isLoggedIn()) {
            if (redirectToDashboardIfLoggedIn && window.location.pathname !== '/dashboard') {
                window.location.href = '/dashboard';
            }
        } else {
            if (redirectToLoginIfLoggedOut) {
                 // Only redirect if we are NOT already on the login/signup page
                if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                    window.location.href = '/login';
                }
            }
        }
    }, 100); // 100ms delay is necessary for stability
}

// --- Validation Utilities (REQUIRED FOR auth.js) ---

/**
 * Validates an email address format.
 * @param {string} email - The email string to validate.
 * @returns {boolean} True if the email is valid, false otherwise.
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Validates a password's strength (at least 6 characters).
 * @param {string} password - The password string to validate.
 * @returns {boolean} True if the password meets criteria, false otherwise.
 */
function validatePassword(password) {
    return password.length >= 6;
}

// --- CRITICAL FIX: Add missing displayMessage utility function ---
/**
 * Displays a message in the designated container.
 * @param {string} message - The message content.
 * @param {boolean} isError - True if it's an error message (red text).
 * @param {HTMLElement | null} container - Optional specific container element. Defaults to 'message-container'.
 */
function displayMessage(message, isError = false, container = null) {
    const messageContainer = container || document.getElementById('message-container');
    
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.style.color = isError ? 'red' : 'green';
        messageContainer.style.padding = '10px';
        messageContainer.style.border = isError ? '1px solid red' : '1px solid green';
        messageContainer.style.display = message ? 'block' : 'none';
        
        if (!isError && message.length > 0) {
            setTimeout(() => {
                messageContainer.textContent = '';
                messageContainer.style.display = 'none';
            }, 3000);
        }
    } else {
        console.warn("Message container not found. Message:", message);
    }
}