from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import check_password_hash 
from backend.models.user_model import UserModel
from backend.services.database_service import DatabaseService 

from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

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
        # 1. Login successful. Generate a token using Flask-JWT-Extended.
        # FIX: Explicitly cast user_id to string for JWT identity serialization.
        access_token = create_access_token(identity=str(user['user_id']))
        
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
    """Placeholder for initiating password reset process."""
    email = request.get_json().get('email')
    if not email:
        return jsonify({"message": "Email is required"}), 400
    
    return jsonify({"message": "If the email is registered, a password reset link has been sent."}), 200