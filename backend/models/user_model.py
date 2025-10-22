from backend.services.database_service import DatabaseService
from werkzeug.security import generate_password_hash, check_password_hash

class UserModel:
    """
    Handles all database operations related to the 'users' table.
    """
    
    def __init__(self):
        self.db = DatabaseService()

    def create_user(self, username, email, password, role='user', is_verified=False):
        """
        Inserts a new user into the database.
        Returns the new user_id on success, or None on failure.
        """
        # Hash the password before storing it
        password_hash = generate_password_hash(password)
        
        query = """
            INSERT INTO users (username, email, password_hash, role, is_verified)
            VALUES (%s, %s, %s, %s, %s)
        """
        params = (username, email, password_hash, role, is_verified)
        
        # execute_query returns lastrowid on successful INSERT (commit=True)
        user_id = self.db.execute_query(query, params, commit=True)
        return user_id

    def find_user_by_email(self, email):
        """
        Retrieves a user record by email.
        """
        query = "SELECT * FROM users WHERE email = %s"
        params = (email,)
        return self.db.execute_query(query, params, fetch_one=True)

    def find_user_by_id(self, user_id):
        """
        Retrieves a user record by user_id.
        """
        query = "SELECT * FROM users WHERE user_id = %s"
        params = (user_id,)
        return self.db.execute_query(query, params, fetch_one=True)

    def verify_password(self, stored_hash, password):
        """
        Compares a plain text password with the stored hash.
        """
        return check_password_hash(stored_hash, password)

    def update_verification_status(self, user_id, status=True):
        """
        Updates the is_verified status for a user.
        """
        query = "UPDATE users SET is_verified = %s WHERE user_id = %s"
        params = (status, user_id)
        # Execute query without expecting results, but checking for success via None/Error
        return self.db.execute_query(query, params, commit=True) is not None

# Add other CRUD methods here as needed for user management (e.g., update_password, delete_user)
    def update_user_profile(self, user_id, username):
        """
        Updates a user's username.
        """
        query = "UPDATE users SET username = %s WHERE user_id = %s"
        params = (username, user_id)
        return self.db.execute_query(query, params, commit=True) is not None

    def update_user_password(self, user_id, new_password):
        """
        Updates a user's password using the new password hash.
        """
        new_password_hash = generate_password_hash(new_password)
        query = "UPDATE users SET password_hash = %s WHERE user_id = %s"
        params = (new_password_hash, user_id)
        return self.db.execute_query(query, params, commit=True) is not None

    def get_user_profile(self, user_id):
        """
        Retrieves user details needed for the settings page.
        """
        query = "SELECT user_id, username, email, role, is_verified FROM users WHERE user_id = %s"
        params = (user_id,)
        return self.db.execute_query(query, params, fetch_one=True)