import mysql.connector
from flask import current_app, g
from mysql.connector import Error

class DatabaseService:
    """
    Manages the MySQL database connection using a simple connection per request 
    pattern (non-pooled) for maximum stability.
    """
    
    @staticmethod
    def get_db_connection():
        """Establishes a new database connection or returns the existing one, checking validity first."""
        # Check if 'db' exists in the application context global object 'g'
        db = g.get('db', None)
        
        # Check if connection needs to be established/re-established
        if db is None or not db.is_connected():
            app = current_app
            try:
                # Close the old connection explicitly if it exists but isn't connected
                if db is not None:
                    try:
                        db.close()
                    except:
                        pass
                        
                # Establish a new connection
                db = mysql.connector.connect(
                    host=app.config['MYSQL_HOST'],
                    user=app.config['MYSQL_USER'],
                    password=app.config['MYSQL_PASSWORD'],
                    database=app.config['MYSQL_DB'],
                )
                g.db = db # Store the new connection in g
                app.logger.info("New MySQL connection established.")
                
            except Error as e:
                app.logger.critical(f"FATAL: Error connecting to MySQL Database: {e}")
                # CRITICAL: In DEBUG mode, raise the error to get a traceback
                if app.config.get('DEBUG'):
                    raise RuntimeError(f"Failed to connect to DB: {e}")
                g.db = None
                return None
                
        return db

    @staticmethod
    def close_db_connection(e=None):
        """Closes the connection when the application context tears down."""
        db = g.pop('db', None)
        if db is not None and db.is_connected():
            try:
                db.close()
            except Error as close_e:
                 current_app.logger.error(f"Error closing MySQL connection: {close_e}")


    @staticmethod
    def execute_query(query, params=None, fetch_one=False, commit=False):
        """Executes a SQL query and returns results if applicable."""
        conn = DatabaseService.get_db_connection()
        if not conn:
            current_app.logger.error("Database connection is not available for query execution.")
            return None

        cursor = None
        app = current_app 
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            
            if commit:
                conn.commit()
                return cursor.lastrowid
            
            if fetch_one:
                return cursor.fetchone()
            else:
                return cursor.fetchall()
        
        except Error as e:
            # CRITICAL LOGGING: Log the exact MySQL error and the query that failed
            app.logger.error(f"MySQL Query Error: {e} | Query: {query} | Params: {params}")
            
            # CRITICAL FIX: Re-raise the error immediately in DEBUG mode to trigger Flask's error reporting.
            if app.config.get('DEBUG'):
                 raise e 
            
            if commit and conn and conn.is_connected():
                conn.rollback()
            return None
        
        except Exception as e:
            # Catch any other unexpected Python exceptions during query execution
            app.logger.critical(f"Unexpected Python Error during DB query: {e} | Query: {query} | Params: {params}")
            if app.config.get('DEBUG'):
                raise e
            return None
        
        finally:
            if cursor is not None:
                cursor.close()