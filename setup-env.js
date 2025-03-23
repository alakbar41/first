/**
 * This script helps set up the environment configuration
 * Run with: node setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define the path to the example and production env files
const envExamplePath = path.join(__dirname, '.env.example');
const envPath = path.join(__dirname, '.env');

console.log('🔧 Setting up your environment configuration');
console.log('-------------------------------------------');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  A .env file already exists.');
  rl.question('Do you want to overwrite it? (y/n): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Operation cancelled. Your .env file remains unchanged.');
      rl.close();
      return;
    }
    createEnvFile();
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  // Read the example env file
  fs.readFile(envExamplePath, 'utf8', (err, data) => {
    if (err) {
      console.error('❌ Error reading .env.example file:', err);
      rl.close();
      return;
    }

    // Parse the variables from the example file
    const variables = data
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const [key, defaultValue] = line.split('=');
        return { key, defaultValue: defaultValue || '' };
      });

    // Prompt user for each variable
    console.log('\nPlease provide values for the following environment variables:');
    console.log('(Press Enter to use the example value or leave blank)\n');
    
    promptForVariables(variables, 0, {});
  });
}

function promptForVariables(variables, index, results) {
  if (index >= variables.length) {
    // All variables collected, write to .env file
    const envContent = Object.entries(results)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFile(envPath, envContent, 'utf8', (err) => {
      if (err) {
        console.error('❌ Error writing .env file:', err);
      } else {
        console.log('\n✅ Environment configuration created successfully!');
      }
      rl.close();
    });
    return;
  }

  const { key, defaultValue } = variables[index];
  const prompt = defaultValue 
    ? `${key} (default: ${defaultValue}): ` 
    : `${key}: `;

  rl.question(prompt, (answer) => {
    // Use provided answer or default value
    results[key] = answer.trim() || defaultValue;
    promptForVariables(variables, index + 1, results);
  });
}