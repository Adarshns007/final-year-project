# adarshns007/my-project/my-project-b969c78bfb99d884a2432d5eaa1211441070eb9e/backend/models/farm_model.py
from backend.services.database_service import DatabaseService
import logging 
import sys

class FarmModel:
    """
    Handles all database operations related to the 'farms' table.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def create_farm(self, user_id, farm_name, location_details=None, latitude=None, longitude=None):
        """Inserts a new farm record with optional coordinates."""
        query = """
            INSERT INTO farms (user_id, farm_name, location_details, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s)
        """
        params = (user_id, farm_name, location_details, latitude, longitude)
        return self.db.execute_query(query, params, commit=True)

    def get_all_user_farms(self, user_id):
        """Retrieves all farms belonging to a specific user, including coordinates."""
        sys.stderr.write(f"!!! DEBUG FARM MODEL: Querying farms for User ID: {user_id} (Type: {type(user_id)}) !!!\n")
        
        query = "SELECT farm_id, user_id, farm_name, location_details, created_at, latitude, longitude FROM farms WHERE user_id = %s ORDER BY farm_name"
        params = (user_id,)
        return self.db.execute_query(query, params)

    def get_farm_by_id(self, farm_id, user_id):
        """Retrieves a single farm by ID, ensuring it belongs to the user, including coordinates."""
        query = "SELECT farm_id, user_id, farm_name, location_details, created_at, latitude, longitude FROM farms WHERE farm_id = %s AND user_id = %s"
        params = (farm_id, user_id)
        return self.db.execute_query(query, params, fetch_one=True)

    def update_farm(self, farm_id, user_id, farm_name, location_details, latitude=None, longitude=None):
        """Updates an existing farm record, including coordinates."""
        query = """
            UPDATE farms SET farm_name = %s, location_details = %s, latitude = %s, longitude = %s
            WHERE farm_id = %s AND user_id = %s
        """
        params = (farm_name, location_details, latitude, longitude, farm_id, user_id)
        return self.db.execute_query(query, params, commit=True) is not None

    def delete_farm(self, farm_id, user_id):
        """Deletes a farm record and all associated trees/images (via CASCADE)."""
        query = "DELETE FROM farms WHERE farm_id = %s AND user_id = %s"
        params = (farm_id, user_id)
        return self.db.execute_query(query, params, commit=True) is not None