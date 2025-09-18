#!/usr/bin/env node

/**
 * Capital Ladder App - Demo Starter
 *
 * This script sets up demo data and starts the server in one command
 */

const { spawn } = require('child_process');
const { setupDemoData } = require('./demo-setup');

async function startDemo() {
  console.log('🎱 Capital Ladder Demo Startup\n');

  try {
    // Setup demo data
    await setupDemoData();

    console.log('\n🚀 Starting server...\n');

    // Start the server
    const serverProcess = spawn('node', ['server.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down demo...');
      serverProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      serverProcess.kill('SIGTERM');
      process.exit(0);
    });

    serverProcess.on('error', error => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start demo:', error);
    process.exit(1);
  }
}

startDemo();
