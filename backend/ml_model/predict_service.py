import numpy as np
from PIL import Image
from io import BytesIO
from flask import current_app
from .model_loader import ModelLoader

class PredictService:
    """
    Handles all pre-processing, prediction execution, and post-processing 
    for the mango leaf disease classification model.
    """
    
    def __init__(self):
        # Retrieve configuration constants
        self.classes = current_app.config['DISEASE_CLASSES']
        self.image_size = current_app.config['IMAGE_SIZE']
        self.color_mode = current_app.config['COLOR_MODE']
        self.model = ModelLoader.get_model()

    def _preprocess_image(self, image_file_storage):
        """
        Loads the image from FileStorage, resizes it, and converts it to a 
        model-ready numpy array.
        """
        try:
            # Use BytesIO to handle the file content in memory
            image_data = image_file_storage.read()
            img = Image.open(BytesIO(image_data))
            
            # Convert to required color mode and resize
            img = img.convert('RGB')
            img = img.resize(self.image_size)
            
            img_array = np.asarray(img, dtype=np.float32)
            
            # Normalize pixel values (0-255 to 0.0-1.0)
            img_array = img_array / 255.0
            
            # Expand dimensions to create a batch size of 1
            # Expected shape: (1, height, width, channels)
            return np.expand_dims(img_array, axis=0)

        except Exception as e:
            current_app.logger.error(f"Image preprocessing failed: {e}")
            raise ValueError("Invalid image file or format.")


    def analyze_image(self, image_file_storage):
        """
        Runs the full prediction pipeline: preprocess, predict, post-process.
        Returns a dictionary with the prediction result.
        """
        # 1. Preprocess
        model_input = self._preprocess_image(image_file_storage)

        # 2. Predict
        predictions = self.model.predict(model_input)[0] # Get the first (and only) prediction

        # 3. Post-process
        
        # Get the index of the highest probability
        max_confidence_index = np.argmax(predictions)
        
        # Get the predicted class name and its confidence score
        predicted_class = self.classes[max_confidence_index]
        confidence_score = float(predictions[max_confidence_index]) # Convert numpy float to native float
        
        # Format raw probabilities for the database
        raw_output = {}
        for i, prob in enumerate(predictions):
            raw_output[self.classes[i]] = float(prob)

        # Return the structured result
        return {
            "predicted_class": predicted_class,
            "confidence_score": confidence_score,
            "raw_output": raw_output
        }