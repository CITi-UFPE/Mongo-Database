# server/services/db.py
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
import os
from typing import Optional

class MongoDB:
    """MongoDB connection singleton"""
    _instance: Optional['MongoDB'] = None
    
    def __init__(self):
        self.client = None
        self.db = None
    
    @staticmethod
    def get_instance():
        """Get or create MongoDB instance"""
        if MongoDB._instance is None:
            MongoDB._instance = MongoDB()
        return MongoDB._instance
    
    def connect(self):
        """Connect to MongoDB"""
        try:
            # Tenta pegar do docker-compose primeiro, depois do .env
            mongo_uri = (
                os.getenv('MONGODB_URL') or 
                os.getenv('MONGO_URI_PROD') or 
                os.getenv('MONGO_URI_DEV')
            )
            
            if not mongo_uri:
                raise Exception("MONGO_URI not configured")
            
            print(f"🔌 Conectando ao MongoDB: {mongo_uri.split('@')[1] if '@' in mongo_uri else mongo_uri}")
            
            self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            
            # Test connection
            self.client.admin.command('ping')
            
            self.db = self.client['database-comercial']
            print("✓ MongoDB connected")
            return True
        except ServerSelectionTimeoutError:
            print("❌ MongoDB connection timeout")
            return False
        except Exception as e:
            print(f"❌ MongoDB connection error: {str(e)}")
            return False
    
    def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("✓ MongoDB disconnected")
    
    def get_db(self):
        """Get database instance"""
        if self.db is None:
            self.connect()
        return self.db
    
    def get_collection(self, collection_name: str):
        """Get a collection"""
        db = self.get_db()
        return db[collection_name]

# Global instance
db_client = MongoDB.get_instance()
