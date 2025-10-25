/**
 * settings.js: Client-side logic for the User Settings page.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true);
    // FIX 1: Apply saved theme immediately on load
    applySavedTheme(); 
    loadUserProfile();
    setupAccountForm();
    setupPasswordForm();
    setupPreferencesForm(); 
});

let currentUserData = {};
let newEmailPending = null; 

// FIX 2: Function to apply theme class based on storage
function applySavedTheme() {
    const savedTheme = localStorage.getItem('userTheme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    // Optionally set the selector value if it exists
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
}

/**
 * Fetches current user profile data (email, username) and populates the forms.
 */
async function loadUserProfile() {
    try {
        // This assumes a GET /api/user route exists to fetch the current user's details
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
    const sendVerificationButton = document.getElementById('sendVerificationButton');
    const confirmEmailChangeButton = document.getElementById('confirmEmailChangeButton');
    const verificationCodeGroup = document.getElementById('verificationCodeGroup');
    const messageContainer = document.getElementById('account-message');

    if (form) {
        // --- Step 1: Handle Username Change / Send Verification ---
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newUsername = document.getElementById('newUsername').value;
            const newEmail = document.getElementById('newEmail').value.trim();
            
            if (newUsername.trim() === '') {
                return displayMessage("Username cannot be empty.", true, messageContainer);
            }
            if (newEmail !== '' && !validateEmail(newEmail)) {
                 return displayMessage("Please enter a valid new email address.", true, messageContainer);
            }
            
            try {
                // Case A: Only username changed
                if (newUsername !== currentUserData.username && newEmail === '') {
                    await apiCall('/api/user', 'PUT', { username: newUsername }, true);
                    currentUserData.username = newUsername; // Update local state
                    displayMessage("Username updated successfully.", false, messageContainer);
                    
                } 
                // Case B: Initiate Email Change
                else if (newEmail !== '' && newEmail !== currentUserData.email) {
                    
                    sendVerificationButton.disabled = true;
                    sendVerificationButton.textContent = 'Sending...';

                    // Call backend to send verification code to new email
                    await apiCall('/api/user/change-email/send-code', 'POST', { new_email: newEmail }, true);
                    
                    newEmailPending = newEmail; // Store the email pending verification
                    verificationCodeGroup.style.display = 'block'; // Show code input field
                    sendVerificationButton.style.display = 'none'; // Hide send button
                    
                    displayMessage(`Verification code sent to ${newEmail}. Enter it below to confirm. (MOCK CODE: 123456)`, false, messageContainer);
                    
                } else {
                    displayMessage("No substantial changes detected.", false, messageContainer);
                }
            } catch (error) {
                displayMessage(error.message || "Failed to update account details or send code.", true, messageContainer);
            } finally {
                sendVerificationButton.disabled = false;
                sendVerificationButton.textContent = 'Save Account Changes / Send Verification';
            }
        });
        
        // --- Step 2: Handle Verification Code Confirmation ---
        confirmEmailChangeButton.addEventListener('click', async () => {
            const code = document.getElementById('verificationCode').value.trim();
            
            if (!newEmailPending) {
                return displayMessage("Please initiate email change first.", true, messageContainer);
            }
            if (code.length !== 6) {
                return displayMessage("Code must be 6 digits.", true, messageContainer);
            }
            
            confirmEmailChangeButton.disabled = true;
            confirmEmailChangeButton.textContent = 'Confirming...';

            try {
                // Call backend to confirm the code and update the email
                const response = await apiCall('/api/user/change-email/confirm', 'POST', { 
                    new_email: newEmailPending, 
                    code: code 
                }, true);
                
                displayMessage(response.message, false, messageContainer);
                
                // Success: Force logout to prompt re-login with new credentials
                setTimeout(AuthAPI.logout, 1500); 

            } catch (error) {
                displayMessage(error.message || "Verification failed. Check the code.", true, messageContainer);
            } finally {
                confirmEmailChangeButton.disabled = false;
                confirmEmailChangeButton.textContent = 'Confirm Email Change';
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

/**
 * FIX: Sets up the submission handler for the Preferences section.
 */
function setupPreferencesForm() {
    const saveButton = document.getElementById('savePreferencesButton'); 
    const messageContainer = document.getElementById('preferences-message'); 

    if (saveButton) {
        saveButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';

            try {
                // FIX: Get elements by specific ID/known structure
                const theme = document.getElementById('themeSelect').value;
                const emailAlerts = document.getElementById('emailAlertsCheckbox').checked;
                const lowConfidenceAlerts = document.getElementById('lowConfidenceAlertsCheckbox').checked;

                const preferencesData = {
                    theme: theme,
                    email_alerts: emailAlerts,
                    low_confidence_alerts: lowConfidenceAlerts
                };

                // 1. Call the mock backend API (for demonstration/logging)
                await apiCall('/api/user/preferences', 'PUT', preferencesData, true);
                
                // 2. Client-side Persistence and Application (THE FUNCTIONALITY FIX)
                localStorage.setItem('userTheme', theme);
                applySavedTheme(); // Apply the theme immediately

                // Display success message
                displayMessage("Preferences saved! Theme applied.", false, messageContainer);
                
            } catch (error) {
                 displayMessage(error.message || "Failed to save preferences.", true, messageContainer);
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Preferences';
            }
        });
    }
}