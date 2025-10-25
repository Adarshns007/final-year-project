# adarshns007/my-project/my-project-b969c78bfb99d884a2432d5eaa1211441070eb9e/backend/api/scan_routes.py
from flask import Blueprint, request, jsonify, current_app, url_for
from werkzeug.utils import secure_filename
from backend.api.user_routes import token_required 
from backend.models.image_model import ImageModel
from backend.models.disease_model import DiseaseModel 
from backend.ml_model.predict_service import PredictService 
import os
import uuid

# Create Blueprint
scan_bp = Blueprint('scan_bp', __name__)
image_model = ImageModel()
disease_model = DiseaseModel() 
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
    """
    if predict_service is None:
        current_app.logger.error("Image analysis failed: ML model service is unavailable.")
        return jsonify({"message": "Image analysis is temporarily disabled. ML model file is missing or failed to load."}), 503

    if 'image' not in request.files:
        return jsonify({"message": "No image file provided"}), 400

    image_file = request.files['image']
    tree_id = request.form.get('tree_id') 
    # FIX: Retrieve real-time scan coordinates from form data
    scan_latitude = request.form.get('scan_latitude')
    scan_longitude = request.form.get('scan_longitude')

    if image_file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if image_file and allowed_file(image_file.filename):
        try:
            # 1. Secure Filename and Path Setup
            original_filename = secure_filename(image_file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower()
            
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            
            image_file.seek(0) 
            image_file.save(save_path)
            
            # 2. Run ML Prediction
            image_file.seek(0) 
            analysis_result = predict_service.analyze_image(image_file) 
            
            # 3. Fetch Disease Details
            predicted_class_name = analysis_result['predicted_class']
            disease_details = disease_model.get_disease_by_name(predicted_class_name) 
            
            # 4. Save Image Record to MySQL
            relative_file_path = f"uploads/{unique_filename}" 
            
            # FIX: Pass scan coordinates to the model
            image_id = image_model.create_image(
                user_id=current_user_id, 
                file_path=relative_file_path, 
                tree_id=tree_id if tree_id else None, 
                status='analyzed',
                scan_latitude=scan_latitude if scan_latitude else None,
                scan_longitude=scan_longitude if scan_longitude else None
            )
            
            if not image_id:
                os.remove(save_path)
                return jsonify({"message": "Failed to save image metadata"}), 500

            # 5. Save Prediction Result to MySQL
            image_model.save_prediction(
                image_id=image_id,
                predicted_class=predicted_class_name,
                confidence_score=analysis_result['confidence_score'],
                raw_output=analysis_result['raw_output']
            )

            # 6. Compile and Return Response
            image_url = url_for('serve_uploaded_file', filename=unique_filename, _external=True)

            return jsonify({
                "message": "Image analyzed and saved successfully",
                "image_id": image_id,
                "file_path": image_url,
                "result": {
                    "class": predicted_class_name,
                    "confidence": analysis_result['confidence_score'],
                    "raw_data": analysis_result['raw_output'],
                    "treatment_details": {
                        "organic": disease_details['organic_treatment'] if disease_details else "N/A",
                        "chemical": disease_details['chemical_treatment'] if disease_details else "N/A"
                    }
                }
            }), 200

        except ValueError as ve:
            if os.path.exists(save_path):
                os.remove(save_path) 
            return jsonify({"message": str(ve)}), 400
        except Exception as e:
            current_app.logger.error(f"Image analysis failed: {e}")
            if os.path.exists(save_path):
                os.remove(save_path)
            return jsonify({"message": "An unexpected server error occurred during analysis"}), 500

@scan_bp.route('/gallery', methods=['GET'])
@token_required
def get_gallery(current_user_id):
    """Retrieves the list of analyzed images for the user's gallery."""
    images = image_model.get_user_gallery(current_user_id)
    
    if images is None:
        images = []
        current_app.logger.error(f"Database query failed for user {current_user_id} when fetching gallery.")

    for image in images:
        image['file_path'] = url_for('serve_uploaded_file', filename=image['file_path'].split('/')[-1], _external=True)
    
    return jsonify(images), 200