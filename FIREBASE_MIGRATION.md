# Firebase Migration Guide - Neon → Firestore

## Overview
Your HealthGuard application has been successfully migrated from Neon PostgreSQL to Google Cloud Firestore. This guide will help you complete the remaining setup steps.

## What Changed

### Removed Dependencies
- `@neondatabase/serverless` - Neon client library
- `drizzle-orm` - SQL ORM for PostgreSQL
- `drizzle-zod` - Drizzle validation library
- `drizzle-kit` - Drizzle schema management CLI
- `connect-pg-simple` - PostgreSQL session store

### New Database Layer
- **Database**: Google Cloud Firestore (NoSQL)
- **Admin SDK**: `firebase-admin` (already installed)
- **Collections**: Document structure with kebab-case names (e.g., `users`, `health_profiles`, `access_control`)

## Setup Instructions

### Step 1: Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **healthguard-71694**
3. Navigate to: **Project Settings** (⚙️ icon, top left)
4. Go to the **Service Accounts** tab
5. Click **Generate New Private Key** button
6. A JSON file will download automatically

### Step 1B: Enable Firestore API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: **healthguard-71694**
3. Navigate to: **APIs & Services** → **APIs & Services**
4. Search for "Cloud Firestore API"
5. Click on it and then click the **ENABLE** button
6. Wait 1-2 minutes for the API to be enabled globally

### Step 2: Add Firebase Credentials

**Option A: Using Service Account File (Recommended)**
1. Copy the downloaded JSON file to your project root
2. Rename it to: `firebase-service-account.json`
3. The `.env` file already has the path configured

**Option B: Using Environment Variables**
If you can't use a file, extract these values from the JSON:
1. Edit `.env`
2. Uncomment the `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL` lines
3. Fill in the values from your service account JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the \n escape sequences)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Verify Database Connection
```bash
npm run db:test
```

You should see a success message if Firebase is properly configured.

**If you see "Cloud Firestore API has not been used" error:**
- Go to [this link](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=healthguard-71694)
- Click **Enable** button
- Wait 1-2 minutes and try again

## Data Migration Notes

### Firestore Collection Structure
Your data is organized into these Firestore collections:

| Collection | Description |
|-----------|-------------|
| `users` | User accounts (patients, doctors, hospitals, etc.) |
| `kyc` | Know-Your-Customer verification data |
| `health_profiles` | Patient health information |
| `medical_records` | Stored medical documents |
| `access_control` | Record access permissions |
| `treatment_logs` | Treatment history |
| `insurance_providers` | Insurance company profiles |
| `patient_insurance_connections` | Patient-insurance relationships |
| `claims` | Insurance claims |
| `audit_logs` | Activity logs |
| `emergency_qr_codes` | Emergency QR codes |
| `consultation_requests` | Doctor consultations |
| `chat_messages` | Consultation messages |
| `patient_admissions` | Hospital admissions |
| `subscription_payments` | Payment records |

### Field Naming Convention
- Database fields use **snake_case** (e.g., `user_id`, `created_at`)
- TypeScript models use **camelCase** (e.g., `userId`, `createdAt`)
- The conversion happens automatically in the storage layer

### Important Changes
1. **No auto-increment IDs**: Firestore uses document IDs instead. UUIDs are generated automatically.
2. **Timestamps**: `Date` objects are handled natively by Firestore
3. **Arrays**: Support for arrays (e.g., `allergies`, `chronic_conditions`)
4. **No JOINs**: Related data is fetched separately and combined in the application layer

## Running Your Application

### Development
```bash
npm run dev
```
Server runs on `http://localhost:5000`

### Production Build
```bash
npm run build
npm run start
```

## Firestore Rules (Optional)

For production, set up security rules in Firestore Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### "Firebase credentials not configured" error
- Ensure `firebase-service-account.json` exists in project root, OR
- Verify environment variables are set correctly in `.env`

### "Collection not found" when starting app
- Firestore creates collections automatically on first write
- Run the application to initialize default collections
- Or manually create collections in Firestore Console

### Performance with large datasets
- Add Firestore indexes for frequently queried fields
- Use pagination with `.limit()` in queries
- Consider caching strategies for common queries

## Benefits of Firestore

✅ **Scalability**: Auto-scales with your data  
✅ **Real-time**: Built-in real-time listeners (for future features)  
✅ **Global**: Automatically replicated across regions  
✅ **No ops**: Fully managed service (no infrastructure to maintain)  
✅ **Cost-effective**: Pay only for what you use  

## Need Help?

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- Check server logs: `npm run dev` shows all errors

---

**Your database is now running on Google Cloud Firestore! 🎉**
