#!/bin/bash
# MongoDB initialization script
# This script creates the admin user on first startup

set -e

# Wait for MongoDB to be ready
until mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  echo "Waiting for MongoDB to start..."
  sleep 2
done

echo "MongoDB started, creating admin user..."

# Create admin user if it doesn't exist
mongosh admin --eval "
if (!db.getUser('admin')) {
  db.createUser({
    user: 'admin',
    pwd: 'senhasegura123',
    roles: ['root']
  });
  print('✓ Admin user created');
} else {
  print('✓ Admin user already exists');
}
"

echo "MongoDB initialization complete!"
