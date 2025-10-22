from flask import Blueprint, request, jsonify, current_app, url_for
from backend.models.farm_model import FarmModel
from backend.models.tree_model import TreeModel
from backend.models.image_model import ImageModel 
from backend.models.feedback_model import FeedbackModel
from backend.models.statistics_model import StatisticsModel
from backend.models.user_model import UserModel 
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity 

# Create Blueprint
user_bp = Blueprint('user_bp', __name__)
farm_model = FarmModel()
tree_model = TreeModel()
image_model = ImageModel()
feedback_model = FeedbackModel()
statistics_model = StatisticsModel()
user_model = UserModel()

# --- Authentication Decorator (FIXED) ---
def token_required(fn):
    """
    Decorator that protects API endpoints. 
    Uses Flask-JWT-Extended's @jwt_required to validate the token 
    and retrieves the user identity for the route function.
    """
    @wraps(fn)
    @jwt_required() 
    def wrapper(*args, **kwargs):
        # Retrieve the identity (user_id) from the validated token payload
        current_user_id = get_jwt_identity()
        
        # Pass the user ID as current_user_id keyword argument to the route function
        kwargs['current_user_id'] = current_user_id
        return fn(*args, **kwargs)
    return wrapper

# ==============================================================================
# --- Farm Routes (/api/user/farm) ---
# ==============================================================================

@user_bp.route('/farm', methods=['POST'])
@token_required
def create_farm_route(current_user_id):
    """Creates a new farm."""
    data = request.get_json()
    farm_name = data.get('farm_name')
    location_details = data.get('location_details')

    if not farm_name:
        return jsonify({"message": "Farm name is required"}), 400

    new_farm_id = farm_model.create_farm(current_user_id, farm_name, location_details)
    
    if new_farm_id:
        return jsonify({"message": "Farm created successfully", "farm_id": new_farm_id}), 201
    return jsonify({"message": "Failed to create farm"}), 500

@user_bp.route('/farm', methods=['GET'])
@token_required
def get_farms_route(current_user_id):
    """Retrieves all farms for the current user."""
    farms = farm_model.get_all_user_farms(current_user_id)
    # Ensure dates/times are serializable if they exist in the farm objects
    # This assumes farm_model returns raw objects, but it's safe to check here
    for farm in farms:
        if farm.get('created_at'):
            farm['created_at'] = farm['created_at'].isoformat()
            
    return jsonify(farms), 200

@user_bp.route('/farm/<int:farm_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def manage_farm_route(farm_id, current_user_id):
    """Manages a specific farm (Read, Update, Delete)."""
    
    farm = farm_model.get_farm_by_id(farm_id, current_user_id)
    if not farm:
        return jsonify({"message": "Farm not found or unauthorized"}), 404

    if request.method == 'GET':
        # Ensure dates/times are serializable
        if farm.get('created_at'):
            farm['created_at'] = farm['created_at'].isoformat()
        return jsonify(farm), 200

    elif request.method == 'PUT':
        data = request.get_json()
        farm_name = data.get('farm_name', farm['farm_name'])
        location_details = data.get('location_details', farm['location_details'])
        
        if farm_model.update_farm(farm_id, current_user_id, farm_name, location_details):
            return jsonify({"message": "Farm updated successfully"}), 200
        return jsonify({"message": "Update failed"}), 500

    elif request.method == 'DELETE':
        if farm_model.delete_farm(farm_id, current_user_id):
            return jsonify({"message": "Farm deleted successfully"}), 200
        return jsonify({"message": "Delete failed"}), 500

# ==============================================================================
# --- Tree Routes (/api/user/tree) ---
# ==============================================================================

@user_bp.route('/tree', methods=['POST'])
@token_required
def create_tree_route(current_user_id):
    """Creates a new tree linked to a farm."""
    data = request.get_json()
    farm_id = data.get('farm_id')
    tree_name = data.get('tree_name')
    age_years = data.get('age_years')
    planting_date = data.get('planting_date') # Expects YYYY-MM-DD format

    if not all([farm_id, tree_name]):
        return jsonify({"message": "Farm ID and tree name are required"}), 400

    if not farm_model.get_farm_by_id(farm_id, current_user_id):
        return jsonify({"message": "Farm not found or unauthorized"}), 404

    new_tree_id = tree_model.create_tree(farm_id, tree_name, age_years, planting_date)
    
    if new_tree_id:
        return jsonify({"message": "Tree created successfully", "tree_id": new_tree_id}), 201
    return jsonify({"message": "Failed to create tree"}), 500

@user_bp.route('/farm/<int:farm_id>/tree', methods=['GET'])
@token_required
def get_trees_by_farm_route(farm_id, current_user_id):
    """Retrieves all trees for a specific farm, ensuring user ownership."""
    
    if not farm_model.get_farm_by_id(farm_id, current_user_id):
        return jsonify({"message": "Farm not found or unauthorized"}), 404
        
    trees = tree_model.get_all_trees_by_farm(farm_id)
    return jsonify(trees), 200

@user_bp.route('/tree/<int:tree_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def manage_tree_route(tree_id, current_user_id):
    """Manages a specific tree (Read, Update, Delete)."""
    
    tree = tree_model.get_tree_by_id(tree_id)
    if not tree:
        return jsonify({"message": "Tree not found"}), 404
    
    # Check if the parent farm belongs to the current user
    farm = farm_model.get_farm_by_id(tree['farm_id'], current_user_id)
    if not farm:
        return jsonify({"message": "Tree not found or unauthorized access"}), 404

    if request.method == 'GET':
        # Return tree details along with parent farm info
        if tree.get('planting_date'):
            tree['planting_date'] = tree['planting_date'].isoformat()
        return jsonify({**tree, "farm_name": farm['farm_name']}), 200

    elif request.method == 'PUT':
        data = request.get_json()
        tree_name = data.get('tree_name', tree['tree_name'])
        age_years = data.get('age_years', tree['age_years'])
        planting_date = data.get('planting_date', tree['planting_date'])

        if tree_model.update_tree(tree_id, tree_name, age_years, planting_date):
            return jsonify({"message": "Tree updated successfully"}), 200
        return jsonify({"message": "Update failed"}), 500

    elif request.method == 'DELETE':
        if tree_model.delete_tree(tree_id):
            return jsonify({"message": "Tree deleted successfully"}), 200
        return jsonify({"message": "Delete failed"}), 500

# ==============================================================================
# --- Gallery/Image Detail Route (/api/user/gallery) ---
# ==============================================================================

@user_bp.route('/gallery/<int:image_id>', methods=['GET'])
@token_required
def get_image_detail_route(image_id, current_user_id):
    """Retrieves full image and prediction details for the modal view."""
    
    # Retrieves image details, prediction, tree, and farm info (joined in the model)
    detail = image_model.get_image_details(image_id, current_user_id)
    
    if not detail:
        return jsonify({"message": "Image not found or unauthorized"}), 404

    # Prepare file_path URL for the frontend
    # Example: If file_path in DB is 'uploads/unique_id.jpg'
    filename = detail['file_path'].split('/')[-1]
    detail['file_path'] = url_for('serve_uploaded_file', filename=filename, _external=True)
    
    # Ensure date is serializable
    if detail.get('upload_date'):
        detail['upload_date'] = detail['upload_date'].isoformat()

    return jsonify(detail), 200

# --- Tree Image History Route (Needed for Tree Detail Page) ---

@user_bp.route('/tree/<int:tree_id>/images', methods=['GET'])
@token_required
def get_tree_images_route(tree_id, current_user_id):
    """Retrieves all image records (scans) associated with a specific tree."""
    
    # 1. Security Check: Verify the tree exists and belongs to the user
    tree = tree_model.get_tree_by_id(tree_id)
    if not tree:
        return jsonify({"message": "Tree not found"}), 404
    
    farm = farm_model.get_farm_by_id(tree['farm_id'], current_user_id)
    if not farm:
        # If the tree exists but the user doesn't own the parent farm, unauthorized
        return jsonify({"message": "Unauthorized access to tree data"}), 403 

    # 2. Fetch Images
    images = image_model.get_images_by_tree(tree_id)

    # 3. Format URLs and Dates
    for image in images:
        filename = image['file_path'].split('/')[-1]
        image['file_path'] = url_for('serve_uploaded_file', filename=filename, _external=True)
        # Convert date object to string if needed
        if image.get('upload_date'):
            image['upload_date'] = image['upload_date'].isoformat()

    return jsonify(images), 200

# ==============================================================================
# --- User Profile and Settings Routes (/api/user) ---
# ==============================================================================

@user_bp.route('/profile', methods=['GET'])
@token_required
def get_user_profile_route(current_user_id):
    """Retrieves current user's profile information for the settings page."""
    user_profile = user_model.get_user_profile(current_user_id)
    if user_profile:
        # Remove sensitive data like password_hash before returning
        user_profile.pop('password_hash', None) 
        if user_profile.get('created_at'):
            user_profile['created_at'] = user_profile['created_at'].isoformat()
        return jsonify(user_profile), 200
    return jsonify({"message": "User profile not found"}), 404

@user_bp.route('/', methods=['PUT'])
@token_required
def update_user_profile_route(current_user_id):
    """Updates user profile details (currently username only)."""
    data = request.get_json()
    username = data.get('username')
    
    if username:
        if user_model.update_user_profile(current_user_id, username):
            return jsonify({"message": "Profile updated successfully"}), 200
        return jsonify({"message": "Failed to update profile or no changes detected"}), 400
    
    # Email change requires complex verification flow, skipped for this minimal PUT
    return jsonify({"message": "Invalid fields provided for update"}), 400

@user_bp.route('/password', methods=['PUT'])
@token_required
def update_user_password_route(current_user_id):
    """Updates user's password after verifying the current password."""
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not all([current_password, new_password]) or len(new_password) < 6:
        return jsonify({"message": "Invalid password data provided"}), 400
        
    user = user_model.find_user_by_id(current_user_id)
    
    if user and user_model.verify_password(user['password_hash'], current_password):
        if user_model.update_user_password(current_user_id, new_password):
            return jsonify({"message": "Password updated successfully. Please log in again."}), 200
        return jsonify({"message": "Failed to update password due to server error"}), 500
    
    return jsonify({"message": "Invalid current password"}), 401

# ==============================================================================
# --- Feedback Routes (/api/user/feedback) ---
# ==============================================================================

@user_bp.route('/feedback', methods=['POST'])
@token_required
def create_feedback_route(current_user_id):
    """Allows an authenticated user to submit new feedback."""
    data = request.get_json()
    subject = data.get('subject')
    message = data.get('message')
    rating = data.get('rating')

    if not all([subject, message]):
        return jsonify({"message": "Subject and message are required"}), 400

    feedback_id = feedback_model.create_feedback(current_user_id, subject, message, rating)
    
    if feedback_id:
        return jsonify({"message": "Feedback submitted successfully", "feedback_id": feedback_id}), 201
    return jsonify({"message": "Failed to submit feedback"}), 500

# ==============================================================================
# --- Statistics Routes (/api/user/statistics) ---
# ==============================================================================

@user_bp.route('/statistics', methods=['GET'])
@token_required
def get_user_statistics_route(current_user_id):
    """Retrieves user-specific statistics, filterable by date range."""
    
    # Get optional date range filters from query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    try:
        total_scans = statistics_model.get_user_total_scans(current_user_id, start_date, end_date)
        
        if total_scans == 0:
            # Return empty data if no scans match the filter
            return jsonify({
                "message": "No scans found for the selected period.",
                "total_scans": 0,
                "disease_distribution": {},
                "tree_scan_counts": []
            }), 200

        disease_distribution = statistics_model.get_user_disease_distribution(current_user_id, start_date, end_date)
        tree_scan_counts = statistics_model.get_user_scans_by_tree(current_user_id, start_date, end_date)
        
        return jsonify({
            "total_scans": total_scans,
            "disease_distribution": disease_distribution,
            "tree_scan_counts": tree_scan_counts
        }), 200

    except Exception as e:
        current_app.logger.error(f"User statistics error: {e}")
        return jsonify({"message": "Failed to retrieve user statistics"}), 500