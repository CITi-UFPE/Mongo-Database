# server/services/db.py
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
import os
from typing import Optional
import threading
import time

class MongoDB:
    """MongoDB connection singleton"""
    _instance: Optional['MongoDB'] = None
    
    def __init__(self):
        self.client = None
        self.db = None
        self._reconnect_thread = None
        self._reconnect_running = False
        self._lock = threading.Lock()
    
    @staticmethod
    def get_instance():
        """Get or create MongoDB instance"""
        if MongoDB._instance is None:
            MongoDB._instance = MongoDB()
        return MongoDB._instance
    
    def connect(self):
        """Connect to MongoDB"""
        with self._lock:
            try:
                # Tenta pegar do docker-compose primeiro, depois do .env
                mongo_uri = (
                    os.getenv('MONGO_URI') or
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
                self.db = None
                return False
            except Exception as e:
                print(f"❌ MongoDB connection error: {str(e)}")
                self.db = None
                return False

    def _reconnect_loop(self, interval_seconds: int = 5):
        while self._reconnect_running:
            if self.db is None:
                connected = self.connect()
                if not connected:
                    print(f"⏳ MongoDB indisponível. Tentando novamente em {interval_seconds}s...")
            time.sleep(interval_seconds)

    def start_reconnect_loop(self, interval_seconds: int = 5):
        if self._reconnect_running:
            return
        self._reconnect_running = True
        self._reconnect_thread = threading.Thread(
            target=self._reconnect_loop,
            kwargs={"interval_seconds": interval_seconds},
            daemon=True,
        )
        self._reconnect_thread.start()

    def stop_reconnect_loop(self):
        self._reconnect_running = False
    
    def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
            print("✓ MongoDB disconnected")
    
    def get_db(self):
        """Get database instance"""
        if self.db is None:
            self.connect()
        return self.db
    
    def get_collection(self, collection_name: str):
        """Get a collection"""
        db = self.get_db()
        if db is None:
            return None
        return db[collection_name]

# Global instance
db_client = MongoDB.get_instance()
