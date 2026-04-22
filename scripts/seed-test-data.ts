import 'dotenv/config';
import { db } from '../server/db';

/**
 * Seed Script: Create test data in Firebase Firestore
 * 
 * This script creates sample data for development and testing.
 * Run: npm run seed:test-data
 */

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data to Firebase Firestore...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await clearAllCollections();

    // Seed users
    const users = [
      {
        id: 'user_1',
        walletAddress: '7Zm7C3pxnLJwfCkHy3eGLhMVPfr9R14AwKxvzQvB6Eq4',
        uid: 'HID123456789',
        username: 'john_patient',
        email: 'john@example.com',
        role: 'patient',
        status: 'verified',
        profilePicture: null,
        hospitalName: null,
        doctorlicense: null,
        createdAt: new Date(),
        suspendedUntil: null,
      },
      {
        id: 'user_2',
        walletAddress: '8An8D3qyoMKxgDlIz4fHMInWQgs0S25BxLyxaRwC7Fr5',
        uid: 'HID987654321',
        username: 'dr_smith',
        email: 'smith@example.com',
        role: 'doctor',
        status: 'verified',
        profilePicture: null,
        hospitalName: 'City Hospital',
        doctorlicense: 'MD-2024-001',
        createdAt: new Date(),
        suspendedUntil: null,
      },
      {
        id: 'user_3',
        walletAddress: '9Bo9E4rzoPLyaElJz5gINoXRTht1T36CyMzxBxD8Gs6',
        uid: 'HID111111111',
        username: 'hospital_admin',
        email: 'admin@cityhospital.com',
        role: 'hospital',
        status: 'verified',
        profilePicture: null,
        hospitalName: 'City Hospital',
        doctorlicense: null,
        createdAt: new Date(),
        suspendedUntil: null,
      },
    ];

    console.log('Adding users...');
    for (const user of users) {
      await db.collection('users').doc(user.id).set(user);
    }
    console.log(`✅ Added ${users.length} users`);

    // Seed health profiles
    const healthProfiles = [
      {
        id: 'profile_1',
        userId: 'user_1',
        bloodType: 'O+',
        allergies: ['Penicillin', 'Peanuts'],
        chronicConditions: ['Hypertension'],
        currentMedications: ['Lisinopril'],
        height: 180,
        weight: 75,
        emergencyContact: 'Jane Doe',
        emergencyPhone: '+1234567890',
        organDonor: true,
        updatedAt: new Date(),
      },
    ];

    console.log('Adding health profiles...');
    for (const profile of healthProfiles) {
      await db.collection('health_profiles').doc(profile.id).set(profile);
    }
    console.log(`✅ Added ${healthProfiles.length} health profiles`);

    // Seed KYC records
    const kycRecords = [
      {
        id: 'kyc_1',
        userId: 'user_2',
        documentType: 'passport',
        documentNumber: 'ABC123456',
        submittedAt: new Date(),
        status: 'verified',
        reviewedBy: 'admin_1',
        reviewedAt: new Date(),
        rejectionReason: null,
        affiliatedHospital: 'City Hospital',
        medicalLicense: 'MD-2024-001',
        specialization: 'Cardiology',
      },
    ];

    console.log('Adding KYC records...');
    for (const kyc of kycRecords) {
      await db.collection('kyc').doc(kyc.id).set(kyc);
    }
    console.log(`✅ Added ${kycRecords.length} KYC records`);

    // Seed audit logs
    const auditLogs = [
      {
        id: 'audit_1',
        userId: 'user_1',
        action: 'profile_update',
        resourceType: 'health_profile',
        resourceId: 'profile_1',
        changes: { bloodType: 'O+' },
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
    ];

    console.log('Adding audit logs...');
    for (const log of auditLogs) {
      await db.collection('audit_logs').doc(log.id).set(log);
    }
    console.log(`✅ Added ${auditLogs.length} audit logs`);

    // Seed medical records
    const medicalRecords = [
      {
        id: 'record_1',
        userId: 'user_1',
        title: 'Blood Test Report',
        description: 'Annual blood test results',
        fileHash: 'abc123def456',
        ipfsHash: 'QmXxxx',
        documentType: 'lab_report',
        uploadedAt: new Date(),
        uploadedBy: 'user_2',
      },
    ];

    console.log('Adding medical records...');
    for (const record of medicalRecords) {
      await db.collection('medical_records').doc(record.id).set(record);
    }
    console.log(`✅ Added ${medicalRecords.length} medical records`);

    // Seed insurance providers
    const insuranceProviders = [
      {
        id: 'provider_1',
        userId: 'user_3',
        providerName: 'HealthCare Plus Insurance',
        packageName: 'Premium Health',
        monthlyFee: 99.99,
        coverageLimit: 500000,
        coverageTypes: ['Emergency', 'Surgery', 'Doctor Visits'],
        isActive: true,
      },
    ];

    console.log('Adding insurance providers...');
    for (const provider of insuranceProviders) {
      await db.collection('insurance_providers').doc(provider.id).set(provider);
    }
    console.log(`✅ Added ${insuranceProviders.length} insurance providers`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test data seeded successfully!');
    console.log('='.repeat(60));
    console.log('\nYou can now:');
    console.log('1. Run: npm run dev');
    console.log('2. Visit: http://localhost:5000');
    console.log('3. Connect your wallet to see the test data');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to seed test data:', error.message);
    process.exit(1);
  }
}

seedTestData();
