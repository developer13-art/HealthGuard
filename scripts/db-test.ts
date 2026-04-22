import 'dotenv/config';
import { db } from '../server/db';

async function testDatabaseConnection() {
  let error: any = null;
  try {
    console.log('Testing Firebase Firestore connection...');
    console.log('Firebase Credentials Path:', process.env.FIREBASE_CREDENTIALS_PATH ? 'Configured' : 'Missing');
    console.log('Firebase Project ID:', process.env.FIREBASE_PROJECT_ID ? 'Configured' : 'Not set (using file)');
    
    // Test Firestore connection by accessing users collection
    const usersSnapshot = await db.collection('users').limit(1).get();
    console.log('✅ Connection successful!');
    console.log('✅ Users collection is accessible');
    
    // Get count of existing users
    const allUsersSnapshot = await db.collection('users').get();
    console.log(`📊 Total users in Firestore: ${allUsersSnapshot.size}`);
    
    // Test a specific collection
    try {
      const kycSnapshot = await db.collection('kyc').limit(1).get();
      console.log('✅ KYC collection is accessible');
      
      const healthProfilesSnapshot = await db.collection('health_profiles').limit(1).get();
      console.log('✅ Health Profiles collection is accessible');
      
      const medicalRecordsSnapshot = await db.collection('medical_records').limit(1).get();
      console.log('✅ Medical Records collection is accessible');
    } catch (collectionError) {
      console.warn('⚠️  Some collections may not exist yet (this is expected on first setup)');
    }
    
    console.log('\n🎉 Firebase Firestore is properly configured!');
    
  } catch (err: any) {
    error = err;
    console.error('❌ Database connection error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.details) {
      console.error('Error details:', error.details);
    }
    console.error('\nPlease ensure:');
    console.error('1. firebase-service-account.json exists in project root');
    console.error('2. Or FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL are set');
    console.error('3. Firebase Admin SDK is properly initialized');
    console.error('4. Cloud Firestore API is ENABLED in your Firebase project');
  } finally {
    process.exit(error ? 1 : 0);
  }
}

testDatabaseConnection();