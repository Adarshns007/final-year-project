from backend.services.database_service import DatabaseService
import json

class ImageModel:
    """
    Handles all database operations for the 'images' and 'predictions' tables.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def create_image(self, user_id, file_path, tree_id=None, status='analyzed'):
        """
        Inserts a new image record.
        Returns the new image_id on success.
        """
        query = """
            INSERT INTO images (user_id, file_path, tree_id, status)
            VALUES (%s, %s, %s, %s)
        """
        params = (user_id, file_path, tree_id, status)
        return self.db.execute_query(query, params, commit=True)

    def save_prediction(self, image_id, predicted_class, confidence_score, raw_output):
        """
        Inserts the analysis result for a given image.
        """
        # Ensure raw_output is stored as a JSON string
        raw_output_json = json.dumps(raw_output)
        
        query = """
            INSERT INTO predictions (image_id, predicted_class, confidence_score, raw_output)
            VALUES (%s, %s, %s, %s)
        """
        params = (image_id, predicted_class, confidence_score, raw_output_json)
        return self.db.execute_query(query, params, commit=True)

    def get_image_details(self, image_id, user_id):
        """
        Retrieves image and its prediction details for a specific user.
        """
        query = """
            SELECT 
                i.*, 
                p.predicted_class, 
                p.confidence_score, 
                p.raw_output, 
                t.tree_name,
                f.farm_name
            FROM images i
            LEFT JOIN predictions p ON i.image_id = p.image_id
            LEFT JOIN trees t ON i.tree_id = t.tree_id
            LEFT JOIN farms f ON t.farm_id = f.farm_id
            WHERE i.image_id = %s AND i.user_id = %s
        """
        params = (image_id, user_id)
        result = self.db.execute_query(query, params, fetch_one=True)
        
        # Parse the raw_output JSON back into a Python object
        if result and result.get('raw_output'):
            try:
                result['raw_output'] = json.loads(result['raw_output'])
            except json.JSONDecodeError:
                result['raw_output'] = {}
        
        return result

    def get_user_gallery(self, user_id):
        """
        Retrieves a list of all analyzed images for the user's gallery.
        """
        query = """
            SELECT 
                i.image_id, i.upload_date, i.file_path, i.tree_id,
                p.predicted_class, p.confidence_score,
                t.tree_name
            FROM images i
            JOIN predictions p ON i.image_id = p.image_id
            LEFT JOIN trees t ON i.tree_id = t.tree_id
            WHERE i.user_id = %s AND i.status = 'analyzed'
            ORDER BY i.upload_date DESC
        """
        params = (user_id,)
        return self.db.execute_query(query, params)

    # Note: Methods for updating status, deleting, and handling pending images 
    # would be added here to match the full Mango-Lens functionality.
    # ... (existing ImageModel code)

    def get_images_by_tree(self, tree_id):
        """
        Retrieves all analyzed images linked to a specific tree_id.
        """
        query = """
            SELECT 
                i.image_id, i.upload_date, i.file_path,
                p.predicted_class, p.confidence_score
            FROM images i
            JOIN predictions p ON i.image_id = p.image_id
            WHERE i.tree_id = %s AND i.status = 'analyzed'
            ORDER BY i.upload_date DESC
        """
        params = (tree_id,)
        return self.db.execute_query(query, params)