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
    // Ensure window.getAuthToken is available before calling it
    if (typeof window.getAuthToken !== 'function') {
        console.error("isLoggedIn: window.getAuthToken is not defined. Check script loading order.");
        return false;
    }
    const token = window.getAuthToken(); 
    if (!token) {
        return false;
    }
    const payload = decodeJwt(token);
    // Basic check: Token exists and has a payload, and is not expired
    if (payload && payload.exp) {
        const currentTime = Date.now() / 1000; // current time in seconds
        return payload.exp > currentTime;
    }
    return !!payload; // Return true if payload exists, false otherwise
}

/**
 * Checks authentication status and redirects if necessary.
 * IMPORTANT: Relies on isLoggedIn()
 * @param {boolean} redirectToLoginIfLoggedOut - If true, redirects to /login if not authenticated.
 * @param {boolean} redirectToDashboardIfLoggedIn - If true, redirects to /dashboard if authenticated.
 */
function checkAuthAndRedirect(redirectToLoginIfLoggedOut = false, redirectToDashboardIfLoggedIn = false) {
    if (isLoggedIn()) {
        if (redirectToDashboardIfLoggedIn && window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard';
        }
    } else {
        if (redirectToLoginIfLoggedOut && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
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