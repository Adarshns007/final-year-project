from backend.services.database_service import DatabaseService
from typing import Optional, Dict

class StatisticsModel:
    """
    Handles aggregation and calculation of user-specific statistics.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def get_user_disease_distribution(self, user_id: int, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict:
        """
        Calculates the distribution of predicted diseases for a specific user within a date range.
        Returns a dictionary: {disease_name: count}.
        """
        # user_id = int(user_id) # REMOVED REDUNDANT CAST
        base_query = """
            SELECT 
                p.predicted_class, 
                COUNT(*) AS count
            FROM predictions p
            JOIN images i ON p.image_id = i.image_id
            WHERE i.user_id = %s
        """
        params = [user_id]
        
        if start_date:
            base_query += " AND i.upload_date >= %s"
            params.append(start_date)
        if end_date:
            base_query += " AND i.upload_date <= %s"
            params.append(end_date)
            
        base_query += " GROUP BY p.predicted_class"
        
        results = self.db.execute_query(base_query, tuple(params))
        
        distribution = {row['predicted_class']: row['count'] for row in results} if results else {}
        return distribution

    def get_user_scans_by_tree(self, user_id: int, start_date: Optional[str] = None, end_date: Optional[str] = None) -> list:
        """
        Counts the number of scans per tree owned by the user.
        Returns a list of dictionaries: [{tree_name: str, count: int}].
        """
        # user_id = int(user_id) # REMOVED REDUNDANT CAST
        base_query = """
            SELECT 
                t.tree_name, 
                COUNT(i.image_id) AS count
            FROM images i
            JOIN trees t ON i.tree_id = t.tree_id
            JOIN farms f ON t.farm_id = f.farm_id
            WHERE i.user_id = %s AND i.tree_id IS NOT NULL
        """
        params = [user_id]
        
        if start_date:
            base_query += " AND i.upload_date >= %s"
            params.append(start_date)
        if end_date:
            base_query += " AND i.upload_date <= %s"
            params.append(end_date)
            
        base_query += " GROUP BY t.tree_name ORDER BY count DESC"
        
        results = self.db.execute_query(base_query, tuple(params))
        return results if results else []

    def get_user_total_scans(self, user_id: int, start_date: Optional[str] = None, end_date: Optional[str] = None) -> int:
        """
        Gets the total number of scans for a user within a date range.
        """
        # user_id = int(user_id) # REMOVED REDUNDANT CAST
        base_query = "SELECT COUNT(*) AS total FROM images WHERE user_id = %s"
        params = [user_id]
        
        if start_date:
            base_query += " AND upload_date >= %s"
            params.append(start_date)
        if end_date:
            base_query += " AND upload_date <= %s"
            params.append(end_date)
            
        result = self.db.execute_query(base_query, tuple(params), fetch_one=True)
        # Handle None return from execute_query if DB failed
        return result['total'] if result and 'total' in result else 0