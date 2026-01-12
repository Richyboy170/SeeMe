/**
 * Helper script to create a test conversation between two users
 * Usage: node create-test-conversation.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function createTestConversation() {
  try {
    console.log('🔐 Logging in as alice...');
    const aliceAuth = await axios.post(`${API_URL}/auth/login`, {
      email: 'alice@test.com',
      password: 'Test123!@#'
    });

    if (!aliceAuth.data.token) {
      console.error('❌ Alice login failed. Make sure alice@test.com is registered.');
      console.log('💡 Run: npm run dev (in mobile app) and register alice first');
      return;
    }

    const aliceToken = aliceAuth.data.token;
    const aliceId = aliceAuth.data.user.id;
    console.log(`✅ Alice logged in (ID: ${aliceId})`);

    console.log('\n🔐 Logging in as bob...');
    const bobAuth = await axios.post(`${API_URL}/auth/login`, {
      email: 'bob@test.com',
      password: 'Test123!@#'
    });

    if (!bobAuth.data.token) {
      console.error('❌ Bob login failed. Make sure bob@test.com is registered.');
      console.log('💡 Run: npm run dev (in mobile app) and register bob first');
      return;
    }

    const bobId = bobAuth.data.user.id;
    console.log(`✅ Bob logged in (ID: ${bobId})`);

    console.log('\n💬 Creating conversation between alice and bob...');
    const conversation = await axios.post(
      `${API_URL}/chat/conversations`,
      { otherUserId: bobId },
      { headers: { Authorization: `Bearer ${aliceToken}` } }
    );

    console.log(`✅ Conversation created!`);
    console.log(`   Conversation ID: ${conversation.data.conversation.id}`);
    console.log(`   Between: alice (${aliceId}) and bob (${bobId})`);

    console.log('\n🎉 Success! Now you can:');
    console.log('   1. Open mobile app on both devices');
    console.log('   2. Login as alice on device 1');
    console.log('   3. Login as bob on device 2');
    console.log('   4. Go to Messages tab on both');
    console.log('   5. Pull to refresh');
    console.log('   6. Tap the conversation and start chatting!');
    console.log('\n📱 Happy Testing!');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data?.message || error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server not running!');
      console.log('   Run: cd backend && npm run dev');
    } else if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. Check that users exist:');
      console.log('   - alice@test.com / Test123!@#');
      console.log('   - bob@test.com / Test123!@#');
    }
  }
}

// Run the script
createTestConversation();
