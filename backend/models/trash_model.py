from backend.services.database_service import DatabaseService

class TrashModel:
    """
    Handles archiving (soft-delete) and recovery of images.
    Uses the 'archived_images' table and updates the 'images' status.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def archive_image(self, image_id, user_id):
        """
        Moves an image to the archive. Updates status in 'images' 
        and inserts a record in 'archived_images'.
        """
        user_id = int(user_id) # FIX: Ensure user_id is an integer
        # 1. Update status in images table (optional, but good practice)
        update_image_query = "UPDATE images SET status = 'archived' WHERE image_id = %s AND user_id = %s"
        self.db.execute_query(update_image_query, (image_id, user_id), commit=True)
        
        # 2. Insert into archive table
        archive_query = "INSERT INTO archived_images (image_id, user_id) VALUES (%s, %s)"
        return self.db.execute_query(archive_query, (image_id, user_id), commit=True)
        
    def restore_image(self, image_id, user_id):
        """
        Restores an image from the archive. Deletes record in 'archived_images'
        and updates status in 'images' back to 'analyzed'.
        """
        user_id = int(user_id) # FIX: Ensure user_id is an integer
        # 1. Delete from archive table
        delete_archive_query = "DELETE FROM archived_images WHERE image_id = %s AND user_id = %s"
        self.db.execute_query(delete_archive_query, (image_id, user_id), commit=True)
        
        # 2. Update status in images table
        restore_image_query = "UPDATE images SET status = 'analyzed' WHERE image_id = %s AND user_id = %s"
        return self.db.execute_query(restore_image_query, (image_id, user_id), commit=True) is not None

    def get_user_archived_images(self, user_id):
        """
        Retrieves all archived images for a user, including prediction data.
        """
        user_id = int(user_id) # FIX: Ensure user_id is an integer
        query = """
            SELECT 
                i.image_id, i.upload_date, i.file_path,
                p.predicted_class, a.archived_at
            FROM archived_images a
            JOIN images i ON a.image_id = i.image_id
            JOIN predictions p ON i.image_id = p.image_id
            WHERE a.user_id = %s
            ORDER BY a.archived_at DESC
        """
        return self.db.execute_query(query, (user_id,))