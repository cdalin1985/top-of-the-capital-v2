/**
 * Global Test Setup
 * Runs once before all test suites
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧪 Setting up global test environment...');

  // Set test environment variables first
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_32_characters_long_123456';
  process.env.DATABASE_URL = 'file:./prisma/test.db';
  process.env.LOG_LEVEL = 'error';

  // Ensure test database is clean
  const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    console.log('🗄️  Cleaned test database');
  }

  // Initialize test database with current schema
  try {
    const { execSync } = require('child_process');
    // First ensure prisma client is generated
    execSync('npx prisma generate', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });

    // Push schema to test database
    execSync('npx prisma db push --force-reset', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });
    console.log('📊 Test database schema initialized');
  } catch (error) {
    console.warn('⚠️  Could not initialize test database schema:', error.message);
    // Try alternative setup
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env }
      });
      console.log('📊 Test database migrations applied');
    } catch (migrationError) {
      console.error('❌ Failed to setup test database:', migrationError.message);
    }
  }

  console.log('✅ Global test setup complete');
};
