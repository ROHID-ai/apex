from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.database import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    
    # Initialize the database with the app
    db.init_app(app)
    
    # Import models explicitly inside the factory
    from app import models
    
    with app.app_context():
        try:
            # This is where the magic happens - detecting models and creating tables
            db.create_all()
            print("✅ Supabase tables synchronized successfully!")
        except Exception as e:
            print(f"❌ Error synchronizing Supabase: {e}")

    @app.route('/test-db')
    def test_db():
        try:
            db.session.execute(db.text('SELECT 1'))
            return jsonify({"status": "success", "message": "Connected to Supabase Transaction Pooler"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    return app
