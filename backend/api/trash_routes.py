from flask import Blueprint, request, jsonify, current_app, url_for
from backend.api.user_routes import token_required 
from backend.models.trash_model import TrashModel

trash_bp = Blueprint('trash_bp', __name__)
trash_model = TrashModel()

# ==============================================================================
# --- Trash Management Routes (/api/trash) ---
# ==============================================================================

@trash_bp.route('/', methods=['GET'])
@token_required
def get_trash_route(current_user_id):
    """Retrieves all archived images for the current user (the trash bin content)."""
    try:
        archived_images = trash_model.get_user_archived_images(current_user_id)
        
        for image in archived_images:
            # Format file path and dates for the frontend
            filename = image['file_path'].split('/')[-1]
            image['file_path'] = url_for('serve_uploaded_file', filename=filename, _external=True)
            image['archived_at'] = image['archived_at'].isoformat()
            
        return jsonify(archived_images), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching trash: {e}")
        return jsonify({"message": "Failed to retrieve trash content"}), 500

@trash_bp.route('/archive/<int:image_id>', methods=['POST'])
@token_required
def archive_image_route(image_id, current_user_id):
    """Archives an image (moves it to the trash bin)."""
    try:
        archive_id = trash_model.archive_image(image_id, current_user_id)
        if archive_id:
            return jsonify({"message": "Image archived successfully"}), 200
        return jsonify({"message": "Failed to archive image (already archived or unauthorized)"}), 400
    except Exception as e:
        current_app.logger.error(f"Error archiving image {image_id}: {e}")
        return jsonify({"message": "Server error during archiving"}), 500

@trash_bp.route('/restore/<int:image_id>', methods=['POST'])
@token_required
def restore_image_route(image_id, current_user_id):
    """Restores an image from the trash bin."""
    try:
        if trash_model.restore_image(image_id, current_user_id):
            return jsonify({"message": "Image restored successfully"}), 200
        return jsonify({"message": "Failed to restore image (not found in trash or unauthorized)"}), 400
    except Exception as e:
        current_app.logger.error(f"Error restoring image {image_id}: {e}")
        return jsonify({"message": "Server error during restoration"}), 500

# Note: Permanent delete route would also be added here.