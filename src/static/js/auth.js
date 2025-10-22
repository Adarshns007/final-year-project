// src/static/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if the user is already logged in (redirect to dashboard if so)
    checkAuthAndRedirect(false, true); // Don't redirect to login if logged out, but to dashboard if logged in.

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const messageDiv = document.getElementById('message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.textContent = ''; // Clear previous messages
            messageDiv.style.color = 'red';

            const email = loginForm.email.value;
            const password = loginForm.password.value;

            // Basic client-side validation using functions from utils.js
            if (!validateEmail(email)) { // This function should now be available from utils.js
                messageDiv.textContent = 'Please enter a valid email address.';
                return;
            }
            if (!validatePassword(password)) { // This function should now be available from utils.js
                messageDiv.textContent = 'Password must be at least 6 characters.';
                return;
            }

            try {
                const response = await AuthAPI.signin(email, password);
                messageDiv.style.color = 'green';
                messageDiv.textContent = response.message;
                
                // CRITICAL FIX: Increased the delay to 300ms. This gives the browser 
                // more time to complete the asynchronous localStorage.setItem() and 
                // prevent the dashboard's authentication check from failing immediately.
                setTimeout(() => { 
                    window.location.href = '/dashboard';
                }, 300); // Increased delay from 100ms to 300ms

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
            // NOTE: Assuming the 'confirmPassword' field is now correctly added to signup.html
            const confirmPassword = signupForm.confirmPassword.value;

            // Basic client-side validation using functions from utils.js
            if (username.length < 3) {
                messageDiv.textContent = 'Username must be at least 3 characters.';
                return;
            }
            if (!validateEmail(email)) { // This function should now be available from utils.js
                messageDiv.textContent = 'Please enter a valid email address.';
                return;
            }
            if (!validatePassword(password)) { // This function should now be available from utils.js
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
});
