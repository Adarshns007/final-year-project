import mysql.connector
from flask import current_app, g
from mysql.connector import Error

class DatabaseService:
    """
    Manages the MySQL database connection pool and query execution
    for the Flask application.
    """
    
    @staticmethod
    def get_db_connection():
        """Establishes a new database connection or returns the existing one."""
        if 'db' not in g:
            app = current_app
            try:
                g.db = mysql.connector.connect(
                    host=app.config['MYSQL_HOST'],
                    user=app.config['MYSQL_USER'],
                    password=app.config['MYSQL_PASSWORD'],
                    database=app.config['MYSQL_DB'],
                    # Set connection pool options if needed for production
                )
            except Error as e:
                app.logger.error(f"Error connecting to MySQL Database: {e}")
                # In a real app, you might want to raise an exception or handle this gracefully
                return None
        return g.db

    @staticmethod
    def close_db_connection(e=None):
        """Closes the connection when the application context tears down."""
        db = g.pop('db', None)
        if db is not None and db.is_connected():
            db.close()

    @staticmethod
    def execute_query(query, params=None, fetch_one=False, commit=False):
        """Executes a SQL query and returns results if applicable."""
        conn = DatabaseService.get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor(dictionary=True) # Return results as dictionaries
        try:
            cursor.execute(query, params)
            
            if commit:
                conn.commit()
                return cursor.lastrowid # Return the ID of the last inserted row
            
            if fetch_one:
                return cursor.fetchone()
            else:
                return cursor.fetchall()
        
        except Error as e:
            current_app.logger.error(f"MySQL Query Error: {e} | Query: {query}")
            # Rollback if an error occurs during a committing transaction
            if commit and conn.is_connected():
                conn.rollback()
            return None
        finally:
            cursor.close()

# Register the close function to be called after each request
# Import needed here to reference the application context

# This is typically done in app.py after creating the app instance:
# app.teardown_appcontext(DatabaseService.close_db_connection)
# (For now, assume this is handled in app.py's create_app or during application setup)