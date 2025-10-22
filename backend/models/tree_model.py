from backend.services.database_service import DatabaseService

class TreeModel:
    """
    Handles all database operations related to the 'trees' table.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def create_tree(self, farm_id, tree_name, age_years=None, planting_date=None):
        """Inserts a new tree record."""
        query = """
            INSERT INTO trees (farm_id, tree_name, age_years, planting_date)
            VALUES (%s, %s, %s, %s)
        """
        params = (farm_id, tree_name, age_years, planting_date)
        # Returns the ID of the new tree
        return self.db.execute_query(query, params, commit=True)

    def get_all_trees_by_farm(self, farm_id):
        """Retrieves all trees belonging to a specific farm."""
        query = "SELECT * FROM trees WHERE farm_id = %s ORDER BY tree_name"
        params = (farm_id,)
        return self.db.execute_query(query, params)

    def get_tree_by_id(self, tree_id):
        """Retrieves a single tree by ID."""
        query = "SELECT * FROM trees WHERE tree_id = %s"
        params = (tree_id,)
        return self.db.execute_query(query, params, fetch_one=True)

    def update_tree(self, tree_id, tree_name, age_years, planting_date):
        """Updates an existing tree record."""
        query = """
            UPDATE trees SET tree_name = %s, age_years = %s, planting_date = %s
            WHERE tree_id = %s
        """
        params = (tree_name, age_years, planting_date, tree_id)
        return self.db.execute_query(query, params, commit=True) is not None

    def delete_tree(self, tree_id):
        """Deletes a tree record and all associated images (via CASCADE)."""
        query = "DELETE FROM trees WHERE tree_id = %s"
        params = (tree_id,)
        return self.db.execute_query(query, params, commit=True) is not None