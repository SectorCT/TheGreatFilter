#!/usr/bin/env python3
"""
Simple script to test database connection for debugging purposes.
Run this inside the Docker container to verify database connectivity.
"""
import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def test_database_connection():
    """Test database connection and print status."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print("✅ Database connection successful!")
            print(f"Query result: {result}")
            
            # Test if migrations table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'django_migrations'
                );
            """)
            migrations_exists = cursor.fetchone()[0]
            print(f"📋 Migrations table exists: {migrations_exists}")
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\nTroubleshooting steps:")
        print("1. Make sure the database container is running")
        print("2. Check if the .env file has correct DB_HOST=db")
        print("3. Verify both containers are on the same network")
        print("4. Check database logs: docker-compose logs db")
        return False
    
    return True

def run_migrations():
    """Run Django migrations."""
    try:
        print("\n🔄 Running migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        print("✅ Migrations completed successfully!")
        return True
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing The Great Filter Database Connection")
    print("=" * 50)
    
    # Test connection
    if test_database_connection():
        # Run migrations if connection is successful
        run_migrations()
    else:
        sys.exit(1)
