from flask import Blueprint, request, jsonify, current_app
from backend.api.user_routes import token_required # Re-use generic token check
from backend.models.admin_model import AdminModel
from functools import wraps
# Removed: import jwt (manual decoding is fragile and was causing initialization errors)
from backend.models.feedback_model import FeedbackModel
from backend.models.disease_model import DiseaseModel
from backend.models.user_model import UserModel # Needed to check user role

# Create Blueprint
admin_bp = Blueprint('admin_bp', __name__)
admin_model = None
feedback_model = FeedbackModel()
disease_model = DiseaseModel()
user_model = UserModel() # Initialize UserModel for role lookups

# --- Admin Authorization Decorator (FIXED) ---
def admin_required(f):
    """Decorator to enforce that the authenticated user has the 'admin' role."""
    @token_required # Ensure token is present and valid first
    @wraps(f)
    def decorated_admin(current_user_id, *args, **kwargs):
        # 1. Look up the user by ID using the validated ID from the token
        user = user_model.find_user_by_id(current_user_id)
        
        # 2. Check if the user exists and has the 'admin' role
        if not user or user.get('role') != 'admin':
            # Unauthorized access (User is logged in, but not an admin)
            return jsonify({'message': 'Authorization failed: Admin access required'}), 403
        
        # Pass user ID along
        kwargs['current_user_id'] = current_user_id
        return f(*args, **kwargs)
    return decorated_admin

# ==============================================================================
# --- Dashboard Metrics Routes (/api/admin/metrics) ---
# ==============================================================================

@admin_bp.route('/metrics', methods=['GET'])
@admin_required
def get_metrics_route(current_user_id):
    """Retrieves high-level statistics and disease distribution for the admin dashboard."""
    try:
        metrics = admin_model.get_system_metrics()
        distribution = admin_model.get_disease_distribution()
        
        return jsonify({
            "metrics": metrics,
            "disease_distribution": distribution
        }), 200
    except Exception as e:
        current_app.logger.error(f"Admin metrics error: {e}")
        return jsonify({"message": "Failed to retrieve administration metrics"}), 500

# ==============================================================================
# --- User Management Routes (/api/admin/users) ---
# ==============================================================================

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users_route(current_user_id):
    """Retrieves a list of all users on the platform."""
    try:
        users = admin_model.get_all_users()
        return jsonify(users), 200
    except Exception as e:
        current_app.logger.error(f"Admin users error: {e}")
        return jsonify({"message": "Failed to retrieve user list"}), 500
    
# ==============================================================================
# --- Feedback Management Routes (/api/admin/feedbacks) ---
# ==============================================================================

@admin_bp.route('/feedbacks', methods=['GET'])
@admin_required
def get_all_feedbacks_route(current_user_id):
    """Retrieves all feedback records with associated user information."""
    try:
        feedbacks = feedback_model.get_all_feedbacks()
        
        # Convert datetime objects to string format for JSON serialization
        for feedback in feedbacks:
            if feedback.get('submitted_at'):
                # Convert to string and remove timezone for simplicity in JS
                feedback['submitted_at'] = feedback['submitted_at'].isoformat().split('.')[0]
                
        return jsonify(feedbacks), 200
    except Exception as e:
        current_app.logger.error(f"Admin feedbacks error: {e}")
        return jsonify({"message": "Failed to retrieve feedback list"}), 500

@admin_bp.route('/feedbacks/<int:feedback_id>', methods=['PUT'])
@admin_required
def update_feedback_status_route(feedback_id, current_user_id):
    """Updates the status of a specific feedback item."""
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['new', 'in_review', 'resolved']:
        return jsonify({"message": "Invalid status value"}), 400
        
    if feedback_model.update_feedback_status(feedback_id, new_status):
        return jsonify({"message": f"Feedback {feedback_id} status updated to {new_status}"}), 200
    return jsonify({"message": "Failed to update feedback status"}), 500

# ==============================================================================
# --- Disease Management Routes (/api/admin/diseases) ---
# ==============================================================================

@admin_bp.route('/diseases', methods=['GET'])
@admin_required
def get_all_diseases_route(current_user_id):
    """Retrieves all disease records for the admin view."""
    try:
        diseases = disease_model.get_all_diseases()
        return jsonify(diseases), 200
    except Exception as e:
        current_app.logger.error(f"Admin diseases error: {e}")
        return jsonify({"message": "Failed to retrieve disease list"}), 500

@admin_bp.route('/diseases/<int:disease_id>', methods=['PUT'])
@admin_required
def update_disease_route(disease_id, current_user_id):
    """Updates the description and treatment for a disease."""
    data = request.get_json()
    description = data.get('description')
    organic_treatment = data.get('organic_treatment')
    chemical_treatment = data.get('chemical_treatment')
    
    # FIX CONFIRMED: Checks all three treatment fields now
    if not all([description, organic_treatment, chemical_treatment]):
        return jsonify({"message": "Description, organic treatment, and chemical treatment are required"}), 400

    # FIX CONFIRMED: Passes all three treatment fields to the model
    if disease_model.update_disease(disease_id, description, organic_treatment, chemical_treatment):
        return jsonify({"message": "Disease information updated successfully"}), 200
    return jsonify({"message": "Failed to update disease information or disease not found"}), 500
