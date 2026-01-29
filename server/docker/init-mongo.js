// MongoDB initialization script
// This runs automatically when MongoDB starts

// Connect to admin database
db = db.getSiblingDB('admin');

// Create admin user if it doesn't exist
try {
  db.createUser({
    user: 'admin',
    pwd: 'senhasegura123',
    roles: ['root']
  });
  print('✓ Admin user created successfully');
} catch (e) {
  if (e.code === 51003) {
    print('✓ Admin user already exists');
  } else {
    print('❌ Error creating user: ' + e);
  }
}

// Create database-comercial database
db = db.getSiblingDB('database-comercial');
db.createCollection('leads');
db.createCollection('contatos');
db.createCollection('empresas');
db.createCollection('fase_funils');
db.createCollection('origem_leads');
db.createCollection('nichos');
db.createCollection('membros');

print('✓ Database and collections initialized');
