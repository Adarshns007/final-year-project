from backend.services.database_service import DatabaseService
from flask import current_app

class AdminModel:
    """
    Handles site-wide data retrieval and management operations 
    for the 'admin' role.
    """
    
    def __init__(self, disease_classes=None):
        self.db = DatabaseService()
        # Store the classes passed in during instantiation
        self.classes = disease_classes or []

    def get_all_users(self):
        """Retrieves all users with limited fields (excluding password hash)."""
        # FIX: Explicitly include all expected columns for users table queries
        query = "SELECT user_id, username, email, role, created_at, is_verified FROM users ORDER BY created_at DESC"
        return self.db.execute_query(query)

    def get_system_metrics(self):
        """Retrieves high-level counts for the admin dashboard overview."""
        metrics = {}
        
        # Fetch counts using efficient aggregate queries
        metrics['total_users'] = self.db.execute_query("SELECT COUNT(*) AS count FROM users", fetch_one=True)['count']
        metrics['total_scans'] = self.db.execute_query("SELECT COUNT(*) AS count FROM images", fetch_one=True)['count']
        metrics['total_farms'] = self.db.execute_query("SELECT COUNT(*) AS count FROM farms", fetch_one=True)['count']
        metrics['total_trees'] = self.db.execute_query("SELECT COUNT(*) AS count FROM trees", fetch_one=True)['count']
        
        return metrics

    def get_disease_distribution(self, limit=8):
        """Calculates the count of each predicted disease across all scans."""
        query = """
            SELECT 
                predicted_class, 
                COUNT(*) AS count
            FROM predictions
            GROUP BY predicted_class
            ORDER BY count DESC
            LIMIT %s
        """
        params = (limit,)
        results = self.db.execute_query(query, params)
        
        # Handle None results gracefully in Python
        if results is None:
            current_app.logger.error("Failed to run disease distribution query.")
            return {}

        # Initialize distribution map with 0 for all classes for clean chart output
        distribution = {cls: 0 for cls in self.classes}
        for row in results:
            distribution[row['predicted_class']] = row['count']
            
        return distribution