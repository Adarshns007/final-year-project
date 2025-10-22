/**
 * feedback.js: Client-side logic for submitting user feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(true); 
    setupFeedbackSubmission();
});

/**
 * Sets up the event listener for the feedback form submission.
 */
function setupFeedbackSubmission() {
    const feedbackForm = document.getElementById('feedbackForm');

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            const rating = document.getElementById('rating').value;

            if (!subject || !message) {
                return displayMessage("Please fill out both Subject and Message.", true);
            }

            try {
                const button = feedbackForm.querySelector('button');
                button.disabled = true;
                button.textContent = 'Submitting...';

                // Call the new API endpoint (implemented in user_routes.py update)
                const response = await apiCall('/api/user/feedback', 'POST', { 
                    subject, 
                    message, 
                    rating: rating ? parseInt(rating) : null 
                }, true);
                
                displayMessage(response.message || "Feedback submitted successfully!", false);
                feedbackForm.reset();

            } catch (error) {
                displayMessage(error.message || "Failed to submit feedback. Please try again.", true);
            } finally {
                const button = feedbackForm.querySelector('button');
                button.disabled = false;
                button.textContent = 'Submit Feedback';
            }
        });
    }
}