# LeafGuard: Mango Leaf Disease Classification

LeafGuard is an AI-powered application designed to assist mango farmers by providing instant diagnosis of common mango leaf diseases using a Convolutional Neural Network (CNN) model.

The project is built using a modern Python/Flask backend and a traditional HTML/CSS/JavaScript frontend, utilizing a MySQL database for persistent storage.

## 🚀 Technology Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (JS), Jinja2 Templating
* **Backend API:** Python 3 (Flask)
* **Database:** MySQL
* **Machine Learning:** TensorFlow/Keras (`.h5` model file)

## ⚙️ Setup and Installation

### Prerequisites

1.  Python (3.9 - 3.11 recommended for TensorFlow compatibility)
2.  MySQL Server
3.  Git

### Steps

1.  **Clone the Repository:**
    ```bash
    git clone [your-repo-url] leafguard
    cd leafguard
    ```

2.  **Create and Activate Virtual Environment:**
    ```bash
    python -m venv venv
    # For Windows PowerShell:
    .\venv\Scripts\Activate.ps1
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Database Configuration:**
    * Create a `.env` file based on the template above and fill in your `SECRET_KEY` and `MYSQL_PASSWORD`.
    * Set up the database schema by running the SQL script against your MySQL server:
        ```bash
        # Log into MySQL and run the database.sql content
        mysql -u root -p leafguard_db < database.sql
        ```

5.  **Run the Application:**
    ```bash
    python app.py
    ```

The application will be accessible at `http://127.0.0.1:5000/`.