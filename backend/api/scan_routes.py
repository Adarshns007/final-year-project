import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from backend.api.user_routes import token_required # Re-use the JWT decorator
from backend.models.image_model import ImageModel
from backend.ml_model.predict_service import PredictService

# Create Blueprint
scan_bp = Blueprint('scan_bp', __name__)
image_model = ImageModel()
predict_service = None

def allowed_file(filename):
    """Checks if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@scan_bp.route('/upload-and-analyze', methods=['POST'])
@token_required
def upload_and_analyze(current_user_id):
    """
    Handles image upload, runs the ML model, and saves the result to the database.
    Can be a 'quick scan' (no tree_id) or a scan linked to a specific tree.
    """
    # Check if a file part is present in the request
    if 'image' not in request.files:
        return jsonify({"message": "No image file provided"}), 400

    image_file = request.files['image']
    tree_id = request.form.get('tree_id') # Optional: ID of the tree this scan belongs to

    if image_file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if image_file and allowed_file(image_file.filename):
        try:
            # 1. Secure Filename and Path Setup
            original_filename = secure_filename(image_file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower()
            
            # Generate a unique filename to prevent clashes
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            
            # Temporary save needed for ML processing and permanent storage
            image_file.seek(0) # Rewind the file stream before saving
            image_file.save(save_path)
            
            # 2. Run ML Prediction
            image_file.seek(0) # Rewind again before passing to the prediction service
            analysis_result = predict_service.analyze_image(image_file)
            
            # 3. Save Image Record to MySQL
            # File path relative to the Flask server's root
            relative_file_path = f"uploads/{unique_filename}" 
            
            image_id = image_model.create_image(
                user_id=current_user_id, 
                file_path=relative_file_path, 
                tree_id=tree_id if tree_id else None, 
                status='analyzed'
            )
            
            if not image_id:
                # If DB fails, clean up the file and abort
                os.remove(save_path)
                return jsonify({"message": "Failed to save image metadata"}), 500

            # 4. Save Prediction Result to MySQL
            image_model.save_prediction(
                image_id=image_id,
                predicted_class=analysis_result['predicted_class'],
                confidence_score=analysis_result['confidence_score'],
                raw_output=analysis_result['raw_output']
            )

            # 5. Compile and Return Response
            # Construct the full URL for the image for the frontend
            image_url = url_for('serve_uploaded_file', filename=unique_filename, _external=True)

            return jsonify({
                "message": "Image analyzed and saved successfully",
                "image_id": image_id,
                "file_path": image_url,
                "result": {
                    "class": analysis_result['predicted_class'],
                    "confidence": analysis_result['confidence_score'],
                    "raw_data": analysis_result['raw_output']
                }
            }), 200

        except ValueError as ve:
            # This catches the pre-processing error from PredictService
            return jsonify({"message": str(ve)}), 400
        except Exception as e:
            current_app.logger.error(f"Image analysis failed: {e}")
            # Ensure the saved file is cleaned up if a downstream error occurs
            if os.path.exists(save_path):
                os.remove(save_path)
            return jsonify({"message": "An unexpected server error occurred during analysis"}), 500

@scan_bp.route('/gallery', methods=['GET'])
@token_required
def get_gallery(current_user_id):
    """Retrieves the list of analyzed images for the user's gallery."""
    images = image_model.get_user_gallery(current_user_id)
    
    # Prepend the URL path for the file_path fields for the frontend
    for image in images:
        # Assuming file_path is stored as 'uploads/unique_id.jpg'
        image['file_path'] = url_for('serve_uploaded_file', filename=image['file_path'].split('/')[-1], _external=True)
    
    return jsonify(images), 200