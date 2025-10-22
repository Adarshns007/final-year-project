/**
 * settings.js: Client-side logic for the User Settings page.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true);
    loadUserProfile();
    setupAccountForm();
    setupPasswordForm();
});

let currentUserData = {};

/**
 * Fetches current user profile data (email, username) and populates the forms.
 */
async function loadUserProfile() {
    try {
        // This assumes a GET /api/user route exists to fetch the current user's details
        // (Similar to fetching user data after successful token decoding, but dedicated GET endpoint)
        const user = await apiCall('/api/user/profile', 'GET', null, true); 
        
        currentUserData = user;
        document.getElementById('currentEmail').value = user.email;
        document.getElementById('newUsername').value = user.username;
        
    } catch (error) {
        displayMessage("Failed to load user profile.", true);
    }
}

/**
 * Sets up the submission handler for the account details form.
 */
function setupAccountForm() {
    const form = document.getElementById('updateAccountForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newUsername = document.getElementById('newUsername').value;
            const newEmail = document.getElementById('newEmail').value;
            
            if (newUsername.trim() === '') {
                return displayMessage("Username cannot be empty.", true);
            }
            
            try {
                // Determine if only username changed
                if (newUsername !== currentUserData.username && newEmail === '') {
                    // Update username only (assuming a PUT /api/user endpoint handles this)
                    await apiCall('/api/user', 'PUT', { username: newUsername }, true);
                    currentUserData.username = newUsername; // Update local state
                    displayMessage("Username updated successfully.", false);
                    
                } else if (newEmail !== '' && newEmail !== currentUserData.email) {
                    // Changing email requires verification (complex flow, simplified here)
                    
                    // 1. Call backend to send verification code to new email
                    // This requires implementing the /api/user/change-email/send-code route
                    await apiCall('/api/user/change-email/send-code', 'POST', { new_email: newEmail }, true);
                    
                    displayMessage(`Verification code sent to ${newEmail}. Check your inbox to confirm the change.`, false);
                    // Usually, this would open a modal for code entry, handled by separate JS.
                    
                } else {
                    displayMessage("No changes detected in username or email.", false);
                }
            } catch (error) {
                displayMessage(error.message || "Failed to update account details.", true);
            }
        });
    }
}

/**
 * Sets up the submission handler for the password change form.
 */
function setupPasswordForm() {
    const form = document.getElementById('updatePasswordForm');
    const messageContainer = document.getElementById('security-message');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            
            if (newPassword !== confirmNewPassword) {
                return displayMessage("New passwords do not match.", true, messageContainer);
            }
            if (newPassword.length < 6) {
                return displayMessage("New password must be at least 6 characters.", true, messageContainer);
            }
            
            try {
                // This assumes a PUT /api/user/password endpoint exists
                await apiCall('/api/user/password', 'PUT', { 
                    current_password: currentPassword, 
                    new_password: newPassword 
                }, true);
                
                displayMessage("Password changed successfully! Please log in again.", false, messageContainer);
                form.reset();
                
                // Force logout after password change for security
                setTimeout(AuthAPI.logout, 1500); 

            } catch (error) {
                displayMessage(error.message || "Password change failed. Check your current password.", true, messageContainer);
            }
        });
    }
}

// NOTE: Since the message-container ID is global, we need to adjust 
// the helper in utils.js to accept an optional specific container.

// --- Helper adjustment (MUST BE IMPLEMENTED IN utils.js) ---
/*
function displayMessage(message, isError = false, container = null) {
    const messageContainer = container || document.getElementById('message-container');
    // ... rest of logic
}
*/