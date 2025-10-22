-- LeafGuard MySQL Database Schema

-- 1. Create the database (Only run once)
-- CREATE DATABASE IF NOT EXISTS leafguard_db;
-- USE leafguard_db;

-- 2. Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);

-- 3. Farms Table (User can have multiple farms)
CREATE TABLE farms (
    farm_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    farm_name VARCHAR(100) NOT NULL,
    location_details VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. Trees Table (Farm can have multiple trees)
CREATE TABLE trees (
    tree_id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    tree_name VARCHAR(100) NOT NULL,
    age_years INT,
    planting_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE
);

-- 5. Image Analysis/Gallery Table
CREATE TABLE images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tree_id INT, -- NULL if a quick scan (not saved to a tree)
    file_path VARCHAR(255) NOT NULL, -- Path to the stored image file
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'analyzed', 'archived') DEFAULT 'analyzed',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (tree_id) REFERENCES trees(tree_id) ON DELETE SET NULL
);

-- 6. Prediction Results Table (stores the ML analysis data)
CREATE TABLE predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    image_id INT NOT NULL,
    predicted_class VARCHAR(50) NOT NULL, -- The final predicted disease (e.g., 'Anthracnose')
    confidence_score DECIMAL(5, 4) NOT NULL,
    raw_output TEXT, -- Store JSON/string of the raw model output for all classes
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE CASCADE
);

-- LeafGuard MySQL Database Schema
-- ... (existing tables: users, farms, trees, images, predictions)

-- 7. Feedbacks Table
CREATE TABLE feedbacks (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('new', 'in_review', 'resolved') DEFAULT 'new',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- LeafGuard MySQL Database Schema
-- ... (existing tables: users, farms, trees, images, predictions, feedbacks)

-- 8. Diseases Table (Stores information about the diseases the model can detect)
CREATE TABLE diseases (
    disease_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    organic_treatment TEXT,     -- <--- NEW COLUMN
    chemical_treatment TEXT,    -- <--- NEW COLUMN
    is_trained BOOLEAN DEFAULT TRUE
);

-- 9. Archived Images Table (For trash/archiving functionality)
CREATE TABLE archived_images (
    archive_id INT AUTO_INCREMENT PRIMARY KEY,
    image_id INT NOT NULL,
    user_id INT NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Store the file path, or link back to the images table (linking is cleaner)
    FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Initial Data Load for Diseases (Based on your trained classes)
INSERT INTO diseases (name, description, organic_treatment, chemical_treatment) VALUES
('Anthracnose', 'Fungal disease causing black, sunken spots.', 
    'Prune and destroy infected material. Apply neem oil or copper soap early.', 
    'Apply copper-based fungicide or Azoxystrobin.'),

('Bacterial Canker', 'Causes necrotic spots on leaves and fruit.', 
    'Prune infected branches and destroy them. Apply Copper Hydroxide.', 
    'Apply Streptomycin antibiotics or copper compounds.'),

('Cutting Weevil', 'Pest that cuts mango shoots causing dieback.',
    'Hand-pick and destroy adult weevils and infested twigs.', 
    'Use systemic insecticides (e.g., Lambda-cyhalothrin).'),

('die back', 'General term for progressive death of twigs and branches.',
    'Prune dead wood. Apply a Bordeaux paste to cut ends.',
    'Apply Mancozeb or a broad-spectrum fungicide after pruning.'),

('Gall Midge', 'Insects that cause abnormal swellings on leaves.', 
    'Destroy infested leaves/shoots. Encourage natural predators.',
    'Use systemic insecticides (e.g., Dimethoate) during flush period.'),

('Healthy', 'No significant disease detected.',
    'Maintain regular watering, nutrient balance, and air circulation.', 
    'Routine maintenance only.'),

('Powdery Mildew', 'White powdery growth on leaves, flowers, and fruit.', 
    'Apply horticultural oil or a baking soda solution (potassium bicarbonate).', 
    'Apply sulfur fungicides or Triadimefon.'),

('Sooty Mould', 'Black coating on leaves resulting from honeydew excretion by pests.', 
    'Control underlying pests (e.g., scale insects) using neem oil or insecticidal soap.', 
    'Apply Malathion to control pests, then wash the leaves.');