/**
 * First-time setup script for ADA University Voting System
 * Run with: node setup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 ADA University Voting System - Setup');
console.log('=======================================');
console.log('This script will help you set up the project for first-time use.');

// Step 1: Check if environment file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('\n📝 No .env file found. Creating one from example...');
  
  // Run the environment setup script
  try {
    execSync('node setup-env.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error running environment setup:', error.message);
    process.exit(1);
  }
} else if (!fs.existsSync(envPath)) {
  console.error('❌ No .env file or .env.example found. Please create a .env file manually.');
  process.exit(1);
} else {
  console.log('✅ Environment file (.env) already exists.');
}

// Step 2: Install dependencies if needed
console.log('\n📦 Checking dependencies...');
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('Installing dependencies (this may take a few minutes)...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully.');
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed.');
}

// Step 3: Setup the database
console.log('\n🗄️ Setting up the database...');
rl.question('Would you like to push the schema to the database? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    try {
      console.log('Running database migration...');
      execSync('npm run db:push', { stdio: 'inherit' });
      console.log('✅ Database schema applied successfully.');
      finishSetup();
    } catch (error) {
      console.error('❌ Error setting up database:', error.message);
      finishSetup();
    }
  } else {
    console.log('Database setup skipped.');
    finishSetup();
  }
});

function finishSetup() {
  console.log('\n🎉 Setup completed!');
  console.log('\nYou can now start the development server with:');
  console.log('  npm run dev');
  console.log('\nDefault admin credentials:');
  console.log('  Email: admin@ada.edu.az');
  console.log('  Password: Admin123@');
  
  rl.close();
}