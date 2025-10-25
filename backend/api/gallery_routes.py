from flask import Blueprint, request, jsonify, current_app, url_for
from backend.api.user_routes import token_required # Re-use the JWT decorator
from backend.models.image_model import ImageModel

# Create Blueprint
gallery_bp = Blueprint('gallery_bp', __name__)
image_model = ImageModel()

# ==============================================================================
# --- Gallery/Image Routes (/api/gallery) ---
# ==============================================================================

@gallery_bp.route('/', methods=['GET'])
@token_required
def get_gallery_route(current_user_id):
    """
    Retrieves the list of analyzed images for the user's gallery overview.
    Matches the functionality of the original project's gallery page.
    """
    try:
        images = image_model.get_user_gallery(current_user_id)
        
        # Format the image URLs for the frontend
        for image in images:
            # Assuming file_path in DB is 'uploads/unique_id.jpg', extract the filename
            filename = image['file_path'].split('/')[-1]
            # Use Flask's url_for to generate the full public URL for the image
            image['file_path'] = url_for('serve_uploaded_file', filename=filename, _external=True)
            # Convert date object to string if needed (MySQL returns datetime object)
            image['upload_date'] = image['upload_date'].isoformat() if image.get('upload_date') else None

        return jsonify(images), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching gallery: {e}")
        return jsonify({"message": "Failed to retrieve gallery data"}), 500


@gallery_bp.route('/<int:image_id>', methods=['GET'])
@token_required
def get_image_detail_route(image_id, current_user_id):
    """
    Retrieves full image, prediction, tree, and farm details for the modal view.
    """
    try:
        # Retrieves image details, prediction, tree, and farm info (joined in the model)
        detail = image_model.get_image_details(image_id, current_user_id)
        
        if not detail:
            return jsonify({"message": "Image not found or unauthorized"}), 404

        # Prepare file_path URL for the frontend
        filename = detail['file_path'].split('/')[-1]
        detail['file_path'] = url_for('serve_uploaded_file', filename=filename, _external=True)
        detail['upload_date'] = detail['upload_date'].isoformat() if detail.get('upload_date') else None

        return jsonify(detail), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching image detail {image_id}: {e}")
        return jsonify({"message": "Failed to retrieve image details"}), 500