from flask import Blueprint, request, jsonify, current_app, url_for
from werkzeug.security import check_password_hash 
from backend.models.user_model import UserModel
from backend.services.database_service import DatabaseService 

from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta # For token expiration

# Create a Flask Blueprint for authentication routes
auth_bp = Blueprint('auth_bp', __name__)
user_model = UserModel()

# --- API Routes ---

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Handles new user registration."""
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([username, email, password]):
        return jsonify({"message": "Missing required fields"}), 400

    if user_model.find_user_by_email(email):
        return jsonify({"message": "User with this email already exists"}), 409

    # Setting verified=True for simplicity
    user_id = user_model.create_user(username, email, password, is_verified=True)

    if user_id:
        return jsonify({"message": "User created successfully. Please log in."}), 201
    else:
        return jsonify({"message": "Database error during signup"}), 500


@auth_bp.route('/signin', methods=['POST'])
def signin():
    """Handles user login and token generation."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({"message": "Missing email or password"}), 400

    user = user_model.find_user_by_email(email)

    if user and user_model.verify_password(user['password_hash'], password):
        
        # FIX: Define custom claims to include role and username in the token payload
        additional_claims = {
            "role": user['role'],
            "username": user['username']
        }
        
        # FIX: Pass the claims when creating the access token
        access_token = create_access_token(
            identity=str(user['user_id']), 
            additional_claims=additional_claims
        )
        
        # 2. Return the token and user data.
        return jsonify({
            "message": "Login successful",
            "token": access_token, 
            "user": {
                "id": user['user_id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role']
            }
        }), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Handles user logout (client-side token removal)."""
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """FIX: Initiates password reset by logging a mock reset CODE and generating a link."""
    email = request.get_json().get('email')
    if not email:
        return jsonify({"message": "Email is required"}), 400
    
    user = user_model.find_user_by_email(email)
    
    if user:
        # FIX: Generate a short, mock reset code. 
        MOCK_RESET_CODE = "123456" 
        
        # FIX: Construct a standard reset link URL using the code
        reset_url = url_for('reset_password_page', code=MOCK_RESET_CODE, _external=True)

        # MOCK: Log token to console instead of emailing it
        current_app.logger.warning(f"PASSWORD RESET MOCK: For user {email}, use this direct link: {reset_url}")
        
        return jsonify({
            "message": "If the email is registered, a password reset link has been sent (check server console for the unique link).",
            "reset_url": reset_url 
        }), 200
        
    # Always return a generic success message for security, even if the user isn't found
    return jsonify({"message": "If the email is registered, a password reset link has been sent."}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """FIX: Resets the password using a valid reset CODE and new password."""
    data = request.get_json()
    reset_code = data.get('code')
    new_password = data.get('new_password')
    email = data.get('email') # Need email to identify the user for the mock check
    
    if not all([reset_code, new_password, email]) or len(new_password) < 6:
        return jsonify({"message": "Email, reset code, and a new password (min 6 characters) are required."}), 400

    user = user_model.find_user_by_email(email)

    # MOCK Logic: In a real app, this code is checked against the database/cache for the user.
    if user and reset_code == "123456": 
        
        # Update the password using the user_id derived from the email lookup
        if user_model.update_user_password(user['user_id'], new_password):
            return jsonify({"message": "Password successfully reset. You may now log in."}), 200
        
        return jsonify({"message": "Failed to update password."}), 500

    return jsonify({"message": "Invalid email or reset code."}), 401