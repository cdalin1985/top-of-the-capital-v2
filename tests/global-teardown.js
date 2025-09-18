/**
 * Global Test Teardown
 * Runs once after all test suites complete
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up global test environment...');

  // Clean up test database (with retry for file locks)
  const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');
  if (fs.existsSync(testDbPath)) {
    try {
      // Force close any connections first
      if (global.testPrisma) {
        await global.testPrisma.$disconnect();
        global.testPrisma = null;
      }

      // Retry deletion with delay
      let retries = 3;
      while (retries > 0) {
        try {
          fs.unlinkSync(testDbPath);
          console.log('🗄️  Test database cleaned');
          break;
        } catch (error) {
          if (error.code === 'EBUSY' && retries > 1) {
            console.log(`⏳ Retrying database cleanup (${retries} attempts left)...`);
            await new Promise(resolve => setTimeout(resolve, 200));
            retries--;
          } else {
            console.warn('⚠️  Could not delete test database:', error.message);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Error during test database cleanup:', error.message);
    }
  }

  // Clean up any test upload files
  const testUploadsPath = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
  if (fs.existsSync(testUploadsPath)) {
    const files = fs.readdirSync(testUploadsPath);
    files.forEach(file => {
      if (file.startsWith('avatar_test_') || file.includes('_test_')) {
        fs.unlinkSync(path.join(testUploadsPath, file));
      }
    });
    console.log('📁 Test upload files cleaned');
  }

  console.log('✅ Global test teardown complete');
};
