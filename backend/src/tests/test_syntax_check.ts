/**
 * Syntax and Import Check Test
 *
 * This test verifies that all modules can be imported without errors.
 * Does not require database connection.
 */

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  SEEME BACKEND - SYNTAX & IMPORT CHECK                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

let errors = 0;

function testImport(moduleName: string, importFn: () => void) {
  try {
    importFn();
    console.log(`✓ ${moduleName}`);
  } catch (error) {
    console.error(`✗ ${moduleName}: ${error}`);
    errors++;
  }
}

// Test model imports
console.log('=== Models ===');
testImport('User model', () => require('../models/User'));
testImport('Post model', () => require('../models/Post'));
testImport('Follow model', () => require('../models/Follow'));
testImport('Like model', () => require('../models/Like'));
testImport('Comment model', () => require('../models/Comment'));

// Test controller imports
console.log('\n=== Controllers ===');
testImport('PostController', () => require('../controllers/PostController'));
testImport('FeedController', () => require('../controllers/FeedController'));
testImport('LikeController', () => require('../controllers/LikeController'));
testImport('CommentController', () => require('../controllers/CommentController'));
testImport('FollowController', () => require('../controllers/FollowController'));

// Test service imports
console.log('\n=== Services ===');
testImport('S3Service', () => require('../services/S3Service'));
testImport('MLService', () => require('../services/MLService'));

// Test utility imports
console.log('\n=== Utilities ===');
testImport('ImageProcessor', () => require('../utils/imageProcessing'));
testImport('Logger', () => require('../utils/logger'));

// Test route imports
console.log('\n=== Routes ===');
testImport('Auth routes', () => require('../routes/auth'));
testImport('Post routes', () => require('../routes/posts'));
testImport('Feed routes', () => require('../routes/feed'));
testImport('Like routes', () => require('../routes/likes'));
testImport('Comment routes', () => require('../routes/comments'));
testImport('Follow routes', () => require('../routes/follows'));
testImport('Internal routes', () => require('../routes/internal'));

console.log('\n' + '═'.repeat(60));

if (errors === 0) {
  console.log('✅ ALL IMPORTS SUCCESSFUL - No syntax errors detected');
  console.log('═'.repeat(60) + '\n');
  process.exit(0);
} else {
  console.error(`❌ ${errors} IMPORT(S) FAILED`);
  console.log('═'.repeat(60) + '\n');
  process.exit(1);
}
