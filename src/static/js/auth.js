// src/static/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if the user is already logged in (redirect to dashboard if so)
    checkAuthAndRedirect(false, true); 

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const messageDiv = document.getElementById('message');
    
    // FIX: Get the Forgot Password and Reset Password forms/elements
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.textContent = ''; // Clear previous messages
            messageDiv.style.color = 'red';

            const email = loginForm.email.value;
            const password = loginForm.password.value;

            // Basic client-side validation using functions from utils.js
            if (!validateEmail(email)) { 
                messageDiv.textContent = 'Please enter a valid email address.';
                return;
            }
            if (!validatePassword(password)) { 
                messageDiv.textContent = 'Password must be at least 6 characters.';
                return;
            }

            try {
                const response = await AuthAPI.signin(email, password);
                messageDiv.style.color = 'green';
                messageDiv.textContent = response.message;
                
                setTimeout(() => { 
                    window.location.href = '/dashboard';
                }, 300); 

            } catch (error) {
                console.error("Login failed:", error);
                messageDiv.textContent = error.message || "Login failed. Please check your credentials.";
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.textContent = ''; // Clear previous messages
            messageDiv.style.color = 'red';

            const username = signupForm.username.value;
            const email = signupForm.email.value;
            const password = signupForm.password.value;
            const confirmPassword = signupForm.confirmPassword.value;

            // Basic client-side validation using functions from utils.js
            if (username.length < 3) {
                messageDiv.textContent = 'Username must be at least 3 characters.';
                return;
            }
            if (!validateEmail(email)) { 
                messageDiv.textContent = 'Please enter a valid email address.';
                return;
            }
            if (!validatePassword(password)) { 
                messageDiv.textContent = 'Password must be at least 6 characters.';
                return;
            }
            if (password !== confirmPassword) {
                messageDiv.textContent = 'Passwords do not match.';
                return;
            }

            try {
                const response = await AuthAPI.signup(username, email, password);
                messageDiv.style.color = 'green';
                messageDiv.textContent = response.message + " Redirecting to login...";
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } catch (error) {
                console.error("Signup failed:", error);
                messageDiv.textContent = error.message || "Signup failed.";
            }
        });
    }
    
    // FIX: Forgot Password Form Submission
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = forgotPasswordForm.email.value;
            const fpMessage = document.getElementById('fpMessage');
            
            try {
                const response = await apiCall('/api/auth/forgot-password', 'POST', { email }, false);
                fpMessage.style.color = 'green';
                
                // FIX: Display the clickable reset URL for demo
                const messageText = response.message + `<br>For demo purposes, click this link to reset your password:<br><a href="${response.reset_url}" target="_blank">${response.reset_url}</a>`;
                
                fpMessage.innerHTML = messageText;
                
            } catch (error) {
                fpMessage.style.color = 'red';
                fpMessage.textContent = error.message || "Failed to initiate reset.";
            }
        });
    }

    // FIX: Reset Password Form Submission
    if (resetPasswordForm) {
        // FIX: Autofill the code from the URL on load
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');
        if (codeFromUrl) {
            document.getElementById('resetCode').value = codeFromUrl;
        }

        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = resetPasswordForm.email.value;
            const code = resetPasswordForm.resetCode.value;
            const newPassword = resetPasswordForm.newPassword.value;
            const confirmNewPassword = resetPasswordForm.confirmNewPassword.value;
            const rpMessage = document.getElementById('rpMessage');

            if (newPassword !== confirmNewPassword) {
                rpMessage.textContent = 'New passwords do not match.';
                return;
            }
            if (!validatePassword(newPassword)) { // Added validation check
                 rpMessage.textContent = 'Password must be at least 6 characters.';
                 return;
            }
            
            try {
                // FIX: Send email, code, and new password
                const response = await apiCall('/api/auth/reset-password', 'POST', { 
                    email: email,
                    code: code,
                    new_password: newPassword
                }, false); 
                
                rpMessage.style.color = 'green';
                rpMessage.textContent = response.message;
                
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);

            } catch (error) {
                rpMessage.style.color = 'red';
                rpMessage.textContent = error.message || "Password reset failed. Check email and code.";
            }
        });
    }
});