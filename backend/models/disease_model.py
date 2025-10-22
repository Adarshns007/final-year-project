from backend.services.database_service import DatabaseService

class DiseaseModel:
    """
    Handles all database operations for the 'diseases' table.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def get_all_diseases(self):
        """Retrieves all disease records."""
        # FIX: Explicitly select all columns
        query = "SELECT disease_id, name, description, organic_treatment, chemical_treatment, is_trained FROM diseases ORDER BY name"
        return self.db.execute_query(query)

    def get_disease_by_name(self, name):
        """Retrieves a single disease record by name."""
        # FIX: Explicitly select all columns
        query = "SELECT disease_id, name, description, organic_treatment, chemical_treatment, is_trained FROM diseases WHERE name = %s"
        params = (name,)
        return self.db.execute_query(query, params, fetch_one=True)
        
    def update_disease(self, disease_id, description, organic_treatment, chemical_treatment): # <-- UPDATED SIGNATURE
        """Updates the description, organic, and chemical treatments for a disease."""
        disease_id = int(disease_id) # FIX: Ensure integer type for DB
        query = """
            UPDATE diseases 
            SET description = %s, organic_treatment = %s, chemical_treatment = %s 
            WHERE disease_id = %s
        """
        params = (description, organic_treatment, chemical_treatment, disease_id) # <-- UPDATED PARAMS
        return self.db.execute_query(query, params, commit=True) is not None