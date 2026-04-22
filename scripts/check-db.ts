import 'dotenv/config';
import { db } from '../server/db';
import { storage } from '../server/storage';

async function checkDatabase() {
  try {
    console.log('Checking Firebase Firestore connection...');
    
    // Check all major collections
    const collections = [
      'users',
      'kyc',
      'health_profiles',
      'medical_records',
      'access_control',
      'treatment_logs',
      'insurance_providers',
      'patient_insurance_connections',
      'claims',
      'audit_logs',
      'emergency_qr_codes',
      'consultation_requests',
      'chat_messages',
      'patient_admissions',
      'subscription_payments',
    ];
    
    console.log('\n📊 Database Collections Summary:');
    console.log('--------------------------------');
    
    for (const collection of collections) {
      try {
        const snapshot = await db.collection(collection).limit(1).get();
        console.log(`✅ ${collection.padEnd(30)} - ${snapshot.listAll().size} document(s) sampled`);
        
        // Get full count
        const fullSnapshot = await db.collection(collection).get();
        if (fullSnapshot.size > 0) {
          console.log(`   └─ Total: ${fullSnapshot.size} document(s)`);
        }
      } catch (error: any) {
        console.log(`⚠️  ${collection.padEnd(30)} - Not accessible yet`);
      }
    }
    
    console.log('\n✅ Database check completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error checking database:', error.message);
    process.exit(1);
  }
}

checkDatabase();