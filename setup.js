#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🎯 CatPrep Local Setup Script\n');

// Check if .env already exists
if (fs.existsSync('.env')) {
  console.log('⚠️  .env file already exists. Please check your configuration manually.');
  console.log('📋 Reference .env.example for the required variables.\n');
  process.exit(0);
}

// Generate a secure session secret
const sessionSecret = crypto.randomBytes(32).toString('hex');

// Create .env file from template
const envTemplate = `# Database Configuration
DATABASE_URL=postgresql://catprep_user:catprep_password@localhost:5432/catprep_dev

# Session Configuration (auto-generated)
SESSION_SECRET=${sessionSecret}

# Replit Auth Configuration (for local development)
ISSUER_URL=https://replit.com/oidc
REPL_ID=local-development
REPLIT_DOMAINS=localhost:5000

# PostgreSQL Connection Details (for local DB)
PGHOST=localhost
PGPORT=5432
PGUSER=catprep_user
PGPASSWORD=catprep_password
PGDATABASE=catprep_dev

# Development Environment
NODE_ENV=development
`;

try {
  fs.writeFileSync('.env', envTemplate);
  console.log('✅ Created .env file with secure session secret');
} catch (error) {
  console.error('❌ Failed to create .env file:', error.message);
  process.exit(1);
}

// Check for package.json
if (!fs.existsSync('package.json')) {
  console.log('❌ package.json not found. Make sure you\'re in the CatPrep project directory.');
  process.exit(1);
}

console.log('\n📋 Next Steps:');
console.log('1. Set up your PostgreSQL database:');
console.log('   • Install PostgreSQL locally OR use a cloud service (Neon, Supabase)');
console.log('   • Update the DATABASE_URL in .env with your actual database credentials');
console.log('\n2. Install dependencies:');
console.log('   npm install');
console.log('\n3. Push database schema:');
console.log('   npm run db:push');
console.log('\n4. Start development server:');
console.log('   npm run dev');
console.log('\n5. Open http://localhost:5000 in your browser');

console.log('\n🔧 For detailed setup instructions, see LOCAL_SETUP.md');
console.log('🎉 Setup complete! Happy coding with CatPrep!');