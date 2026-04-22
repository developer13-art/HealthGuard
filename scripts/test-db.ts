import 'dotenv/config';
import { db } from '../server/db';

async function testConnection() {
  try {
    // Try to query the users collection
    const usersSnapshot = await db.collection('users').limit(1).get();
    console.log('✅ Firebase Firestore connection successful!');
    
    // Get total users
    const allUsersSnapshot = await db.collection('users').get();
    console.log(`📊 Total users in database: ${allUsersSnapshot.size}`);
    
    if (!usersSnapshot.empty) {
      const firstUser = usersSnapshot.docs[0].data();
      console.log('Sample user (first 100 chars):', JSON.stringify(firstUser).substring(0, 100) + '...');
    } else {
      console.log('📝 No users found in database yet.');
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();