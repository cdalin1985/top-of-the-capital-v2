/**
 * VAPID Key Generator Script
 * Generates VAPID keys for push notifications and sets environment variables
 * Version 1.0 - Created 2025-09-15
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('Generating VAPID keys for push notifications...\n');

// Generate VAPID key pair
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID Keys Generated:');
console.log('PUBLIC KEY:', vapidKeys.publicKey);
console.log('PRIVATE KEY:', vapidKeys.privateKey);

// Path to .env file
const envPath = path.join(__dirname, '..', '.env');

// Prepare environment variables
const envVars = `
# VAPID Keys for Push Notifications (Generated ${new Date().toISOString()})
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:admin@capitolladder.com
`;

try {
  // Check if .env file exists
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');

    // Remove existing VAPID keys if they exist
    envContent = envContent.replace(
      /# VAPID Keys.*\nVAPID_PUBLIC_KEY=.*\nVAPID_PRIVATE_KEY=.*\nVAPID_SUBJECT=.*\n/g,
      ''
    );
    envContent = envContent.replace(/VAPID_PUBLIC_KEY=.*\n/g, '');
    envContent = envContent.replace(/VAPID_PRIVATE_KEY=.*\n/g, '');
    envContent = envContent.replace(/VAPID_SUBJECT=.*\n/g, '');
  }

  // Append new VAPID keys
  const newEnvContent = envContent.trimEnd() + envVars;

  // Write to .env file
  fs.writeFileSync(envPath, newEnvContent, 'utf8');

  console.log('\n✅ Environment variables updated in .env file');
  console.log('\nTo use these keys, restart your server.');
  console.log('\nNote: Keep your private key secure and never commit it to version control!');
} catch (error) {
  console.error('\n❌ Error updating .env file:', error.message);
  console.log('\nYou can manually add these environment variables to your .env file:');
  console.log(envVars);
}

console.log('\n🔧 Next steps:');
console.log('1. Restart your Capital Ladder server');
console.log('2. Test push notifications by visiting the app and enabling notifications');
console.log('3. Use the admin test endpoint to send a test notification');
