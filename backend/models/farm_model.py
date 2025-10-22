from backend.services.database_service import DatabaseService

class FarmModel:
    """
    Handles all database operations related to the 'farms' table.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def create_farm(self, user_id, farm_name, location_details=None):
        """Inserts a new farm record."""
        query = """
            INSERT INTO farms (user_id, farm_name, location_details)
            VALUES (%s, %s, %s)
        """
        params = (user_id, farm_name, location_details)
        # Returns the ID of the new farm
        return self.db.execute_query(query, params, commit=True)

    def get_all_user_farms(self, user_id):
        """Retrieves all farms belonging to a specific user."""
        query = "SELECT * FROM farms WHERE user_id = %s ORDER BY farm_name"
        params = (user_id,)
        return self.db.execute_query(query, params)

    def get_farm_by_id(self, farm_id, user_id):
        """Retrieves a single farm by ID, ensuring it belongs to the user."""
        query = "SELECT * FROM farms WHERE farm_id = %s AND user_id = %s"
        params = (farm_id, user_id)
        return self.db.execute_query(query, params, fetch_one=True)

    def update_farm(self, farm_id, user_id, farm_name, location_details):
        """Updates an existing farm record."""
        query = """
            UPDATE farms SET farm_name = %s, location_details = %s
            WHERE farm_id = %s AND user_id = %s
        """
        params = (farm_name, location_details, farm_id, user_id)
        # Returns True if update was successful (DB returns no result/error)
        return self.db.execute_query(query, params, commit=True) is not None

    def delete_farm(self, farm_id, user_id):
        """Deletes a farm record and all associated trees/images (via CASCADE)."""
        query = "DELETE FROM farms WHERE farm_id = %s AND user_id = %s"
        params = (farm_id, user_id)
        return self.db.execute_query(query, params, commit=True) is not None