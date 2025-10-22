from backend.services.database_service import DatabaseService

class FeedbackModel:
    """
    Handles all database operations for the 'feedbacks' table.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def create_feedback(self, user_id, subject, message, rating=None):
        """Inserts a new feedback record."""
        query = """
            INSERT INTO feedbacks (user_id, subject, message, rating)
            VALUES (%s, %s, %s, %s)
        """
        params = (user_id, subject, message, rating)
        # Returns the ID of the new feedback
        return self.db.execute_query(query, params, commit=True)

    def get_all_feedbacks(self):
        """
        Retrieves all feedback records, joining with user data for admin view.
        """
        query = """
            SELECT f.*, u.username, u.email
            FROM feedbacks f
            JOIN users u ON f.user_id = u.user_id
            ORDER BY f.submitted_at DESC
        """
        return self.db.execute_query(query)
        
    def get_feedback_by_id(self, feedback_id):
        """Retrieves a single feedback record."""
        query = "SELECT * FROM feedbacks WHERE feedback_id = %s"
        params = (feedback_id,)
        return self.db.execute_query(query, params, fetch_one=True)

    def update_feedback_status(self, feedback_id, status):
        """Updates the status of a feedback record (used by admin)."""
        query = "UPDATE feedbacks SET status = %s WHERE feedback_id = %s"
        params = (status, feedback_id)
        return self.db.execute_query(query, params, commit=True) is not None