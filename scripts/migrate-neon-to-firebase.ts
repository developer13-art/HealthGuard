import 'dotenv/config';
import { db } from '../server/db';
import { Pool } from 'pg';

/**
 * Migration Script: PostgreSQL (Neon) → Firebase Firestore
 * 
 * This script migrates all data from your PostgreSQL database to Firestore.
 * 
 * Prerequisites:
 * 1. Set DATABASE_URL in .env pointing to your PostgreSQL database
 *    Example: postgresql://user:password@host:5432/database
 * 2. Firebase credentials configured in firebase-service-account.json
 * 3. Firestore database created in Firebase
 * 
 * Run: npm run migrate:neon-to-firebase
 */

const NEON_CONNECTION_URL = process.env.DATABASE_URL;

interface MigrationResult {
  collection: string;
  count: number;
  error?: string;
}

const results: MigrationResult[] = [];

async function migrateUsersTable() {
  try {
    console.log('Migrating users...');
    if (!NEON_CONNECTION_URL) {
      throw new Error('DATABASE_URL not set. Please add your PostgreSQL database URL to .env');
    }

    const pool = new Pool({ connectionString: NEON_CONNECTION_URL });
    
    try {
      const res = await pool.query('SELECT * FROM users');
      const users = res.rows;
      
      if (users.length === 0) {
        console.log('  ℹ️  No users to migrate');
        return;
      }

      let successCount = 0;
      for (const user of users) {
        try {
          await db.collection('users').doc(user.id).set({
            id: user.id,
            walletAddress: user.wallet_address,
            uid: user.uid,
            username: user.username,
            email: user.email || null,
            role: user.role,
            status: user.status,
            profilePicture: user.profile_picture || null,
            hospitalName: user.hospital_name || null,
            doctorlicense: user.doctorlicense || null,
            createdAt: user.created_at ? new Date(user.created_at) : new Date(),
            suspendedUntil: user.suspended_until ? new Date(user.suspended_until) : null,
          });
          successCount++;
        } catch (err) {
          console.error(`    Error migrating user ${user.id}:`, err);
        }
      }
      
      console.log(`  ✅ Migrated ${successCount}/${users.length} users`);
      results.push({ collection: 'users', count: successCount });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error('❌ Failed to migrate users:', error.message);
    results.push({ collection: 'users', count: 0, error: error.message });
  }
}

async function migrateKYCTable() {
  try {
    console.log('Migrating KYC data...');
    if (!NEON_CONNECTION_URL) {
      throw new Error('DATABASE_URL not set');
    }

    const pool = new Pool({ connectionString: NEON_CONNECTION_URL });
    
    try {
      const res = await pool.query('SELECT * FROM kyc');
      const kycRecords = res.rows;
      
      if (kycRecords.length === 0) {
        console.log('  ℹ️  No KYC records to migrate');
        return;
      }

      let successCount = 0;
      for (const kyc of kycRecords) {
        try {
          await db.collection('kyc').doc(kyc.id).set({
            id: kyc.id,
            userId: kyc.user_id,
            documentType: kyc.document_type,
            documentNumber: kyc.document_number,
            submittedAt: kyc.submitted_at ? new Date(kyc.submitted_at) : new Date(),
            status: kyc.status,
            reviewedBy: kyc.reviewed_by || null,
            reviewedAt: kyc.reviewed_at ? new Date(kyc.reviewed_at) : null,
            rejectionReason: kyc.rejection_reason || null,
            affiliatedHospital: kyc.affiliated_hospital || null,
            medicalLicense: kyc.medical_license || null,
            specialization: kyc.specialization || null,
          });
          successCount++;
        } catch (err) {
          console.error(`    Error migrating KYC ${kyc.id}:`, err);
        }
      }
      
      console.log(`  ✅ Migrated ${successCount}/${kycRecords.length} KYC records`);
      results.push({ collection: 'kyc', count: successCount });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error('❌ Failed to migrate KYC:', error.message);
    results.push({ collection: 'kyc', count: 0, error: error.message });
  }
}

async function migrateHealthProfilesTable() {
  try {
    console.log('Migrating health profiles...');
    if (!NEON_CONNECTION_URL) {
      throw new Error('DATABASE_URL not set');
    }

    const pool = new Pool({ connectionString: NEON_CONNECTION_URL });
    
    try {
      const res = await pool.query('SELECT * FROM health_profiles');
      const profiles = res.rows;
      
      if (profiles.length === 0) {
        console.log('  ℹ️  No health profiles to migrate');
        return;
      }

      let successCount = 0;
      for (const profile of profiles) {
        try {
          await db.collection('health_profiles').doc(profile.id).set({
            id: profile.id,
            userId: profile.user_id,
            bloodType: profile.blood_type || null,
            allergies: profile.allergies || [],
            chronicConditions: profile.chronic_conditions || [],
            currentMedications: profile.current_medications || [],
            height: profile.height || null,
            weight: profile.weight || null,
            emergencyContact: profile.emergency_contact || null,
            emergencyPhone: profile.emergency_phone || null,
            organDonor: profile.organ_donor || false,
            updatedAt: profile.updated_at ? new Date(profile.updated_at) : new Date(),
          });
          successCount++;
        } catch (err) {
          console.error(`    Error migrating health profile ${profile.id}:`, err);
        }
      }
      
      console.log(`  ✅ Migrated ${successCount}/${profiles.length} health profiles`);
      results.push({ collection: 'health_profiles', count: successCount });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error('❌ Failed to migrate health profiles:', error.message);
    results.push({ collection: 'health_profiles', count: 0, error: error.message });
  }
}

async function migrationSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  let totalMigrated = 0;
  for (const result of results) {
    const status = result.error ? '❌' : '✅';
    console.log(`${status} ${result.collection.padEnd(25)} ${result.count} records`);
    totalMigrated += result.count;
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  console.log('='.repeat(60));
  console.log(`Total migrated: ${totalMigrated} records`);
  console.log('='.repeat(60));
}

async function main() {
  console.log('🚀 Starting Neon → Firebase Migration...\n');
  
  if (!NEON_CONNECTION_URL) {
    console.error('❌ ERROR: DATABASE_URL not set in .env');
    console.error('\nTo migrate from Neon to Firebase:');
    console.error('1. Add your Neon database URL to .env:');
    console.error('   DATABASE_URL=postgresql://user:password@host/database');
    console.error('2. Run: npm run migrate:neon-to-firebase\n');
    process.exit(1);
  }

  try {
    // Migrate tables in order
    await migrateUsersTable();
    await migrateKYCTable();
    await migrateHealthProfilesTable();
    
    // Add more tables as needed:
    // await migrateMedicalRecordsTable();
    // await migrateAccessControlTable();
    // etc...
    
    await migrationSummary();
    console.log('\n✅ Migration completed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
