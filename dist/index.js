// server/index.ts
import "dotenv/config";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/db.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var isInitialized = false;
try {
  const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;
  if (credentialsPath) {
    const resolvedPath = path.isAbsolute(credentialsPath) ? credentialsPath : path.resolve(process.cwd(), credentialsPath);
    console.log("\u{1F4C1} Attempting to load Firebase credentials from:", resolvedPath);
    const serviceAccountJson = readFileSync(resolvedPath, "utf-8");
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("\u2705 Firebase Admin SDK initialized with service account file");
    isInitialized = true;
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    });
    console.log("\u2705 Firebase Admin SDK initialized with environment variables");
    isInitialized = true;
  } else {
    throw new Error(
      "Firebase credentials not configured. Set FIREBASE_CREDENTIALS_PATH or Firebase environment variables (PROJECT_ID, PRIVATE_KEY, CLIENT_EMAIL)"
    );
  }
} catch (error) {
  console.error("\u274C Failed to initialize Firebase Admin SDK:", error.message);
  console.error("\u26A0\uFE0F  Database operations will not function without Firebase initialization");
  if (process.env.NODE_ENV === "production") {
    throw error;
  }
}
if (!isInitialized) {
  console.warn("\u26A0\uFE0F  WARNING: Firebase Admin SDK not initialized. Database operations will fail.");
}
var db = getFirestore();
var auth = getAuth();

// server/storage.ts
var COLLECTIONS = {
  users: "users",
  kyc: "kyc",
  healthProfiles: "health_profiles",
  medicalRecords: "medical_records",
  accessControl: "access_control",
  treatmentLogs: "treatment_logs",
  insuranceProviders: "insurance_providers",
  patientInsuranceConnections: "patient_insurance_connections",
  claims: "claims",
  auditLogs: "audit_logs",
  emergencyQRCodes: "emergency_qr_codes",
  consultationRequests: "consultation_requests",
  chatMessages: "chat_messages",
  patientAdmissions: "patient_admissions",
  subscriptionPayments: "subscription_payments"
};
var DatabaseStorage = class {
  // Users
  async getUser(id) {
    const doc = await db.collection(COLLECTIONS.users).doc(id).get();
    return doc.exists ? doc.data() : void 0;
  }
  async getUserByWalletAddress(walletAddress) {
    const normalizedAddress = walletAddress.trim();
    const snapshot = await db.collection(COLLECTIONS.users).where("wallet_address", "==", normalizedAddress).limit(1).get();
    if (snapshot.empty) return void 0;
    const user = snapshot.docs[0].data();
    if (user.status === "suspended" && user.suspendedUntil && /* @__PURE__ */ new Date() > new Date(user.suspendedUntil)) {
      await db.collection(COLLECTIONS.users).doc(user.id).update({
        status: "verified",
        suspendedUntil: null
      });
      user.status = "verified";
      user.suspendedUntil = null;
    }
    return user;
  }
  async getUserByUid(uid) {
    const snapshot = await db.collection(COLLECTIONS.users).where("uid", "==", uid).limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async getUserByUsername(username) {
    const snapshot = await db.collection(COLLECTIONS.users).where("username", "==", username).limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async createUser(insertUser) {
    const id = insertUser.id || db.collection(COLLECTIONS.users).doc().id;
    const user = {
      ...insertUser,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.users).doc(id).set(user);
    return user;
  }
  async updateUserStatus(id, status) {
    const update = { status };
    if (status === "verified") update.suspendedUntil = null;
    await db.collection(COLLECTIONS.users).doc(id).update(update);
  }
  async suspendUser(id, suspendedUntil) {
    await db.collection(COLLECTIONS.users).doc(id).update({
      status: "suspended",
      suspendedUntil
    });
  }
  async deleteUserPermanently(id) {
    const auditLogsSnapshot = await db.collection(COLLECTIONS.auditLogs).where("user_id", "==", id).get();
    const batch = db.batch();
    auditLogsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    batch.delete(db.collection(COLLECTIONS.users).doc(id));
    await batch.commit();
  }
  async updateUserRole(id, role) {
    await db.collection(COLLECTIONS.users).doc(id).update({
      role,
      status: "verified"
    });
  }
  async updateUserProfilePicture(id, profilePicture) {
    await db.collection(COLLECTIONS.users).doc(id).update({ profilePicture });
  }
  async updateUserInfo(id, data) {
    await db.collection(COLLECTIONS.users).doc(id).update(data);
  }
  async getAllUsers() {
    const snapshot = await db.collection(COLLECTIONS.users).orderBy("created_at", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  // KYC
  async getKYC(userId) {
    const snapshot = await db.collection(COLLECTIONS.kyc).where("user_id", "==", userId).orderBy("submitted_at", "desc").limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async getKYCById(id) {
    const doc = await db.collection(COLLECTIONS.kyc).doc(id).get();
    return doc.exists ? doc.data() : void 0;
  }
  async createKYC(kycData) {
    const id = kycData.id || db.collection(COLLECTIONS.kyc).doc().id;
    const kyc = {
      ...kycData,
      id,
      submittedAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.kyc).doc(id).set(kyc);
    return kyc;
  }
  async updateKYCStatus(id, status, reviewedBy, rejectionReason) {
    await db.collection(COLLECTIONS.kyc).doc(id).update({
      status,
      reviewedBy,
      reviewedAt: /* @__PURE__ */ new Date(),
      rejectionReason: rejectionReason || null
    });
  }
  async getPendingKYC() {
    const snapshot = await db.collection(COLLECTIONS.kyc).where("status", "==", "pending").orderBy("submitted_at", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  // Health Profiles
  async getHealthProfile(userId) {
    const snapshot = await db.collection(COLLECTIONS.healthProfiles).where("user_id", "==", userId).limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async createHealthProfile(profile) {
    const id = profile.id || db.collection(COLLECTIONS.healthProfiles).doc().id;
    const healthProfile = {
      ...profile,
      id,
      updatedAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.healthProfiles).doc(id).set(healthProfile);
    return healthProfile;
  }
  async updateHealthProfile(userId, profileData) {
    const snapshot = await db.collection(COLLECTIONS.healthProfiles).where("user_id", "==", userId).limit(1).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        ...profileData,
        updatedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  // Medical Records
  async getMedicalRecords(userId) {
    const snapshot = await db.collection(COLLECTIONS.medicalRecords).where("user_id", "==", userId).orderBy("uploaded_at", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async createMedicalRecord(record) {
    const id = record.id || db.collection(COLLECTIONS.medicalRecords).doc().id;
    const medicalRecord = {
      ...record,
      id,
      uploadedAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.medicalRecords).doc(id).set(medicalRecord);
    return medicalRecord;
  }
  // Access Control
  async getAccessRequests(patientId) {
    const snapshot = await db.collection(COLLECTIONS.accessControl).where("patient_id", "==", patientId).orderBy("requested_at", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async getAccessRequestsByRequester(requesterId) {
    const snapshot = await db.collection(COLLECTIONS.accessControl).where("requester_id", "==", requesterId).orderBy("requested_at", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async getGrantedAccess(patientId) {
    const snapshot = await db.collection(COLLECTIONS.accessControl).where("patient_id", "==", patientId).where("status", "==", "granted").orderBy("responded_at", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async createAccessRequest(access) {
    const id = access.id || db.collection(COLLECTIONS.accessControl).doc().id;
    const accessControl = {
      ...access,
      id,
      requestedAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.accessControl).doc(id).set(accessControl);
    return accessControl;
  }
  async updateAccessStatus(id, status) {
    await db.collection(COLLECTIONS.accessControl).doc(id).update({
      status,
      respondedAt: /* @__PURE__ */ new Date()
    });
  }
  async checkAccess(patientId, requesterId) {
    const snapshot = await db.collection(COLLECTIONS.accessControl).where("patient_id", "==", patientId).where("requester_id", "==", requesterId).where("status", "==", "granted").limit(1).get();
    return !snapshot.empty;
  }
  async getHospitalNotifiedAccessRequests(hospitalName) {
    const accessSnapshot = await db.collection(COLLECTIONS.accessControl).where("hospital_notified", "==", true).where("is_emergency", "==", true).orderBy("requested_at", "desc").get();
    const filtered = [];
    for (const accessDoc of accessSnapshot.docs) {
      const access = accessDoc.data();
      const patient = await this.getUser(access.patientId);
      if (patient?.hospitalName === hospitalName) {
        filtered.push(access);
      }
    }
    return filtered;
  }
  // Treatment Logs
  async getTreatmentLogs(patientId, doctorId, hospitalId) {
    let query = db.collection(COLLECTIONS.treatmentLogs);
    if (patientId) query = query.where("patient_id", "==", patientId);
    if (doctorId) query = query.where("doctor_id", "==", doctorId);
    if (hospitalId) query = query.where("hospital_id", "==", hospitalId);
    const snapshot = await query.orderBy("created_at", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async createTreatmentLog(log2) {
    const id = log2.id || db.collection(COLLECTIONS.treatmentLogs).doc().id;
    const treatmentLog = {
      ...log2,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.treatmentLogs).doc(id).set(treatmentLog);
    return treatmentLog;
  }
  // Insurance Providers
  async getInsuranceProviders() {
    const snapshot = await db.collection(COLLECTIONS.insuranceProviders).where("is_active", "==", true).get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async getInsuranceProviderByUserId(userId) {
    const snapshot = await db.collection(COLLECTIONS.insuranceProviders).where("user_id", "==", userId).limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async createInsuranceProvider(provider) {
    const id = provider.id || db.collection(COLLECTIONS.insuranceProviders).doc().id;
    const insuranceProvider = {
      ...provider,
      id
    };
    await db.collection(COLLECTIONS.insuranceProviders).doc(id).set(insuranceProvider);
    return insuranceProvider;
  }
  async updateInsuranceProvider(id, data) {
    await db.collection(COLLECTIONS.insuranceProviders).doc(id).update(data);
  }
  // Patient Insurance Connections
  async getPatientInsuranceConnections(patientId) {
    const snapshot = await db.collection(COLLECTIONS.patientInsuranceConnections).where("patient_id", "==", patientId).orderBy("requested_at", "desc").get();
    const results = [];
    for (const doc of snapshot.docs) {
      const connection = doc.data();
      const provider = await this.getInsuranceProviderByUserId(connection.providerId);
      results.push({
        id: connection.id,
        patientId: connection.patientId,
        providerId: connection.providerId,
        status: connection.status,
        connectionReason: connection.connectionReason,
        requestedAt: connection.requestedAt,
        approvedAt: connection.approvedAt,
        disconnectedAt: connection.disconnectedAt,
        lastBillingDate: connection.lastBillingDate,
        missedPaymentsCount: connection.missedPaymentsCount,
        rejectionReason: connection.rejectionReason,
        providerName: provider?.providerName,
        monthlyFee: provider?.monthlyFee,
        coverageLimit: provider?.coverageLimit,
        coverageTypes: provider?.coverageTypes
      });
    }
    return results;
  }
  async getProviderConnections(providerId) {
    const snapshot = await db.collection(COLLECTIONS.patientInsuranceConnections).where("provider_id", "==", providerId).orderBy("requested_at", "desc").get();
    const results = [];
    for (const doc of snapshot.docs) {
      const connection = doc.data();
      const patient = await this.getUser(connection.patientId);
      const healthProfile = await this.getHealthProfile(connection.patientId);
      results.push({
        id: connection.id,
        patientId: connection.patientId,
        patientUid: patient?.uid,
        patientUsername: patient?.username,
        patientEmail: patient?.email,
        status: connection.status,
        connectionReason: connection.connectionReason,
        requestedAt: connection.requestedAt,
        approvedAt: connection.approvedAt,
        disconnectedAt: connection.disconnectedAt,
        lastBillingDate: connection.lastBillingDate,
        missedPaymentsCount: connection.missedPaymentsCount,
        bloodType: healthProfile?.bloodType,
        allergies: healthProfile?.allergies,
        chronicConditions: healthProfile?.chronicConditions,
        currentMedications: healthProfile?.currentMedications,
        emergencyContact: healthProfile?.emergencyContact,
        emergencyPhone: healthProfile?.emergencyPhone,
        height: healthProfile?.height,
        weight: healthProfile?.weight,
        organDonor: healthProfile?.organDonor
      });
    }
    return results;
  }
  async createInsuranceConnectionRequest(connection) {
    const id = connection.id || db.collection(COLLECTIONS.patientInsuranceConnections).doc().id;
    const insuranceConnection = {
      ...connection,
      id,
      requestedAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.patientInsuranceConnections).doc(id).set(insuranceConnection);
    return insuranceConnection;
  }
  async updateConnectionStatus(id, status, reviewedBy, rejectionReason) {
    const updateData = {
      status,
      rejectionReason: rejectionReason || null
    };
    if (status === "connected") {
      updateData.approvedAt = /* @__PURE__ */ new Date();
      updateData.lastBillingDate = /* @__PURE__ */ new Date();
    } else if (status === "disconnected") {
      updateData.disconnectedAt = /* @__PURE__ */ new Date();
    }
    if (reviewedBy) {
      updateData.reviewedBy = reviewedBy;
    }
    await db.collection(COLLECTIONS.patientInsuranceConnections).doc(id).update(updateData);
  }
  async updateConnectionBilling(id, lastBillingDate, missedPaymentsCount) {
    await db.collection(COLLECTIONS.patientInsuranceConnections).doc(id).update({
      lastBillingDate,
      missedPaymentsCount
    });
  }
  async disconnectInsurance(id) {
    await db.collection(COLLECTIONS.patientInsuranceConnections).doc(id).update({
      status: "disconnected",
      disconnectedAt: /* @__PURE__ */ new Date()
    });
  }
  // Claims
  async getClaims(params) {
    let query = db.collection(COLLECTIONS.claims);
    if (params.patientId) query = query.where("patient_id", "==", params.patientId);
    if (params.hospitalId) query = query.where("hospital_id", "==", params.hospitalId);
    if (params.connectionId) query = query.where("connection_id", "==", params.connectionId);
    const snapshot = await query.orderBy("submitted_at", "desc").get();
    const results = [];
    for (const doc of snapshot.docs) {
      const claim = doc.data();
      const hospital = await this.getUser(claim.hospitalId);
      results.push({
        ...claim,
        hospitalName: hospital?.hospitalName
      });
    }
    return results;
  }
  async createClaim(claim) {
    const id = claim.id || db.collection(COLLECTIONS.claims).doc().id;
    const newClaim = {
      ...claim,
      id,
      submittedAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.claims).doc(id).set(newClaim);
    return newClaim;
  }
  async updateClaimStatus(id, status, data) {
    await db.collection(COLLECTIONS.claims).doc(id).update({
      status,
      respondedAt: /* @__PURE__ */ new Date(),
      ...data
    });
  }
  async approveClaimByPatient(claimId, patientNote) {
    await db.collection(COLLECTIONS.claims).doc(claimId).update({
      status: "approved",
      respondedAt: /* @__PURE__ */ new Date(),
      patientNote: patientNote || null
    });
  }
  async rejectClaimByPatient(claimId, patientNote) {
    await db.collection(COLLECTIONS.claims).doc(claimId).update({
      status: "rejected",
      respondedAt: /* @__PURE__ */ new Date(),
      patientNote: patientNote || null
    });
  }
  // Audit Logs
  async getAuditLogs(userId) {
    let query = db.collection(COLLECTIONS.auditLogs);
    if (userId) {
      query = query.where("user_id", "==", userId);
    }
    const snapshot = await query.orderBy("timestamp", "desc").limit(1e3).get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async getUserAuditLogs(userId) {
    const snapshot = await db.collection(COLLECTIONS.auditLogs).where("user_id", "==", userId).orderBy("timestamp", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async createAuditLog(log2) {
    const id = log2.id || db.collection(COLLECTIONS.auditLogs).doc().id;
    const auditLog = {
      ...log2,
      id,
      timestamp: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.auditLogs).doc(id).set(auditLog);
    return auditLog;
  }
  // Emergency QR
  async getEmergencyQR(userId) {
    const snapshot = await db.collection(COLLECTIONS.emergencyQRCodes).where("user_id", "==", userId).limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async createEmergencyQR(qrData) {
    const existing = await this.getEmergencyQR(qrData.userId);
    if (existing) {
      await db.collection(COLLECTIONS.emergencyQRCodes).doc(existing.id).update({
        qrData: qrData.qrData,
        signedToken: qrData.signedToken,
        generatedAt: /* @__PURE__ */ new Date(),
        expiresAt: qrData.expiresAt
      });
      return {
        ...existing,
        qrData: qrData.qrData,
        signedToken: qrData.signedToken,
        generatedAt: /* @__PURE__ */ new Date(),
        expiresAt: qrData.expiresAt
      };
    }
    const id = qrData.id || db.collection(COLLECTIONS.emergencyQRCodes).doc().id;
    const emergencyQR = {
      ...qrData,
      id,
      generatedAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.emergencyQRCodes).doc(id).set(emergencyQR);
    return emergencyQR;
  }
  async incrementQRScanCount(userId) {
    const qr = await this.getEmergencyQR(userId);
    if (qr) {
      await db.collection(COLLECTIONS.emergencyQRCodes).doc(qr.id).update({
        scanCount: (qr.scanCount || 0) + 1
      });
    }
  }
  // Consultation Requests
  async getConsultationRequests(params) {
    let query = db.collection(COLLECTIONS.consultationRequests);
    if (params.patientId) query = query.where("patient_id", "==", params.patientId);
    if (params.doctorId) query = query.where("doctor_id", "==", params.doctorId);
    const snapshot = await query.orderBy("requested_at", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async createConsultationRequest(request) {
    const id = request.id || db.collection(COLLECTIONS.consultationRequests).doc().id;
    const consultationRequest = {
      ...request,
      id,
      requestedAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.consultationRequests).doc(id).set(consultationRequest);
    return consultationRequest;
  }
  async updateConsultationStatus(id, status, rejectionReason) {
    await db.collection(COLLECTIONS.consultationRequests).doc(id).update({
      status,
      respondedAt: /* @__PURE__ */ new Date(),
      rejectionReason: rejectionReason || null
    });
  }
  async getConsultationById(id) {
    const doc = await db.collection(COLLECTIONS.consultationRequests).doc(id).get();
    return doc.exists ? doc.data() : void 0;
  }
  // Chat Messages
  async getChatMessages(consultationId) {
    const snapshot = await db.collection(COLLECTIONS.chatMessages).where("consultation_id", "==", consultationId).orderBy("sent_at").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async createChatMessage(message) {
    const id = message.id || db.collection(COLLECTIONS.chatMessages).doc().id;
    const chatMessage = {
      ...message,
      id,
      sentAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.chatMessages).doc(id).set(chatMessage);
    return chatMessage;
  }
  async markMessagesAsRead(consultationId, receiverId) {
    const snapshot = await db.collection(COLLECTIONS.chatMessages).where("consultation_id", "==", consultationId).where("receiver_id", "==", receiverId).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();
  }
  async getUsersByHospital(hospitalName, role) {
    let query = db.collection(COLLECTIONS.users);
    const allUsersSnapshot = await query.get();
    let filtered = allUsersSnapshot.docs.map((doc) => doc.data()).filter((u) => u.hospitalName?.toLowerCase().includes(hospitalName.toLowerCase()));
    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }
    return filtered.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
  }
  async getUsersByKYCAffiliatedHospital(hospitalName, role) {
    const kycSnapshot = await db.collection(COLLECTIONS.kyc).where("affiliated_hospital", ">=", hospitalName).where("affiliated_hospital", "<=", hospitalName + "\uF8FF").get();
    const userIds = kycSnapshot.docs.map((doc) => doc.data().userId);
    const users = [];
    for (const userId of userIds) {
      const user = await this.getUser(userId);
      if (user && (!role || user.role === role)) {
        users.push(user);
      }
    }
    return users.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
  }
  async getUsersByRole(role) {
    const snapshot = await db.collection(COLLECTIONS.users).where("role", "==", role).orderBy("username").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  // Patient Admissions
  async getPatientAdmissions(params) {
    let query = db.collection(COLLECTIONS.patientAdmissions);
    if (params.patientId) query = query.where("patient_id", "==", params.patientId);
    if (params.hospitalId) query = query.where("hospital_id", "==", params.hospitalId);
    if (params.status) query = query.where("status", "==", params.status);
    const snapshot = await query.orderBy("admission_date", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
  async getCurrentAdmission(patientId, hospitalId) {
    const snapshot = await db.collection(COLLECTIONS.patientAdmissions).where("patient_id", "==", patientId).where("hospital_id", "==", hospitalId).where("status", "==", "admitted").limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async createPatientAdmission(admission) {
    const id = admission.id || db.collection(COLLECTIONS.patientAdmissions).doc().id;
    const patientAdmission = {
      ...admission,
      id,
      admissionDate: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.patientAdmissions).doc(id).set(patientAdmission);
    return patientAdmission;
  }
  async dischargePatient(id, dischargedById, dischargeNotes) {
    await db.collection(COLLECTIONS.patientAdmissions).doc(id).update({
      status: "discharged",
      dischargeDate: /* @__PURE__ */ new Date(),
      dischargedById,
      dischargeNotes: dischargeNotes || null
    });
  }
  async updatePatientAdmissionStatus(id, status) {
    await db.collection(COLLECTIONS.patientAdmissions).doc(id).update({ status });
  }
  // Subscription Payments
  async getSubscriptionPayment(userId, role) {
    const snapshot = await db.collection(COLLECTIONS.subscriptionPayments).where("user_id", "==", userId).where("role", "==", role).orderBy("paid_at", "desc").limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async getSubscriptionPaymentByTxHash(transactionHash) {
    const snapshot = await db.collection(COLLECTIONS.subscriptionPayments).where("transaction_hash", "==", transactionHash).limit(1).get();
    return snapshot.empty ? void 0 : snapshot.docs[0].data();
  }
  async createSubscriptionPayment(payment) {
    const id = payment.id || db.collection(COLLECTIONS.subscriptionPayments).doc().id;
    const subscriptionPayment = {
      ...payment,
      id,
      paidAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COLLECTIONS.subscriptionPayments).doc(id).set(subscriptionPayment);
    return subscriptionPayment;
  }
  async checkActiveSubscription(userId, role) {
    const snapshot = await db.collection(COLLECTIONS.subscriptionPayments).where("user_id", "==", userId).where("role", "==", role).where("status", "==", "confirmed").orderBy("paid_at", "desc").limit(1).get();
    if (snapshot.empty) return false;
    const payment = snapshot.docs[0].data();
    return /* @__PURE__ */ new Date() < new Date(payment.expiresAt);
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import CryptoJS2 from "crypto-js";
import { randomBytes } from "crypto";
import { z as z2 } from "zod";

// shared/schema.ts
import { z } from "zod";
var userSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  uid: z.string(),
  // Blockchain-style UID
  username: z.string(),
  email: z.string().optional(),
  role: z.enum(["patient", "doctor", "hospital", "emergency_responder", "insurance_provider", "admin"]).default("patient"),
  status: z.enum(["pending", "verified", "suspended", "deleted"]).default("pending"),
  suspendedUntil: z.date().optional(),
  // null = permanent suspension, date = temporary
  profilePicture: z.string().optional(),
  hospitalName: z.string().optional(),
  // Hospital name for hospitals, or affiliated hospital for doctors/emergency responders
  createdAt: z.date()
});
var kycSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string().optional(),
  nationalId: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  documentType: z.enum(["passport", "national_id", "drivers_license"]).optional(),
  documentNumber: z.string().optional(),
  documentCID: z.string().optional(),
  // IPFS CID (simulated)
  professionalLicense: z.string().optional(),
  // For doctors/hospitals
  institutionName: z.string().optional(),
  // For hospitals/insurance
  affiliatedHospital: z.string().optional(),
  // Hospital selection for patients/doctors
  country: z.string().optional(),
  // For hospital applications
  state: z.string().optional(),
  // For hospital applications
  location: z.string().optional(),
  // For hospital applications (address/location)
  hospitalProfile: z.string().optional(),
  // For hospital applications (description/details)
  requestedRole: z.enum(["doctor", "hospital", "emergency_responder", "insurance_provider"]).optional(),
  providerName: z.string().optional(),
  // For insurance provider applications
  providerDescription: z.string().optional(),
  // For insurance provider applications
  monthlyFee: z.number().optional(),
  // For insurance provider applications
  coverageLimit: z.number().optional(),
  // For insurance provider applications
  coverageTypes: z.array(z.string()).optional(),
  // For insurance provider applications
  submittedAt: z.date(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  rejectionReason: z.string().optional()
});
var insertKYCSchema = kycSchema.omit({ id: true, submittedAt: true, reviewedAt: true, reviewedBy: true });
var healthProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bloodType: z.string().optional(),
  // A+, A-, B+, B-, AB+, AB-, O+, O-
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  height: z.number().optional(),
  // in cm
  weight: z.number().optional(),
  // in kg
  organDonor: z.boolean().default(false),
  updatedAt: z.date()
});
var insertHealthProfileSchema = healthProfileSchema.omit({ id: true, updatedAt: true });
var medicalRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  recordType: z.enum(["lab_report", "prescription", "imaging", "diagnosis", "treatment_plan"]),
  fileCID: z.string(),
  // IPFS CID (simulated)
  fileHash: z.string(),
  // SHA-256 hash for integrity
  fileName: z.string().optional(),
  // Original file name
  fileType: z.string().optional(),
  // MIME type (application/pdf, etc.)
  fileData: z.string().optional(),
  // Base64 encoded file data
  isEmergency: z.boolean().default(false),
  // Flag for emergency access
  uploadedBy: z.string(),
  uploadedAt: z.date(),
  encryptionKey: z.string().optional()
  // Wrapped AES key (simulated)
});
var insertMedicalRecordSchema = medicalRecordSchema.omit({ id: true, uploadedAt: true });
var accessControlSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  requesterId: z.string(),
  recordId: z.string().optional(),
  accessType: z.enum(["full", "emergency_only", "specific_record"]),
  status: z.enum(["pending", "granted", "revoked", "expired"]).default("pending"),
  reason: z.string().optional(),
  isEmergency: z.boolean().default(false),
  // Flag for emergency access requests
  proofImage: z.string().optional(),
  // Base64 encoded proof image for emergency requests
  proofDetails: z.string().optional(),
  // Additional details/context for the request
  hospitalNotified: z.boolean().default(false),
  // Whether patient's hospital was notified
  requestedAt: z.date(),
  respondedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  encryptedKey: z.string().optional()
  // ECIES-wrapped key for this requester
});
var insertAccessControlSchema = accessControlSchema.omit({ id: true, requestedAt: true, respondedAt: true });
var treatmentLogSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  hospitalId: z.string().optional(),
  diagnosis: z.string(),
  treatment: z.string(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  treatmentDate: z.date(),
  recordCID: z.string().optional(),
  // IPFS CID for full record
  doctorSignature: z.string(),
  // EIP-712 signature
  signatureHash: z.string(),
  treatmentFiles: z.array(z.object({ name: z.string(), type: z.string(), data: z.string() })).optional(),
  // Array of file objects with {name, type, data (base64)}
  createdAt: z.date()
});
var insertTreatmentLogSchema = treatmentLogSchema.omit({ id: true, createdAt: true });
var insuranceProviderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  providerName: z.string(),
  description: z.string().optional(),
  monthlyFee: z.number(),
  coverageLimit: z.number().optional(),
  coverageTypes: z.array(z.string()).optional(),
  // emergency, outpatient, inpatient, surgery
  isActive: z.boolean().default(true),
  createdAt: z.date()
});
var insertInsuranceProviderSchema = insuranceProviderSchema.omit({ id: true, createdAt: true });
var patientInsuranceConnectionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  providerId: z.string(),
  status: z.enum(["pending", "connected", "disconnected"]).default("pending"),
  connectionReason: z.string().optional(),
  requestedAt: z.date(),
  approvedAt: z.date().optional(),
  disconnectedAt: z.date().optional(),
  lastBillingDate: z.date().optional(),
  missedPaymentsCount: z.number().default(0),
  reviewedBy: z.string().optional(),
  rejectionReason: z.string().optional()
});
var insertPatientInsuranceConnectionSchema = patientInsuranceConnectionSchema.omit({ id: true, requestedAt: true, approvedAt: true, disconnectedAt: true });
var claimSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  patientId: z.string(),
  treatmentLogId: z.string().optional(),
  hospitalId: z.string(),
  connectionId: z.string(),
  amount: z.number(),
  claimType: z.enum(["emergency", "outpatient", "inpatient", "surgery"]),
  treatmentDescription: z.string().optional(),
  invoiceCID: z.string(),
  invoiceSignature: z.string(),
  status: z.enum(["pending", "approved", "rejected", "paid"]).default("pending"),
  submittedAt: z.date(),
  respondedAt: z.date().optional(),
  patientNote: z.string().optional(),
  rejectionReason: z.string().optional(),
  paidAt: z.date().optional(),
  paidAmount: z.number().optional()
});
var insertClaimSchema = claimSchema.omit({ id: true, submittedAt: true, respondedAt: true, paidAt: true });
var auditLogSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  action: z.string(),
  // access_requested, access_granted, access_revoked, record_added, claim_submitted, claim_approved, etc.
  targetId: z.string().optional(),
  // ID of affected resource
  targetType: z.string().optional(),
  // user, record, claim, access
  metadata: z.record(z.any()).optional(),
  // Additional context
  ipAddress: z.string().optional(),
  timestamp: z.date()
});
var emergencyQRSchema = z.object({
  id: z.string(),
  userId: z.string(),
  qrData: z.string(),
  // JSON payload with emergency info
  signedToken: z.string(),
  // EIP-712 signature
  generatedAt: z.date(),
  expiresAt: z.date().optional(),
  scanCount: z.number().default(0)
});
var consultationRequestSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  hospitalName: z.string().optional(),
  reason: z.string(),
  status: z.enum(["pending", "accepted", "rejected", "completed"]).default("pending"),
  type: z.enum(["text", "video"]).default("text"),
  videoRoomId: z.string().optional(),
  // Jitsi Meet room ID for video consultations
  paymentPaid: z.boolean().default(false),
  paymentAmount: z.number().default(0),
  // in cents
  requestedAt: z.date(),
  respondedAt: z.date().optional(),
  rejectionReason: z.string().optional()
});
var insertConsultationRequestSchema = consultationRequestSchema.omit({ id: true, requestedAt: true, respondedAt: true });
var chatMessageSchema = z.object({
  id: z.string(),
  consultationId: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  message: z.string(),
  isRead: z.boolean().default(false),
  sentAt: z.date()
});
var insertChatMessageSchema = chatMessageSchema.omit({ id: true, sentAt: true });
var patientAdmissionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  hospitalId: z.string(),
  doctorId: z.string().optional(),
  // Doctor assigned to treat this patient
  admittedById: z.string().optional(),
  // Doctor or hospital staff who admitted
  dischargedById: z.string().optional(),
  // Doctor or hospital staff who discharged
  admissionDate: z.date(),
  dischargeDate: z.date().optional(),
  admissionReason: z.string().optional(),
  dischargeNotes: z.string().optional(),
  status: z.string().default("admitted"),
  // admitted, discharged, treated
  roomNumber: z.string().optional(),
  ward: z.string().optional()
});
var insertPatientAdmissionSchema = patientAdmissionSchema.omit({ id: true, admissionDate: true, dischargeDate: true });
var subscriptionPaymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  kycId: z.string().optional(),
  role: z.string(),
  // hospital or insurance_provider
  amount: z.number(),
  // 20 BDAG
  transactionHash: z.string(),
  fromAddress: z.string(),
  toAddress: z.string(),
  // Admin wallet address
  status: z.string().default("pending"),
  // pending, confirmed, failed
  paidAt: z.date(),
  expiresAt: z.date()
  // One year from payment
});
var insertSubscriptionPaymentSchema = subscriptionPaymentSchema.omit({ id: true, paidAt: true });

// server/ipfs.ts
import CryptoJS from "crypto-js";
var PinataService = class {
  constructor() {
    this.gatewayUrl = "https://gateway.pinata.cloud/ipfs/";
    this.apiKey = process.env.PINATA_API_KEY || "51c8d0ba96b549e4fa55";
    this.apiSecret = process.env.PINATA_API_SECRET || "96547ba0ec5c738d9ef4b5f70fbf886b6594bcba54fa30ba8d1ce816d6477087";
    this.jwt = process.env.PINATA_JWT || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwNWE1ZjdhMS0wNWQyLTRjOWEtOGU3OS03YThmYTI2NTVlMGEiLCJlbWFpbCI6ImZ1ZGl0ZXNncm91cEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNTFjOGQwYmE5NmI1NDllNGZhNTUiLCJzY29wZWRLZXlTZWNyZXQiOiI5NjU0N2JhMGVjNWM3MzhkOWVmNGI1ZjcwZmJmODg2YjY1OTRiY2JhNTRmYTMwYmE4ZDFjZTgxNmQ2NDc3MDg3IiwiZXhwIjoxNzkzNDI5MzE4fQ.pxFE2wzbv2DMzmxJmxqUC2n2iBz4gb4077dFy2oY0ls";
    if (!this.jwt) {
      console.warn("PINATA_JWT not configured. IPFS uploads will fail.");
    }
  }
  async uploadFile(fileData, fileName, metadata) {
    try {
      const fileHash = CryptoJS.SHA256(fileData).toString();
      let buffer;
      if (fileData.startsWith("data:")) {
        const base64Data = fileData.split(",")[1];
        buffer = Buffer.from(base64Data, "base64");
      } else {
        buffer = Buffer.from(fileData);
      }
      const FormData = (await import("form-data")).default;
      const formData = new FormData();
      formData.append("file", buffer, fileName);
      const pinataMetadata = {
        name: fileName,
        keyvalues: metadata || {}
      };
      formData.append("pinataMetadata", JSON.stringify(pinataMetadata));
      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.jwt}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata upload failed: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      return {
        cid: result.IpfsHash,
        hash: fileHash,
        url: `${this.gatewayUrl}${result.IpfsHash}`
      };
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async uploadJSON(data, fileName) {
    try {
      const jsonString = JSON.stringify(data);
      const fileHash = CryptoJS.SHA256(jsonString).toString();
      const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.jwt}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pinataContent: data,
          pinataMetadata: {
            name: fileName
          }
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata JSON upload failed: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      return {
        cid: result.IpfsHash,
        hash: fileHash,
        url: `${this.gatewayUrl}${result.IpfsHash}`
      };
    } catch (error) {
      console.error("Error uploading JSON to IPFS:", error);
      throw new Error(`Failed to upload JSON to IPFS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async getFile(cid) {
    try {
      const response = await fetch(`${this.gatewayUrl}${cid}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from IPFS: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error("Error fetching from IPFS:", error);
      throw new Error(`Failed to fetch file from IPFS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  getCIDUrl(cid) {
    return `${this.gatewayUrl}${cid}`;
  }
};
var ipfsService = new PinataService();

// server/routes.ts
var ADMIN_WALLET_ADDRESS = (process.env.ADMIN_WALLET_ADDRESS || "DXaaCk36zj1DisvdJCbR7wZpYRLReaAYYZx2jYKbneet").trim();
var admitPatientSchema = z2.object({
  patientId: z2.string().min(1, "Patient ID is required"),
  doctorId: z2.string().optional(),
  admissionReason: z2.string().min(1, "Admission reason is required"),
  roomNumber: z2.string().optional(),
  ward: z2.string().optional()
});
var dischargePatientSchema = z2.object({
  admissionId: z2.string().min(1, "Admission ID is required"),
  dischargeNotes: z2.string().optional()
});
async function generateUID() {
  let attempts = 0;
  const maxAttempts = 10;
  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 9e8) + 1e8;
    const uid = `HID${randomNum}`;
    const existing = await storage.getUserByUid(uid);
    if (!existing) {
      return uid;
    }
    attempts++;
  }
  return `HID${Date.now()}${Math.floor(Math.random() * 1e3)}`;
}
function generateClaimNumber() {
  return `CLM-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}
function generateFileHash(content) {
  return CryptoJS2.SHA256(content).toString();
}
async function uploadToIPFS(fileData, fileName, metadata) {
  try {
    return await ipfsService.uploadFile(fileData, fileName, metadata);
  } catch (error) {
    console.error("IPFS upload failed, using fallback:", error);
    const cid = `Qm${randomBytes(8).toString("hex")}`;
    const hash = generateFileHash(fileData);
    return { cid, hash, url: `https://gateway.pinata.cloud/ipfs/${cid}` };
  }
}
async function uploadJSONToIPFS(data, fileName) {
  try {
    return await ipfsService.uploadJSON(data, fileName);
  } catch (error) {
    console.error("IPFS JSON upload failed, using fallback:", error);
    const cid = `Qm${randomBytes(8).toString("hex")}`;
    const hash = generateFileHash(JSON.stringify(data));
    return { cid, hash, url: `https://gateway.pinata.cloud/ipfs/${cid}` };
  }
}
function getWalletAddress(req) {
  const walletAddress = req.headers["x-wallet-address"];
  if (!walletAddress || typeof walletAddress !== "string" || walletAddress.trim() === "") {
    return null;
  }
  return walletAddress.trim();
}
async function registerRoutes(app) {
  app.get("/api/public/hospitals", async (req, res) => {
    try {
      const allHospitals = await storage.getUsersByRole("hospital");
      const verified = allHospitals.filter((h) => h.status === "verified").map((h) => ({
        id: h.id,
        username: h.username,
        hospitalName: h.hospitalName || h.username,
        profilePicture: h.profilePicture
      }));
      res.json(verified);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hospitals" });
    }
  });
  app.post("/api/auth/connect", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      const normalizedWalletAddress = walletAddress.trim();
      const isAdmin = normalizedWalletAddress === ADMIN_WALLET_ADDRESS;
      let user = await storage.getUserByWalletAddress(normalizedWalletAddress);
      if (!user) {
        const uid = await generateUID();
        const username = `user_${normalizedWalletAddress.slice(0, 8)}`;
        user = await storage.createUser({
          walletAddress: normalizedWalletAddress,
          uid,
          username,
          role: isAdmin ? "admin" : "patient",
          status: isAdmin ? "verified" : "pending"
        });
        await storage.createAuditLog({
          userId: user.id,
          action: "user_registered",
          targetType: "user",
          targetId: user.id,
          metadata: { walletAddress: normalizedWalletAddress, isAdmin }
        });
      } else if (isAdmin && user.role !== "admin") {
        await storage.updateUserRole(user.id, "admin");
        await storage.updateUserStatus(user.id, "verified");
        user = { ...user, role: "admin", status: "verified" };
      }
      res.json({
        uid: user.uid,
        role: user.role,
        status: user.status,
        suspendedUntil: user.suspendedUntil ?? null
      });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });
  app.get("/api/patient/kyc", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const kycData = await storage.getKYC(user.id);
      res.json(kycData);
    } catch (error) {
      console.error("Failed to fetch KYC:", error);
      res.status(500).json({ error: "Failed to fetch KYC" });
    }
  });
  app.post("/api/patient/kyc", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const kycDocumentData = {
        ...req.body,
        userId: user.id,
        walletAddress: user.walletAddress,
        submittedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { cid: documentCID } = await uploadJSONToIPFS(
        kycDocumentData,
        `kyc_${user.uid}_${Date.now()}.json`
      );
      const kycData = await storage.createKYC({
        userId: user.id,
        ...req.body,
        documentCID,
        status: "pending"
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "kyc_submitted",
        targetType: "kyc",
        targetId: kycData.id,
        metadata: { documentCID }
      });
      res.json(kycData);
    } catch (error) {
      console.error("KYC submission error:", error);
      res.status(500).json({ error: "Failed to submit KYC" });
    }
  });
  app.get("/api/user/health-profile", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const profile = await storage.getHealthProfile(user.id);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
  app.put("/api/user/health-profile", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const existing = await storage.getHealthProfile(user.id);
      if (existing) {
        await storage.updateHealthProfile(user.id, req.body);
      } else {
        await storage.createHealthProfile({
          userId: user.id,
          ...req.body
        });
      }
      await storage.createAuditLog({
        userId: user.id,
        action: "profile_updated",
        targetType: "profile"
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  app.get("/api/patient/profile", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const profile = await storage.getHealthProfile(user.id);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
  app.put("/api/patient/profile", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const existing = await storage.getHealthProfile(user.id);
      if (existing) {
        await storage.updateHealthProfile(user.id, req.body);
      } else {
        await storage.createHealthProfile({
          userId: user.id,
          ...req.body
        });
      }
      await storage.createAuditLog({
        userId: user.id,
        action: "profile_updated",
        targetType: "profile"
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  app.get("/api/user/profile", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });
  app.put("/api/user/profile", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const allowedFields = user.role === "hospital" ? ["username", "email"] : ["username", "email", "hospitalName"];
      const updateData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== void 0) {
          updateData[field] = req.body[field];
        }
      }
      if (Object.keys(updateData).length > 0) {
        await storage.updateUserInfo(user.id, updateData);
      }
      await storage.createAuditLog({
        userId: user.id,
        action: "user_profile_updated",
        targetType: "user",
        targetId: user.id
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });
  app.post("/api/user/profile-picture", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { profilePicture } = req.body;
      if (!profilePicture || typeof profilePicture !== "string") {
        return res.status(400).json({ error: "Profile picture is required and must be a string (base64 or URL)" });
      }
      if (profilePicture.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Profile picture size exceeds 10MB limit" });
      }
      await storage.updateUserProfilePicture(user.id, profilePicture);
      await storage.createAuditLog({
        userId: user.id,
        action: "profile_picture_updated",
        targetType: "user",
        targetId: user.id
      });
      res.json({ success: true, profilePicture });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  });
  app.post("/api/patient/profile-picture", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { profilePicture } = req.body;
      if (!profilePicture || typeof profilePicture !== "string") {
        return res.status(400).json({ error: "Profile picture is required and must be a string (base64 or URL)" });
      }
      if (profilePicture.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Profile picture size exceeds 10MB limit" });
      }
      await storage.updateUserProfilePicture(user.id, profilePicture);
      await storage.createAuditLog({
        userId: user.id,
        action: "profile_picture_updated",
        targetType: "user",
        targetId: user.id
      });
      res.json({ success: true, profilePicture });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  });
  app.get("/api/patient/records", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const records = await storage.getMedicalRecords(user.id);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch records" });
    }
  });
  app.post("/api/patient/records", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      let fileCID;
      let fileHash;
      if (req.body.fileData) {
        const fileName = req.body.fileName || `medical_record_${Date.now()}`;
        const ipfsResult = await uploadToIPFS(
          req.body.fileData,
          fileName,
          {
            userId: user.id,
            recordType: req.body.recordType,
            uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        );
        fileCID = ipfsResult.cid;
        fileHash = ipfsResult.hash;
      } else {
        const recordData = JSON.stringify(req.body);
        fileHash = generateFileHash(recordData);
        fileCID = `metadata_${fileHash.substring(0, 16)}`;
      }
      const encryptionKey = CryptoJS2.lib.WordArray.random(32).toString();
      const record = await storage.createMedicalRecord({
        userId: user.id,
        uploadedBy: user.id,
        fileCID,
        fileHash,
        encryptionKey,
        ...req.body
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "record_added",
        targetType: "record",
        targetId: record.id,
        metadata: { recordType: req.body.recordType, fileCID }
      });
      res.json(record);
    } catch (error) {
      console.error("Medical record upload error:", error);
      res.status(500).json({ error: "Failed to upload record" });
    }
  });
  app.get("/api/patient/qr", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const qr = await storage.getEmergencyQR(user.id);
      res.json(qr);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch QR" });
    }
  });
  app.post("/api/user/qr", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const healthProfile = await storage.getHealthProfile(user.id);
      const kycData = await storage.getKYC(user.id);
      const qrData = JSON.stringify({
        username: user.username,
        uid: user.uid,
        walletAddress: user.walletAddress,
        role: user.role,
        hospitalName: user.hospitalName || kycData?.institutionName || null,
        emergencyDetails: healthProfile ? {
          bloodType: healthProfile.bloodType,
          allergies: healthProfile.allergies,
          chronicConditions: healthProfile.chronicConditions,
          currentMedications: healthProfile.currentMedications,
          emergencyContact: healthProfile.emergencyContact,
          emergencyPhone: healthProfile.emergencyPhone
        } : null,
        timestamp: Date.now()
      });
      const qr = await storage.createEmergencyQR({
        userId: user.id,
        qrData,
        signedToken: req.body.signature || "simulated_signature"
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "qr_generated",
        targetType: "qr",
        targetId: qr.id
      });
      res.json(qr);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate QR" });
    }
  });
  app.post("/api/patient/qr", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const healthProfile = await storage.getHealthProfile(user.id);
      const kycData = await storage.getKYC(user.id);
      const qrData = JSON.stringify({
        username: user.username,
        uid: user.uid,
        walletAddress: user.walletAddress,
        role: user.role,
        hospitalName: user.hospitalName || kycData?.institutionName || null,
        emergencyDetails: healthProfile ? {
          bloodType: healthProfile.bloodType,
          allergies: healthProfile.allergies,
          chronicConditions: healthProfile.chronicConditions,
          currentMedications: healthProfile.currentMedications,
          emergencyContact: healthProfile.emergencyContact,
          emergencyPhone: healthProfile.emergencyPhone
        } : null,
        timestamp: Date.now()
      });
      const qr = await storage.createEmergencyQR({
        userId: user.id,
        qrData,
        signedToken: req.body.signature || "simulated_signature"
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "qr_generated",
        targetType: "qr",
        targetId: qr.id
      });
      res.json(qr);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate QR" });
    }
  });
  app.get("/api/patient/access-requests", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const requests = await storage.getAccessRequests(user.id);
      const enriched = await Promise.all(requests.map(async (req2) => {
        const requester = await storage.getUser(req2.requesterId);
        return {
          ...req2,
          requesterName: requester?.username,
          requesterRole: requester?.role
        };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch access requests" });
    }
  });
  app.get("/api/patient/access-granted", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const granted = await storage.getGrantedAccess(user.id);
      const enriched = await Promise.all(granted.map(async (acc) => {
        const requester = await storage.getUser(acc.requesterId);
        return {
          ...acc,
          requesterName: requester?.username,
          requesterRole: requester?.role
        };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch granted access" });
    }
  });
  app.post("/api/patient/access-requests/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[Approve Access] Approving access request ${id}, setting status to 'granted'`);
      await storage.updateAccessStatus(id, "granted");
      await storage.createAuditLog({
        action: "access_granted",
        targetType: "access",
        targetId: id
      });
      console.log(`[Approve Access] Successfully approved access request ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("[Approve Access] Error approving access:", error);
      res.status(500).json({ error: "Failed to approve access" });
    }
  });
  app.post("/api/patient/access-requests/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.updateAccessStatus(id, "rejected");
      await storage.createAuditLog({
        action: "access_rejected",
        targetType: "access",
        targetId: id
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject access" });
    }
  });
  app.post("/api/patient/access/:id/revoke", async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const patient = await storage.getUserByWalletAddress(walletAddress);
      if (!patient) return res.status(404).json({ error: "User not found" });
      if (patient.role !== "patient") return res.status(403).json({ error: "Only patients can revoke access" });
      const grantedList = await storage.getGrantedAccess(patient.id);
      const accessRecord = grantedList.find((a) => a.id === id);
      if (!accessRecord) {
        return res.status(403).json({ error: "Access record not found or you do not have permission to revoke it" });
      }
      await storage.updateAccessStatus(id, "revoked");
      await storage.createAuditLog({
        userId: patient.id,
        action: "access_revoked",
        targetType: "access",
        targetId: id
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke access" });
    }
  });
  app.get("/api/patient/insurance", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const connections = await storage.getPatientInsuranceConnections(user.id);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch insurance connections" });
    }
  });
  app.get("/api/patient/claims", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const claims = await storage.getClaims({ patientId: user.id });
      res.json(claims);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claims" });
    }
  });
  app.post("/api/patient/claims/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      await storage.approveClaimByPatient(id, note);
      await storage.createAuditLog({
        userId: user.id,
        action: "claim_approved_by_patient",
        targetType: "claim",
        targetId: id,
        metadata: { note }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve claim" });
    }
  });
  app.post("/api/patient/claims/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      await storage.rejectClaimByPatient(id, note);
      await storage.createAuditLog({
        userId: user.id,
        action: "claim_rejected_by_patient",
        targetType: "claim",
        targetId: id,
        metadata: { note }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject claim" });
    }
  });
  app.get("/api/patient/audit-logs", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const logs = await storage.getAuditLogs(user.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });
  app.post("/api/patient/subscription-payment", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      if (!walletAddress) {
        console.error("[Subscription Payment] No wallet address provided");
        return res.status(400).json({ error: "Wallet address is required" });
      }
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        console.error("[Subscription Payment] User not found for wallet:", walletAddress);
        return res.status(404).json({ error: "User not found" });
      }
      const { transactionHash, role, amount } = req.body;
      console.log("[Subscription Payment] Processing payment:", {
        userId: user.id,
        role,
        amount,
        txHashLength: transactionHash?.length
      });
      if (!transactionHash || !role) {
        console.error("[Subscription Payment] Missing required fields:", { transactionHash: !!transactionHash, role: !!role });
        return res.status(400).json({ error: "Transaction hash and role are required" });
      }
      if (role !== "hospital" && role !== "insurance_provider") {
        return res.status(400).json({ error: "Subscription payment is only required for hospital and insurance provider applications" });
      }
      const existing = await storage.getSubscriptionPaymentByTxHash(transactionHash);
      if (existing) {
        console.error("[Subscription Payment] Duplicate transaction hash:", transactionHash);
        return res.status(400).json({ error: "Transaction already recorded" });
      }
      const isEthereumHash = /^0x[a-fA-F0-9]{64}$/.test(transactionHash);
      const isSolanaSignatureReference = /^sig_[A-Za-z0-9_-]{64,128}$/.test(transactionHash);
      if (!isEthereumHash && !isSolanaSignatureReference) {
        console.error("[Subscription Payment] Invalid transaction hash format:", {
          length: transactionHash.length,
          prefix: transactionHash.slice(0, 4)
        });
        return res.status(400).json({ error: "Invalid payment authorization format" });
      }
      const oneYearFromNow = /* @__PURE__ */ new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      const paymentData = {
        userId: user.id,
        kycId: null,
        role,
        amount: amount || "20",
        transactionHash,
        fromAddress: walletAddress.trim(),
        toAddress: ADMIN_WALLET_ADDRESS,
        status: "confirmed",
        expiresAt: oneYearFromNow
      };
      console.log("[Subscription Payment] Creating payment record:", paymentData);
      const payment = await storage.createSubscriptionPayment(paymentData);
      console.log("[Subscription Payment] Payment created successfully:", payment.id);
      await storage.createAuditLog({
        userId: user.id,
        action: "subscription_payment_made",
        targetType: "payment",
        metadata: { role, amount: amount || "20", transactionHash }
      });
      res.json({ success: true, expiresAt: oneYearFromNow });
    } catch (error) {
      console.error("[Subscription Payment] ERROR:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail
      });
      res.status(500).json({
        error: "Failed to process subscription payment",
        details: process.env.NODE_ENV === "development" ? error.message : void 0
      });
    }
  });
  app.post("/api/patient/apply-role", async (req, res) => {
    try {
      const walletAddress = getWalletAddress(req);
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const requestedRole = req.body.role;
      if (requestedRole === "hospital" || requestedRole === "insurance_provider") {
        const hasActiveSubscription = await storage.checkActiveSubscription(user.id, requestedRole);
        if (!hasActiveSubscription) {
          return res.status(402).json({
            error: "Subscription payment required",
            message: "Please complete the annual subscription payment via Phantom wallet before submitting your application"
          });
        }
      }
      const kycData = await storage.createKYC({
        userId: user.id,
        fullName: req.body.fullName || `${req.body.role} Application`,
        professionalLicense: req.body.professionalLicense || "",
        institutionName: req.body.institutionName || "",
        affiliatedHospital: req.body.affiliatedHospital || req.body.selectedHospital || "",
        country: req.body.country || "",
        state: req.body.state || "",
        location: req.body.location || "",
        hospitalProfile: req.body.hospitalProfile || "",
        providerName: req.body.providerName || "",
        providerDescription: req.body.providerDescription || "",
        monthlyFee: req.body.monthlyFee || null,
        coverageLimit: req.body.coverageLimit || null,
        coverageTypes: req.body.coverageTypes || [],
        requestedRole: req.body.role,
        status: "pending"
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "role_application_submitted",
        targetType: "user",
        targetId: user.id,
        metadata: { requestedRole: req.body.role }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Apply role error:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  });
  app.get("/api/user/me", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        id: user.id,
        uid: user.uid,
        username: user.username,
        walletAddress: user.walletAddress,
        role: user.role,
        status: user.status,
        suspendedUntil: user.suspendedUntil ?? null,
        profilePicture: user.profilePicture,
        hospitalName: user.hospitalName
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
  app.put("/api/user/info", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { username, hospitalName } = req.body;
      const updateData = {};
      if (username) updateData.username = username;
      if (hospitalName !== void 0) updateData.hospitalName = hospitalName;
      await storage.updateUserInfo(user.id, updateData);
      await storage.createAuditLog({
        userId: user.id,
        action: "user_info_updated",
        targetType: "user",
        targetId: user.id
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user info" });
    }
  });
  app.get("/api/user/qr", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const qr = await storage.getEmergencyQR(user.id);
      res.json(qr);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch QR" });
    }
  });
  app.post("/api/user/request-access", async (req, res) => {
    try {
      const { patientId, reason, isEmergency, proofImage, proofDetails } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      console.log("[Request Access] Received request:", { patientId, reason, isEmergency, walletAddress });
      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }
      if (!walletAddress) {
        return res.status(401).json({ error: "Wallet address required" });
      }
      const requester = await storage.getUserByWalletAddress(walletAddress);
      console.log("[Request Access] Requester:", requester?.id, requester?.role);
      if (!requester) return res.status(404).json({ error: "Requester not found" });
      const patient = await storage.getUser(patientId);
      console.log("[Request Access] Patient:", patient?.id, patient?.username);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const shouldNotifyHospital = !!(isEmergency && patient.hospitalName);
      console.log("[Request Access] Hospital notification check:", { isEmergency, hospitalName: patient.hospitalName, shouldNotifyHospital, type: typeof shouldNotifyHospital });
      const accessData = {
        patientId,
        requesterId: requester.id,
        accessType: isEmergency ? "emergency_only" : "full",
        reason,
        status: "pending",
        isEmergency: isEmergency || false,
        proofImage: proofImage || null,
        proofDetails: proofDetails || null,
        hospitalNotified: shouldNotifyHospital || false
      };
      console.log("[Request Access] Access data being sent to DB:", JSON.stringify(accessData, null, 2));
      const accessRequest = await storage.createAccessRequest(accessData);
      console.log("[Request Access] Created access request:", accessRequest.id);
      await storage.createAuditLog({
        userId: requester.id,
        action: isEmergency ? "emergency_access_requested" : "access_requested",
        targetType: "access",
        targetId: accessRequest.id,
        metadata: { patientId, reason, isEmergency, hospitalNotified: shouldNotifyHospital }
      });
      if (shouldNotifyHospital) {
        await storage.createAuditLog({
          userId: requester.id,
          action: "hospital_notified_emergency",
          targetType: "access",
          targetId: accessRequest.id,
          metadata: {
            patientId,
            requesterId: requester.id,
            hospitalName: patient.hospitalName
          }
        });
      }
      res.json(accessRequest);
    } catch (error) {
      console.error("[Request Access Error]", error);
      console.error("[Request Access Error Stack]", error.stack);
      res.status(500).json({ error: error.message || "Failed to request access" });
    }
  });
  app.get("/api/doctor/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: "Search query is required" });
      }
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      let patient = await storage.getUserByUid(query.trim());
      if (!patient) {
        patient = await storage.getUserByUsername(query.trim());
      }
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (patient.role !== "patient") {
        return res.status(400).json({ error: "Can only search for patients" });
      }
      const records = await storage.getMedicalRecords(patient.id);
      const hasAccess = await storage.checkAccess(patient.id, doctor.id);
      res.json({
        id: patient.id,
        username: patient.username,
        uid: patient.uid,
        status: patient.status,
        recordCount: records.length,
        hasAccess
      });
    } catch (error) {
      console.error("Doctor search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });
  app.post("/api/doctor/request-access", async (req, res) => {
    try {
      const { patientId, reason } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      const accessRequest = await storage.createAccessRequest({
        patientId,
        requesterId: doctor.id,
        accessType: "full",
        reason,
        status: "pending"
      });
      await storage.createAuditLog({
        userId: doctor.id,
        action: "access_requested",
        targetType: "access",
        targetId: accessRequest.id,
        metadata: { patientId, reason }
      });
      res.json(accessRequest);
    } catch (error) {
      res.status(500).json({ error: "Failed to request access" });
    }
  });
  app.get("/api/doctor/access-requests", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      const requests = await storage.getAccessRequestsByRequester(doctor.id);
      const enriched = await Promise.all(requests.map(async (req2) => {
        const patient = await storage.getUser(req2.patientId);
        return {
          ...req2,
          patientUid: patient?.uid,
          patientUsername: patient?.username
        };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch access requests" });
    }
  });
  app.get("/api/doctor/treatments", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      const treatments = await storage.getTreatmentLogs(void 0, doctor.id);
      res.json(treatments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch treatments" });
    }
  });
  app.post("/api/doctor/treatments", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      if (doctor.role !== "doctor") {
        return res.status(403).json({ error: "Only doctors can create treatment logs" });
      }
      const treatmentSchema = z2.object({
        patientId: z2.string().min(1, "Patient ID is required"),
        hospitalId: z2.string().optional(),
        diagnosis: z2.string().min(1, "Diagnosis is required"),
        treatment: z2.string().min(1, "Treatment is required"),
        prescription: z2.string().optional(),
        notes: z2.string().optional(),
        treatmentDate: z2.coerce.date(),
        treatmentFiles: z2.array(z2.object({
          name: z2.string().max(255, "File name too long"),
          type: z2.string().refine((type) => {
            const allowedTypes = [
              "application/pdf",
              "image/jpeg",
              "image/jpg",
              "image/png",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ];
            return allowedTypes.includes(type);
          }, "Invalid file type. Only PDF, JPG, PNG, DOC, and DOCX are allowed"),
          data: z2.string().refine((data) => {
            if (!data.startsWith("data:")) return false;
            const sizeInBytes = Math.ceil((data.length - data.indexOf(",") - 1) * 0.75);
            return sizeInBytes <= 10 * 1024 * 1024;
          }, "File size exceeds 10MB limit")
        })).max(5, "Maximum 5 files allowed").optional()
      });
      const validatedData = treatmentSchema.parse(req.body);
      let patient = await storage.getUser(validatedData.patientId);
      if (!patient) {
        patient = await storage.getUserByUid(validatedData.patientId);
      }
      if (!patient) {
        patient = await storage.getUserByUsername(validatedData.patientId);
      }
      if (!patient) {
        return res.status(404).json({ error: "Patient not found. Please provide a valid Patient ID, UID, or username." });
      }
      if (patient.role !== "patient") {
        return res.status(400).json({ error: "Can only create treatment logs for patients" });
      }
      const hasAccess = await storage.checkAccess(patient.id, doctor.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You don't have permission to create treatment logs for this patient." });
      }
      let hospitalId = null;
      if (validatedData.hospitalId) {
        let hospital = await storage.getUser(validatedData.hospitalId);
        if (!hospital) {
          hospital = await storage.getUserByUid(validatedData.hospitalId);
        }
        if (!hospital) {
          hospital = await storage.getUserByUsername(validatedData.hospitalId);
        }
        if (hospital) {
          if (hospital.role !== "hospital") {
            return res.status(400).json({ error: "Invalid hospital ID - must be a hospital user" });
          }
          hospitalId = hospital.id;
        }
      }
      if (!hospitalId) {
        const allAdmissions = await storage.getPatientAdmissions({});
        const patientAdmissions = allAdmissions.filter(
          (a) => a.patientId === patient.id && a.doctorId === doctor.id && (a.status === "admitted" || a.status === "treated")
        );
        if (patientAdmissions.length > 0) {
          const latestAdmission = patientAdmissions.sort(
            (a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()
          )[0];
          hospitalId = latestAdmission.hospitalId;
        }
      }
      const signatureData = `${patient.id}-${validatedData.treatmentDate.toISOString()}-${validatedData.diagnosis}`;
      const doctorSignature = CryptoJS2.HmacSHA256(signatureData, doctor.walletAddress).toString();
      const signatureHash = CryptoJS2.SHA256(doctorSignature).toString();
      const treatmentData = {
        patientId: patient.id,
        doctorId: doctor.id,
        hospitalId,
        diagnosis: validatedData.diagnosis,
        treatment: validatedData.treatment,
        prescription: validatedData.prescription || null,
        notes: validatedData.notes || null,
        treatmentDate: validatedData.treatmentDate.toISOString(),
        doctorSignature,
        signatureHash,
        treatmentFiles: validatedData.treatmentFiles || null
      };
      const { cid: recordCID } = await uploadJSONToIPFS(
        treatmentData,
        `treatment_${patient.uid}_${Date.now()}.json`
      );
      const treatmentLog = await storage.createTreatmentLog({
        patientId: patient.id,
        doctorId: doctor.id,
        hospitalId,
        diagnosis: validatedData.diagnosis,
        treatment: validatedData.treatment,
        prescription: validatedData.prescription || null,
        notes: validatedData.notes || null,
        treatmentDate: validatedData.treatmentDate,
        recordCID,
        doctorSignature,
        signatureHash,
        treatmentFiles: validatedData.treatmentFiles || null
      });
      const medicalRecordTitle = `Treatment: ${validatedData.diagnosis}`;
      const medicalRecordDescription = `${validatedData.treatment}${validatedData.prescription ? `
Prescription: ${validatedData.prescription}` : ""}${validatedData.notes ? `
Notes: ${validatedData.notes}` : ""}`;
      const medicalRecordData = {
        userId: patient.id,
        title: medicalRecordTitle,
        description: medicalRecordDescription,
        recordType: "treatment",
        fileCID: recordCID,
        fileHash: signatureHash,
        fileName: null,
        fileType: null,
        fileData: null,
        isEmergency: false,
        uploadedBy: doctor.id,
        encryptionKey: null
      };
      await storage.createMedicalRecord(medicalRecordData);
      if (hospitalId) {
        const currentAdmission = await storage.getCurrentAdmission(patient.id, hospitalId);
        if (currentAdmission && currentAdmission.status === "admitted") {
          await storage.updatePatientAdmissionStatus(currentAdmission.id, "treated");
        }
      }
      await storage.createAuditLog({
        userId: doctor.id,
        action: "doctor_treatment_created",
        targetType: "treatment",
        targetId: treatmentLog.id,
        metadata: { patientId: patient.id, diagnosis: validatedData.diagnosis }
      });
      res.status(201).json(treatmentLog);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.error("Treatment validation error:", error.errors);
        return res.status(400).json({ error: "Invalid treatment data", details: error.errors });
      }
      console.error("Treatment creation error:", error);
      res.status(500).json({ error: "Failed to create treatment log" });
    }
  });
  app.get("/api/doctor/patients", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      const accessRequests = await storage.getAccessRequestsByRequester(doctor.id);
      console.log(`[Doctor Patients] Doctor ${doctor.id} has ${accessRequests.length} total access requests`);
      console.log(`[Doctor Patients] Access request statuses:`, accessRequests.map((req2) => req2.status));
      const grantedAccess = accessRequests.filter((req2) => req2.status === "granted");
      console.log(`[Doctor Patients] Found ${grantedAccess.length} granted access requests`);
      const assignedAdmissions = await storage.getPatientAdmissions({});
      const doctorAdmissions = assignedAdmissions.filter((admission) => admission.doctorId === doctor.id);
      const patientMap = /* @__PURE__ */ new Map();
      for (const access of grantedAccess) {
        const patient = await storage.getUser(access.patientId);
        const records = await storage.getMedicalRecords(access.patientId);
        const treatments = await storage.getTreatmentLogs(access.patientId, doctor.id);
        const admission = doctorAdmissions.find((a) => a.patientId === access.patientId);
        patientMap.set(access.patientId, {
          id: patient?.id,
          uid: patient?.uid,
          username: patient?.username,
          status: patient?.status,
          profilePicture: patient?.profilePicture,
          accessGrantedAt: access.respondedAt,
          accessType: access.accessType,
          recordCount: records.length,
          treatmentCount: treatments.length,
          admissionStatus: admission?.status,
          isAssigned: !!admission
        });
      }
      for (const admission of doctorAdmissions) {
        if (!patientMap.has(admission.patientId)) {
          const patient = await storage.getUser(admission.patientId);
          const records = await storage.getMedicalRecords(admission.patientId);
          const treatments = await storage.getTreatmentLogs(admission.patientId, doctor.id);
          patientMap.set(admission.patientId, {
            id: patient?.id,
            uid: patient?.uid,
            username: patient?.username,
            status: patient?.status,
            profilePicture: patient?.profilePicture,
            recordCount: records.length,
            treatmentCount: treatments.length,
            admissionStatus: admission.status,
            isAssigned: true
          });
        }
      }
      res.json(Array.from(patientMap.values()));
    } catch (error) {
      console.error("Failed to fetch doctor's patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });
  app.get("/api/doctor/patient/:patientId/records", async (req, res) => {
    try {
      const { patientId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      const hasAccess = await storage.checkAccess(patientId, doctor.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You don't have permission to view this patient's records." });
      }
      const records = await storage.getMedicalRecords(patientId);
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch patient records:", error);
      res.status(500).json({ error: "Failed to fetch records" });
    }
  });
  app.get("/api/doctor/patient/:patientId/profile", async (req, res) => {
    try {
      const { patientId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      const hasAccess = await storage.checkAccess(patientId, doctor.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You don't have permission to view this patient's profile." });
      }
      const patient = await storage.getUser(patientId);
      const profile = await storage.getHealthProfile(patientId);
      res.json({
        ...patient,
        healthProfile: profile
      });
    } catch (error) {
      console.error("Failed to fetch patient profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
  app.get("/api/hospital/claims", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      const claims = await storage.getClaims({ hospitalId: hospital.id });
      res.json(claims);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claims" });
    }
  });
  app.get("/api/hospital/patients/:patientId/insurance", async (req, res) => {
    try {
      const { patientId } = req.params;
      console.log("[Insurance Lookup] Received patient ID:", patientId);
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      if (hospital.role !== "hospital") {
        return res.status(403).json({ error: "Only hospitals can access this endpoint" });
      }
      const patient = await storage.getUser(patientId);
      console.log("[Insurance Lookup] Patient found:", patient ? { id: patient.id, uid: patient.uid, username: patient.username } : "Not found");
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const connections = await storage.getPatientInsuranceConnections(patient.id);
      console.log("[Insurance Lookup] Found connections:", connections.length, "connections");
      console.log("[Insurance Lookup] Connection details:", connections.map((c) => ({
        id: c.id,
        status: c.status,
        providerName: c.providerName
      })));
      res.json(connections);
    } catch (error) {
      console.error("Error fetching patient insurance:", error);
      res.status(500).json({ error: "Failed to fetch patient insurance connections" });
    }
  });
  app.post("/api/hospital/claims", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      if (hospital.role !== "hospital") {
        return res.status(403).json({ error: "Only hospitals can submit claims" });
      }
      const claimSchema2 = insertClaimSchema.omit({ id: true, hospitalId: true, treatmentLogId: true, claimNumber: true });
      const validatedData = claimSchema2.parse(req.body);
      const claimNumber = generateClaimNumber();
      const patient = await storage.getUser(validatedData.patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const connections = await storage.getPatientInsuranceConnections(patient.id);
      const connection = connections.find((c) => c.id === validatedData.connectionId);
      if (!connection) {
        return res.status(400).json({ error: "Invalid insurance connection. The patient is not connected to this insurance provider." });
      }
      if (connection.status !== "connected") {
        return res.status(400).json({ error: "Insurance connection is not active" });
      }
      const claim = await storage.createClaim({
        ...validatedData,
        claimNumber,
        patientId: patient.id,
        hospitalId: hospital.id,
        status: "pending"
      });
      res.status(201).json(claim);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.error("Claim validation error:", error.errors);
        return res.status(400).json({ error: "Invalid claim data", details: error.errors });
      }
      console.error("Claim submission error:", error);
      res.status(500).json({ error: "Failed to submit claim" });
    }
  });
  app.post("/api/hospital/treatments", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      if (hospital.role !== "hospital") {
        return res.status(403).json({ error: "Only hospitals can create treatment logs" });
      }
      const treatmentSchema = z2.object({
        patientId: z2.string().min(1, "Patient ID is required"),
        doctorId: z2.string().optional(),
        diagnosis: z2.string().min(1, "Diagnosis is required"),
        treatment: z2.string().min(1, "Treatment is required"),
        prescription: z2.string().optional(),
        notes: z2.string().optional(),
        treatmentDate: z2.coerce.date()
      });
      const validatedData = treatmentSchema.parse(req.body);
      let patient = await storage.getUser(validatedData.patientId);
      if (!patient) {
        patient = await storage.getUserByUid(validatedData.patientId);
      }
      if (!patient) {
        patient = await storage.getUserByUsername(validatedData.patientId);
      }
      if (!patient) {
        return res.status(404).json({ error: "Patient not found. Please provide a valid Patient ID, UID, or username." });
      }
      if (patient.role !== "patient") {
        return res.status(400).json({ error: "Can only create treatment logs for patients" });
      }
      const hasAccess = await storage.checkAccess(patient.id, hospital.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You don't have permission to create treatment logs for this patient." });
      }
      let doctor = null;
      if (validatedData.doctorId) {
        doctor = await storage.getUser(validatedData.doctorId);
        if (!doctor) {
          doctor = await storage.getUserByUid(validatedData.doctorId);
        }
        if (!doctor) {
          doctor = await storage.getUserByUsername(validatedData.doctorId);
        }
        if (!doctor || doctor.role !== "doctor") {
          return res.status(400).json({ error: "Invalid doctor ID" });
        }
        if (doctor.hospitalName !== hospital.hospitalName) {
          return res.status(403).json({ error: "Doctor must be affiliated with this hospital" });
        }
      }
      const signatureData = `${patient.id}-${validatedData.treatmentDate.toISOString()}-${validatedData.diagnosis}`;
      const signatureKey = doctor?.walletAddress || hospital.walletAddress;
      const doctorSignature = CryptoJS2.HmacSHA256(signatureData, signatureKey).toString();
      const signatureHash = CryptoJS2.SHA256(doctorSignature).toString();
      const treatmentData = {
        patientId: patient.id,
        doctorId: doctor?.id || hospital.id,
        hospitalId: hospital.id,
        diagnosis: validatedData.diagnosis,
        treatment: validatedData.treatment,
        prescription: validatedData.prescription || null,
        notes: validatedData.notes || null,
        treatmentDate: validatedData.treatmentDate.toISOString(),
        doctorSignature,
        signatureHash
      };
      const { cid: recordCID } = await uploadJSONToIPFS(
        treatmentData,
        `treatment_${patient.uid}_${Date.now()}.json`
      );
      const treatmentLog = await storage.createTreatmentLog({
        patientId: patient.id,
        doctorId: doctor?.id || hospital.id,
        hospitalId: hospital.id,
        diagnosis: validatedData.diagnosis,
        treatment: validatedData.treatment,
        prescription: validatedData.prescription || null,
        notes: validatedData.notes || null,
        treatmentDate: validatedData.treatmentDate,
        recordCID,
        doctorSignature,
        signatureHash
      });
      await storage.createAuditLog({
        userId: hospital.id,
        action: "hospital_treatment_created",
        targetType: "treatment",
        targetId: treatmentLog.id,
        metadata: {
          patientId: patient.id,
          diagnosis: validatedData.diagnosis,
          doctorId: validatedData.doctorId || null
        }
      });
      res.status(201).json(treatmentLog);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.error("Treatment validation error:", error.errors);
        return res.status(400).json({ error: "Invalid treatment data", details: error.errors });
      }
      console.error("Treatment creation error:", error);
      res.status(500).json({ error: "Failed to create treatment log" });
    }
  });
  app.get("/api/hospital/treatments", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      const allTreatments = await storage.getTreatmentLogs();
      const hospitalTreatments = allTreatments.filter((t) => t.hospitalId === hospital.id);
      res.json(hospitalTreatments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch treatments" });
    }
  });
  app.get("/api/hospital/search-patient", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: "Search query is required" });
      }
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      let patient = await storage.getUserByUid(query.trim());
      if (!patient) {
        patient = await storage.getUserByUsername(query.trim());
      }
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (patient.role !== "patient") {
        return res.status(400).json({ error: "Can only search for patients" });
      }
      const treatments = await storage.getTreatmentLogs(patient.id);
      const hospitalTreatments = treatments.filter((t) => t.hospitalId === hospital.id);
      const patientClaims = await storage.getClaims({ patientId: patient.id, hospitalId: hospital.id });
      res.json({
        id: patient.id,
        uid: patient.uid,
        username: patient.username,
        status: patient.status,
        profilePicture: patient.profilePicture,
        treatmentCount: hospitalTreatments.length,
        claimCount: patientClaims.length,
        lastVisit: hospitalTreatments.length > 0 ? hospitalTreatments[0].treatmentDate : null
      });
    } catch (error) {
      console.error("Hospital search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });
  app.get("/api/hospital/patients", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      const admissions = await storage.getPatientAdmissions({ hospitalId: hospital.id });
      const allTreatments = await storage.getTreatmentLogs();
      const hospitalTreatments = allTreatments.filter((t) => t.hospitalId === hospital.id);
      const admittedPatientIds = admissions.map((a) => a.patientId);
      const treatedPatientIds = hospitalTreatments.map((t) => t.patientId);
      const allPatientIds = Array.from(/* @__PURE__ */ new Set([...admittedPatientIds, ...treatedPatientIds]));
      const patients = await Promise.all(allPatientIds.map(async (patientId) => {
        const patient = await storage.getUser(patientId);
        const patientAdmissions = admissions.filter((a) => a.patientId === patientId);
        const currentAdmission = patientAdmissions.find((a) => a.status === "admitted" || a.status === "treated");
        const patientTreatments = hospitalTreatments.filter((t) => t.patientId === patientId);
        const latestTreatment = patientTreatments.sort(
          (a, b) => new Date(b.treatmentDate).getTime() - new Date(a.treatmentDate).getTime()
        )[0];
        let assignedDoctor = null;
        if (currentAdmission?.doctorId) {
          const doctor = await storage.getUser(currentAdmission.doctorId);
          assignedDoctor = doctor ? {
            id: doctor.id,
            uid: doctor.uid,
            username: doctor.username
          } : null;
        }
        return {
          id: patient?.id,
          uid: patient?.uid,
          username: patient?.username,
          profilePicture: patient?.profilePicture,
          lastVisit: latestTreatment?.treatmentDate,
          treatmentCount: patientTreatments.length,
          status: patient?.status,
          admissionStatus: currentAdmission?.status,
          admissionId: currentAdmission?.id,
          admissionDate: currentAdmission?.admissionDate,
          admissionReason: currentAdmission?.admissionReason,
          roomNumber: currentAdmission?.roomNumber,
          ward: currentAdmission?.ward,
          assignedDoctor,
          isTreated: currentAdmission?.status === "treated" || patientTreatments.length > 0,
          isAdmitted: currentAdmission?.status === "admitted"
        };
      }));
      res.json(patients.filter((p) => p.id));
    } catch (error) {
      console.error("Failed to fetch hospital patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });
  app.get("/api/hospital/access-requests", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      if (hospital.role !== "hospital") {
        return res.status(403).json({ error: "Access denied: Hospital role required" });
      }
      if (!hospital.hospitalName) {
        return res.json([]);
      }
      const requests = await storage.getHospitalNotifiedAccessRequests(hospital.hospitalName);
      const enriched = await Promise.all(requests.map(async (req2) => {
        const patient = await storage.getUser(req2.patientId);
        const requester = await storage.getUser(req2.requesterId);
        return {
          ...req2,
          patientName: patient?.username,
          patientUid: patient?.uid,
          patientProfilePicture: patient?.profilePicture,
          requesterName: requester?.username,
          requesterRole: requester?.role,
          requesterProfilePicture: requester?.profilePicture
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Failed to fetch hospital access requests:", error);
      res.status(500).json({ error: "Failed to fetch access requests" });
    }
  });
  app.post("/api/hospital/request-access", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      if (hospital.role !== "hospital") {
        return res.status(403).json({ error: "Only hospitals can request access" });
      }
      const requestSchema = z2.object({
        patientId: z2.string().min(1, "Patient ID is required"),
        reason: z2.string().min(1, "Reason is required")
      });
      const validatedData = requestSchema.parse(req.body);
      let patient = await storage.getUser(validatedData.patientId);
      if (!patient) {
        patient = await storage.getUserByUid(validatedData.patientId);
      }
      if (!patient) {
        patient = await storage.getUserByUsername(validatedData.patientId);
      }
      if (!patient) {
        return res.status(404).json({ error: "Patient not found. Please provide a valid Patient ID, UID, or username." });
      }
      if (patient.role !== "patient") {
        return res.status(400).json({ error: "Can only request access to patient records" });
      }
      const accessRequest = await storage.createAccessRequest({
        patientId: patient.id,
        requesterId: hospital.id,
        accessType: "full",
        reason: validatedData.reason,
        status: "pending"
      });
      await storage.createAuditLog({
        userId: hospital.id,
        action: "access_requested",
        targetType: "access",
        targetId: accessRequest.id,
        metadata: { patientId: patient.id, reason: validatedData.reason }
      });
      res.json(accessRequest);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Access request error:", error);
      res.status(500).json({ error: "Failed to request access" });
    }
  });
  app.get("/api/hospital/patients-with-access", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      const accessRequests = await storage.getAccessRequestsByRequester(hospital.id);
      console.log(`[Hospital Patients] Hospital ${hospital.id} has ${accessRequests.length} total access requests`);
      console.log(`[Hospital Patients] Access request statuses:`, accessRequests.map((req2) => req2.status));
      const grantedAccess = accessRequests.filter((req2) => req2.status === "granted");
      console.log(`[Hospital Patients] Found ${grantedAccess.length} granted access requests`);
      const patients = await Promise.all(grantedAccess.map(async (access) => {
        const patient = await storage.getUser(access.patientId);
        const records = await storage.getMedicalRecords(access.patientId);
        const allTreatments = await storage.getTreatmentLogs(access.patientId);
        const hospitalTreatments = allTreatments.filter((t) => t.hospitalId === hospital.id);
        const allClaims = await storage.getClaims({ patientId: access.patientId });
        const hospitalClaims = allClaims.filter((c) => c.hospitalId === hospital.id);
        return {
          id: patient?.id,
          uid: patient?.uid,
          username: patient?.username,
          status: patient?.status,
          profilePicture: patient?.profilePicture,
          accessGrantedAt: access.respondedAt,
          accessType: access.accessType,
          recordCount: records.length,
          treatmentCount: hospitalTreatments.length,
          claimCount: hospitalClaims.length
        };
      }));
      res.json(patients);
    } catch (error) {
      console.error("Failed to fetch hospital's patients with access:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });
  app.get("/api/hospital/patient/:patientId/records", async (req, res) => {
    try {
      const { patientId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      const hasAccess = await storage.checkAccess(patientId, hospital.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You don't have permission to view this patient's records." });
      }
      const records = await storage.getMedicalRecords(patientId);
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch patient records:", error);
      res.status(500).json({ error: "Failed to fetch records" });
    }
  });
  app.get("/api/hospital/patient/:patientId/profile", async (req, res) => {
    try {
      const { patientId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital) return res.status(404).json({ error: "Hospital not found" });
      const hasAccess = await storage.checkAccess(patientId, hospital.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You don't have permission to view this patient's profile." });
      }
      const patient = await storage.getUser(patientId);
      const profile = await storage.getHealthProfile(patientId);
      res.json({
        ...patient,
        healthProfile: profile
      });
    } catch (error) {
      console.error("Failed to fetch patient profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
  app.get("/api/emergency/scans", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const responder = await storage.getUserByWalletAddress(walletAddress);
      if (!responder) return res.status(404).json({ error: "Responder not found" });
      if (responder.role !== "emergency_responder") {
        return res.status(403).json({ error: "Access denied. Only emergency responders can access this endpoint." });
      }
      const logs = await storage.getAuditLogs(responder.id);
      const scans = logs.filter((log2) => log2.action === "qr_scanned");
      res.json(scans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });
  app.get("/api/emergency/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: "Search query is required" });
      }
      const walletAddress = req.headers["x-wallet-address"];
      const responder = await storage.getUserByWalletAddress(walletAddress);
      if (!responder) return res.status(404).json({ error: "Responder not found" });
      if (responder.role !== "emergency_responder") {
        return res.status(403).json({ error: "Access denied. Only emergency responders can access this endpoint." });
      }
      let patient = await storage.getUserByUid(query.trim());
      if (!patient) {
        patient = await storage.getUserByUsername(query.trim());
      }
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (patient.role !== "patient") {
        return res.status(400).json({ error: "Can only search for patients" });
      }
      const records = await storage.getMedicalRecords(patient.id);
      const hasAccess = await storage.checkAccess(patient.id, responder.id);
      res.json({
        id: patient.id,
        username: patient.username,
        uid: patient.uid,
        status: patient.status,
        recordCount: records.length,
        hasAccess
      });
    } catch (error) {
      console.error("Emergency responder search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });
  app.post("/api/emergency/verify-qr", async (req, res) => {
    try {
      const { qrData } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const scanner = await storage.getUserByWalletAddress(walletAddress);
      if (!scanner) return res.status(404).json({ error: "User not found" });
      const allowedRoles = ["emergency_responder", "hospital", "doctor"];
      if (!allowedRoles.includes(scanner.role)) {
        return res.status(403).json({ error: "Access denied. Only emergency responders, hospitals, and doctors can scan QR codes." });
      }
      if (!qrData) return res.status(400).json({ error: "QR data required" });
      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
      } catch (e) {
        return res.status(400).json({ error: "Invalid QR data format" });
      }
      const patient = await storage.getUserByUid(parsedData.uid);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      await storage.incrementQRScanCount(patient.id);
      await storage.createAuditLog({
        userId: scanner.id,
        action: "qr_scanned",
        targetType: "qr",
        targetId: patient.id,
        metadata: { patientUid: patient.uid, scannerRole: scanner.role, timestamp: Date.now() }
      });
      res.json({
        success: true,
        data: parsedData
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify QR" });
    }
  });
  app.get("/api/emergency/patients", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const responder = await storage.getUserByWalletAddress(walletAddress);
      if (!responder) return res.status(404).json({ error: "Responder not found" });
      if (responder.role !== "emergency_responder") {
        return res.status(403).json({ error: "Access denied. Only emergency responders can access this endpoint." });
      }
      const accessRequests = await storage.getAccessRequestsByRequester(responder.id);
      const grantedAccess = accessRequests.filter((req2) => req2.status === "granted");
      const patients = await Promise.all(grantedAccess.map(async (access) => {
        const patient = await storage.getUser(access.patientId);
        const records = await storage.getMedicalRecords(access.patientId);
        return {
          id: patient?.id,
          uid: patient?.uid,
          username: patient?.username,
          status: patient?.status,
          profilePicture: patient?.profilePicture,
          accessGrantedAt: access.respondedAt,
          accessType: access.accessType,
          recordCount: records.length,
          isEmergency: access.isEmergency || false
        };
      }));
      res.json(patients);
    } catch (error) {
      console.error("Failed to fetch emergency responder's patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });
  app.get("/api/emergency/patient/:patientId/records", async (req, res) => {
    try {
      const { patientId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const responder = await storage.getUserByWalletAddress(walletAddress);
      if (!responder) return res.status(404).json({ error: "Responder not found" });
      if (responder.role !== "emergency_responder") {
        return res.status(403).json({ error: "Access denied. Only emergency responders can access this endpoint." });
      }
      const hasAccess = await storage.checkAccess(patientId, responder.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You don't have permission to view this patient's records." });
      }
      const records = await storage.getMedicalRecords(patientId);
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch patient records:", error);
      res.status(500).json({ error: "Failed to fetch records" });
    }
  });
  app.get("/api/emergency/patient/:patientId/profile", async (req, res) => {
    try {
      const { patientId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const responder = await storage.getUserByWalletAddress(walletAddress);
      if (!responder) return res.status(404).json({ error: "Responder not found" });
      if (responder.role !== "emergency_responder") {
        return res.status(403).json({ error: "Access denied. Only emergency responders can access this endpoint." });
      }
      const hasAccess = await storage.checkAccess(patientId, responder.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. You don't have permission to view this patient's profile." });
      }
      const patient = await storage.getUser(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const healthProfile = await storage.getHealthProfile(patientId);
      res.json({
        username: patient.username,
        uid: patient.uid,
        email: patient.email,
        hospitalName: patient.hospitalName,
        profilePicture: patient.profilePicture,
        ...healthProfile
      });
    } catch (error) {
      console.error("Failed to fetch patient profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
  app.get("/api/insurance/claims", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) return res.status(404).json({ error: "Insurance provider profile not found" });
      const connections = await storage.getProviderConnections(provider.id);
      const connectionIds = connections.map((c) => c.id);
      const allClaims = await Promise.all(
        connectionIds.map((connectionId) => storage.getClaims({ connectionId }))
      );
      const claims = allClaims.flat();
      res.json(claims);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claims" });
    }
  });
  app.get("/api/insurance/profile", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      res.json(provider);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch provider profile" });
    }
  });
  app.put("/api/insurance/profile", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) return res.status(404).json({ error: "Insurance provider profile not found" });
      await storage.updateInsuranceProvider(provider.id, req.body);
      await storage.createAuditLog({
        userId: user.id,
        action: "provider_profile_updated",
        targetType: "insurance_provider",
        targetId: provider.id
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update provider profile" });
    }
  });
  app.get("/api/patient/insurance/available-providers", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const patient = await storage.getUserByWalletAddress(walletAddress);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const providers = await storage.getInsuranceProviders();
      const enrichedProviders = await Promise.all(providers.map(async (provider) => {
        const user = await storage.getUser(provider.userId);
        return {
          ...provider,
          username: user?.username,
          profilePicture: user?.profilePicture
        };
      }));
      res.json(enrichedProviders);
    } catch (error) {
      console.error("Error fetching available providers:", error);
      res.status(500).json({ error: "Failed to fetch available providers" });
    }
  });
  app.post("/api/patient/insurance/connect", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const patient = await storage.getUserByWalletAddress(walletAddress);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const connectionSchema = insertPatientInsuranceConnectionSchema.omit({ patientId: true });
      const validatedData = connectionSchema.parse(req.body);
      const connection = await storage.createInsuranceConnectionRequest({
        patientId: patient.id,
        ...validatedData
      });
      await storage.createAuditLog({
        userId: patient.id,
        action: "insurance_connection_requested",
        targetType: "insurance_connection",
        targetId: connection.id
      });
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid connection data", details: error.errors });
      }
      console.error("Insurance connection error:", error);
      res.status(500).json({ error: "Failed to submit connection request" });
    }
  });
  app.post("/api/patient/insurance/pay/:connectionId", async (req, res) => {
    try {
      const { connectionId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const patient = await storage.getUserByWalletAddress(walletAddress);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const connections = await storage.getPatientInsuranceConnections(patient.id);
      const connection = connections.find((c) => c.id === connectionId);
      if (!connection) {
        return res.status(404).json({ error: "Insurance connection not found" });
      }
      if (connection.status !== "connected") {
        return res.status(400).json({ error: "Insurance connection is not active" });
      }
      await storage.updateConnectionBilling(
        connectionId,
        /* @__PURE__ */ new Date(),
        0
        // Reset missed payments count
      );
      await storage.createAuditLog({
        userId: patient.id,
        action: "insurance_payment_made",
        targetType: "insurance_connection",
        targetId: connectionId,
        metadata: {
          amount: connection.monthlyFee,
          paymentDate: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      res.json({
        success: true,
        message: "Payment processed successfully",
        amount: connection.monthlyFee,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
      });
    } catch (error) {
      console.error("Payment error:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });
  app.get("/api/insurance/connections", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) return res.status(404).json({ error: "Insurance provider profile not found" });
      const connections = await storage.getProviderConnections(provider.id);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });
  app.post("/api/insurance/connections/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        console.log("[Approve] Provider user not found for wallet:", walletAddress);
        return res.status(404).json({ error: "Provider not found" });
      }
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) {
        console.log("[Approve] Insurance provider profile not found for user:", user.id);
        return res.status(404).json({ error: "Insurance provider profile not found" });
      }
      await storage.updateConnectionStatus(id, "connected", user.id);
      await storage.createAuditLog({
        userId: user.id,
        action: "insurance_connection_approved",
        targetType: "insurance_connection",
        targetId: id
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Connection approval error:", error);
      res.status(500).json({ error: "Failed to approve connection" });
    }
  });
  app.post("/api/insurance/connections/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        console.log("[Reject] Provider user not found for wallet:", walletAddress);
        return res.status(404).json({ error: "Provider not found" });
      }
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) {
        console.log("[Reject] Insurance provider profile not found for user:", user.id);
        return res.status(404).json({ error: "Insurance provider profile not found" });
      }
      if (!reason || reason.trim() === "") {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      await storage.updateConnectionStatus(id, "disconnected", user.id, reason);
      await storage.createAuditLog({
        userId: user.id,
        action: "insurance_connection_rejected",
        targetType: "insurance_connection",
        targetId: id,
        metadata: { reason }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Connection rejection error:", error);
      res.status(500).json({ error: "Failed to reject connection" });
    }
  });
  app.get("/api/insurance/analytics", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) return res.status(404).json({ error: "Insurance provider profile not found" });
      const connections = await storage.getProviderConnections(provider.id);
      const connectedPatients = connections.filter((c) => c.status === "connected");
      const pendingConnections = connections.filter((c) => c.status === "pending");
      const connectionIds = connections.map((c) => c.id);
      const allClaims = await Promise.all(
        connectionIds.map((connectionId) => storage.getClaims({ connectionId }))
      );
      const claims = allClaims.flat();
      const now = /* @__PURE__ */ new Date();
      const thisMonth = claims.filter((c) => {
        const submittedDate = new Date(c.submittedAt);
        return submittedDate.getMonth() === now.getMonth() && submittedDate.getFullYear() === now.getFullYear();
      });
      const totalPayout = thisMonth.reduce((sum, c) => {
        return sum + (parseFloat(c.amount) || 0);
      }, 0);
      const statusCounts = {
        pending: claims.filter((c) => c.status === "pending").length,
        approved: claims.filter((c) => c.status === "approved").length,
        paid: claims.filter((c) => c.status === "paid").length,
        rejected: claims.filter((c) => c.status === "rejected").length
      };
      const claimTypeAmounts = {
        emergency: claims.filter((c) => c.claimType === "emergency").reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
        outpatient: claims.filter((c) => c.claimType === "outpatient").reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
        inpatient: claims.filter((c) => c.claimType === "inpatient").reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
        surgery: claims.filter((c) => c.claimType === "surgery").reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)
      };
      const approvedCount = claims.filter((c) => c.status === "approved" || c.status === "paid").length;
      const approvalRate = claims.length > 0 ? Math.round(approvedCount / claims.length * 100) : 0;
      res.json({
        claimsThisMonth: thisMonth.length,
        totalPayout,
        approvalRate,
        connectedPatients: connectedPatients.length,
        pendingConnections: pendingConnections.length,
        statusCounts,
        claimTypeAmounts,
        totalClaims: claims.length,
        monthlyRevenue: connectedPatients.length * parseFloat(provider.monthlyFee || "0")
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });
  app.post("/api/insurance/claims/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) return res.status(404).json({ error: "Insurance provider profile not found" });
      const allClaims = await storage.getClaims({});
      const claim = allClaims.find((c) => c.id === id);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      await storage.updateClaimStatus(id, "approved", {
        respondedAt: /* @__PURE__ */ new Date()
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "claim_approved_by_insurance",
        targetType: "claim",
        targetId: id
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Claim approval error:", error);
      res.status(500).json({ error: "Failed to approve claim" });
    }
  });
  app.post("/api/insurance/claims/:id/pay", async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) return res.status(404).json({ error: "Insurance provider profile not found" });
      const allClaims = await storage.getClaims({});
      const claim = allClaims.find((c) => c.id === id);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      if (claim.status !== "approved") {
        return res.status(400).json({ error: "Only approved claims can be paid" });
      }
      await storage.updateClaimStatus(id, "paid", {
        paidAmount: claim.amount,
        paidAt: /* @__PURE__ */ new Date()
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "claim_paid_by_insurance",
        targetType: "claim",
        targetId: id
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Claim payment error:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });
  app.post("/api/insurance/claims/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) return res.status(404).json({ error: "Insurance provider profile not found" });
      if (!reason || reason.trim() === "") {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      await storage.updateClaimStatus(id, "rejected", {
        rejectionReason: reason
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "claim_rejected_by_insurance",
        targetType: "claim",
        targetId: id,
        metadata: { reason }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Claim rejection error:", error);
      res.status(500).json({ error: "Failed to reject claim" });
    }
  });
  app.post("/api/insurance/process-monthly-billing", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "Provider not found" });
      const provider = await storage.getInsuranceProviderByUserId(user.id);
      if (!provider) return res.status(404).json({ error: "Insurance provider profile not found" });
      const connections = await storage.getProviderConnections(provider.id);
      const connectedPatients = connections.filter((c) => c.status === "connected");
      let processed = 0;
      let disconnected = 0;
      const results = [];
      for (const connection of connectedPatients) {
        const paymentSuccessful = Math.random() > 0.1;
        if (paymentSuccessful) {
          await storage.updateConnectionBilling(
            connection.id,
            /* @__PURE__ */ new Date(),
            0
          );
          results.push({
            patientId: connection.patientId,
            status: "success",
            amount: provider.monthlyFee
          });
          processed++;
        } else {
          const newMissedCount = (connection.missedPaymentsCount || 0) + 1;
          await storage.updateConnectionBilling(
            connection.id,
            connection.lastBillingDate || /* @__PURE__ */ new Date(),
            newMissedCount
          );
          if (newMissedCount >= 3) {
            await storage.disconnectInsurance(connection.id);
            await storage.createAuditLog({
              userId: connection.patientId,
              action: "insurance_auto_disconnected",
              targetType: "insurance_connection",
              targetId: connection.id,
              metadata: {
                reason: "3 consecutive missed payments",
                missedPaymentsCount: newMissedCount
              }
            });
            results.push({
              patientId: connection.patientId,
              status: "disconnected",
              missedPayments: newMissedCount,
              reason: "3 consecutive missed payments"
            });
            disconnected++;
          } else {
            results.push({
              patientId: connection.patientId,
              status: "payment_failed",
              missedPayments: newMissedCount
            });
          }
        }
      }
      await storage.createAuditLog({
        userId: user.id,
        action: "monthly_billing_processed",
        targetType: "insurance_provider",
        targetId: provider.id,
        metadata: {
          processed,
          disconnected,
          totalConnections: connectedPatients.length
        }
      });
      res.json({
        success: true,
        processed,
        disconnected,
        totalConnections: connectedPatients.length,
        results
      });
    } catch (error) {
      console.error("Monthly billing error:", error);
      res.status(500).json({ error: "Failed to process monthly billing" });
    }
  });
  app.get("/api/admin/kyc-queue", async (req, res) => {
    try {
      const kyc = await storage.getPendingKYC();
      res.json(kyc);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KYC queue" });
    }
  });
  app.get("/api/admin/role-applications", async (req, res) => {
    try {
      const applications = await storage.getPendingKYC();
      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app.get("/api/admin/users/:userId/details", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const kycData = await storage.getKYC(userId);
      const healthProfile = await storage.getHealthProfile(userId);
      res.json({
        user,
        kyc: kycData || null,
        healthProfile: healthProfile || null
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });
  app.get("/api/admin/users/:userId/audit-logs", async (req, res) => {
    try {
      const { userId } = req.params;
      const logs = await storage.getUserAuditLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching user audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });
  app.get("/api/admin/audit-logs", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const admin = await storage.getUserByWalletAddress(walletAddress);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const logs = await storage.getAuditLogs();
      const enriched = await Promise.all(logs.map(async (log2) => {
        let username = null;
        if (log2.userId) {
          const user = await storage.getUser(log2.userId);
          username = user?.username || user?.walletAddress?.slice(0, 10) + "...";
        }
        return { ...log2, username };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching system audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });
  app.post("/api/admin/kyc/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const admin = await storage.getUserByWalletAddress(walletAddress);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const kycData = await storage.getKYCById(id);
      if (!kycData) {
        return res.status(404).json({ error: "KYC not found" });
      }
      await storage.updateKYCStatus(id, "approved", admin.id);
      if (kycData.requestedRole) {
        await storage.updateUserRole(kycData.userId, kycData.requestedRole);
      } else {
        await storage.updateUserStatus(kycData.userId, "verified");
      }
      if (kycData.affiliatedHospital) {
        await storage.updateUserInfo(kycData.userId, {
          hospitalName: kycData.affiliatedHospital
        });
      } else if (kycData.institutionName && kycData.requestedRole === "hospital") {
        await storage.updateUserInfo(kycData.userId, {
          hospitalName: kycData.institutionName
        });
      }
      await storage.createAuditLog({
        userId: admin.id,
        action: "kyc_approved",
        targetType: "kyc",
        targetId: id,
        metadata: { kycUserId: kycData.userId }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("KYC approval error:", error);
      res.status(500).json({ error: "Failed to approve KYC" });
    }
  });
  app.post("/api/admin/kyc/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const admin = await storage.getUserByWalletAddress(walletAddress);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const kycData = await storage.getKYCById(id);
      if (!kycData) {
        return res.status(404).json({ error: "KYC not found" });
      }
      await storage.updateKYCStatus(id, "rejected", admin.id, reason || "Application denied");
      await storage.createAuditLog({
        userId: admin.id,
        action: "kyc_rejected",
        targetType: "kyc",
        targetId: id,
        metadata: { kycUserId: kycData.userId, reason }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("KYC rejection error:", error);
      res.status(500).json({ error: "Failed to reject KYC" });
    }
  });
  app.post("/api/admin/users/:userId/role", async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const admin = await storage.getUserByWalletAddress(walletAddress);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const kycData = await storage.getKYC(userId);
      if (kycData?.affiliatedHospital && (role === "doctor" || role === "patient" || role === "emergency_responder")) {
        await storage.updateUserInfo(userId, {
          hospitalName: kycData.affiliatedHospital
        });
      } else if (kycData?.institutionName && role === "hospital") {
        await storage.updateUserInfo(userId, {
          hospitalName: kycData.institutionName
        });
      } else if (role === "insurance_provider" && kycData) {
        const providerData = {
          userId,
          providerName: kycData.providerName || kycData.institutionName || "Insurance Provider",
          description: kycData.providerDescription || null,
          monthlyFee: kycData.monthlyFee || "0",
          coverageLimit: kycData.coverageLimit || "0",
          coverageTypes: kycData.coverageTypes || [],
          isActive: true
        };
        const existingProvider = await storage.getInsuranceProviderByUserId(userId);
        if (!existingProvider) {
          await storage.createInsuranceProvider(providerData);
        }
      }
      await storage.updateUserRole(userId, role);
      await storage.createAuditLog({
        userId: admin.id,
        action: "role_granted",
        targetType: "user",
        targetId: userId,
        metadata: { newRole: role }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Role update error:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });
  app.post("/api/admin/users/:userId/status", async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const admin = await storage.getUserByWalletAddress(walletAddress);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.role === "admin") return res.status(400).json({ error: "Cannot modify another admin's status" });
      await storage.updateUserStatus(userId, status);
      await storage.createAuditLog({
        userId: admin.id,
        action: `user_${status}`,
        targetType: "user",
        targetId: userId,
        metadata: { status }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user status" });
    }
  });
  app.post("/api/admin/users/:userId/suspend", async (req, res) => {
    try {
      const { userId } = req.params;
      const { durationDays } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const admin = await storage.getUserByWalletAddress(walletAddress);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.role === "admin") return res.status(400).json({ error: "Cannot suspend another admin" });
      let suspendedUntil = null;
      if (durationDays && durationDays > 0) {
        suspendedUntil = /* @__PURE__ */ new Date();
        suspendedUntil.setDate(suspendedUntil.getDate() + durationDays);
      }
      await storage.suspendUser(userId, suspendedUntil);
      await storage.createAuditLog({
        userId: admin.id,
        action: "user_suspended",
        targetType: "user",
        targetId: userId,
        metadata: { durationDays: durationDays || "permanent", suspendedUntil }
      });
      res.json({ success: true, suspendedUntil });
    } catch (error) {
      res.status(500).json({ error: "Failed to suspend user" });
    }
  });
  app.delete("/api/admin/users/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const admin = await storage.getUserByWalletAddress(walletAddress);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.role === "admin") return res.status(400).json({ error: "Cannot delete another admin" });
      if (target.id === admin.id) return res.status(400).json({ error: "Cannot delete your own account" });
      await storage.createAuditLog({
        userId: admin.id,
        action: "user_deleted",
        targetType: "user",
        targetId: userId,
        metadata: { deletedUsername: target.username, deletedRole: target.role }
      });
      await storage.deleteUserPermanently(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app.get("/api/consultation/doctors", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const specialization = req.query.specialization;
      const allDoctors = await storage.getUsersByRole("doctor");
      const filtered = specialization ? allDoctors.filter((d) => d.specialization && d.specialization.toLowerCase().includes(specialization.toLowerCase())) : allDoctors;
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });
  app.post("/api/consultation/request", async (req, res) => {
    try {
      const { doctorId, reason, type } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const patient = await storage.getUserByWalletAddress(walletAddress);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const doctor = await storage.getUser(doctorId);
      if (!doctor || doctor.role !== "doctor") {
        return res.status(404).json({ error: "Doctor not found" });
      }
      const consultationType = type === "video" ? "video" : "text";
      const videoRoomId = consultationType === "video" ? `hgx-${randomBytes(6).toString("hex")}` : null;
      const consultation = await storage.createConsultationRequest({
        patientId: patient.id,
        doctorId,
        hospitalName: patient.hospitalName || doctor.hospitalName || "N/A",
        reason,
        type: consultationType,
        videoRoomId,
        status: "pending"
      });
      await storage.createAuditLog({
        userId: patient.id,
        action: "consultation_requested",
        targetType: "consultation",
        targetId: consultation.id,
        metadata: { doctorId, reason }
      });
      res.json(consultation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create consultation request" });
    }
  });
  app.get("/api/consultation/patient/requests", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const patient = await storage.getUserByWalletAddress(walletAddress);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      const requests = await storage.getConsultationRequests({ patientId: patient.id });
      const enriched = await Promise.all(requests.map(async (req2) => {
        const doctor = await storage.getUser(req2.doctorId);
        return {
          ...req2,
          doctorName: doctor?.username,
          doctorProfilePicture: doctor?.profilePicture
        };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch consultation requests" });
    }
  });
  app.get("/api/consultation/doctor/requests", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor) return res.status(404).json({ error: "Doctor not found" });
      const requests = await storage.getConsultationRequests({ doctorId: doctor.id });
      const enriched = await Promise.all(requests.map(async (req2) => {
        const patient = await storage.getUser(req2.patientId);
        return {
          ...req2,
          patientName: patient?.username,
          patientProfilePicture: patient?.profilePicture,
          patientUid: patient?.uid
        };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch consultation requests" });
    }
  });
  app.get("/api/consultation/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const consultation = await storage.getConsultationById(id);
      if (!consultation) {
        return res.status(404).json({ error: "Consultation not found" });
      }
      if (consultation.patientId !== user.id && consultation.doctorId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const doctor = await storage.getUser(consultation.doctorId);
      const patient = await storage.getUser(consultation.patientId);
      res.json({
        ...consultation,
        doctorUsername: doctor?.username,
        doctorProfilePicture: doctor?.profilePicture,
        patientUsername: patient?.username,
        patientProfilePicture: patient?.profilePicture,
        patientUid: patient?.uid
      });
    } catch (error) {
      console.error("Error fetching consultation:", error);
      res.status(500).json({ error: "Failed to fetch consultation" });
    }
  });
  app.post("/api/consultation/:id/accept", async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor || doctor.role !== "doctor") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const consultation = await storage.getConsultationById(id);
      if (!consultation || consultation.doctorId !== doctor.id) {
        return res.status(404).json({ error: "Consultation not found" });
      }
      await storage.updateConsultationStatus(id, "accepted");
      await storage.createAuditLog({
        userId: doctor.id,
        action: "consultation_accepted",
        targetType: "consultation",
        targetId: id
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to accept consultation" });
    }
  });
  app.post("/api/consultation/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const doctor = await storage.getUserByWalletAddress(walletAddress);
      if (!doctor || doctor.role !== "doctor") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const consultation = await storage.getConsultationById(id);
      if (!consultation || consultation.doctorId !== doctor.id) {
        return res.status(404).json({ error: "Consultation not found" });
      }
      await storage.updateConsultationStatus(id, "rejected", reason);
      await storage.createAuditLog({
        userId: doctor.id,
        action: "consultation_rejected",
        targetType: "consultation",
        targetId: id,
        metadata: { reason }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject consultation" });
    }
  });
  app.get("/api/chat/:consultationId/messages", async (req, res) => {
    try {
      const { consultationId } = req.params;
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const consultation = await storage.getConsultationById(consultationId);
      if (!consultation) {
        return res.status(404).json({ error: "Consultation not found" });
      }
      if (consultation.patientId !== user.id && consultation.doctorId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      if (consultation.status !== "accepted") {
        return res.status(403).json({ error: "Consultation must be accepted to view messages" });
      }
      const messages = await storage.getChatMessages(consultationId);
      const enrichedMessages = messages.map((msg) => ({
        ...msg,
        isCurrentUser: msg.senderId === user.id
      }));
      await storage.markMessagesAsRead(consultationId, user.id);
      res.json(enrichedMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  app.post("/api/chat/:consultationId/messages", async (req, res) => {
    try {
      const { consultationId } = req.params;
      const { message } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) return res.status(404).json({ error: "User not found" });
      const consultation = await storage.getConsultationById(consultationId);
      if (!consultation) {
        return res.status(404).json({ error: "Consultation not found" });
      }
      if (consultation.patientId !== user.id && consultation.doctorId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      if (consultation.status !== "accepted") {
        return res.status(403).json({ error: "Consultation must be accepted to send messages" });
      }
      const receiverId = user.id === consultation.patientId ? consultation.doctorId : consultation.patientId;
      const chatMessage = await storage.createChatMessage({
        consultationId,
        senderId: user.id,
        receiverId,
        message,
        isRead: false
      });
      res.json(chatMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  app.get("/api/hospital/all-patients", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital || hospital.role !== "hospital") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const hospitalKyc = await storage.getKYC(hospital.id);
      const effectiveHospitalName = hospital.hospitalName || hospitalKyc?.institutionName;
      const [affiliatedByName, affiliatedByKyc, admissions, hospitalTreatments, allPatients] = await Promise.all([
        effectiveHospitalName ? storage.getUsersByHospital(effectiveHospitalName, "patient") : Promise.resolve([]),
        effectiveHospitalName ? storage.getUsersByKYCAffiliatedHospital(effectiveHospitalName, "patient") : Promise.resolve([]),
        storage.getPatientAdmissions({ hospitalId: hospital.id }),
        // Only fetch treatments for THIS hospital instead of all treatments
        storage.getTreatmentLogs(void 0, void 0, hospital.id),
        // Fallback: get all patients if no hospital name is set
        !effectiveHospitalName ? storage.getUsersByRole("patient") : Promise.resolve([])
      ]);
      console.log("Patient data sources:", {
        affiliatedByName: affiliatedByName.length,
        affiliatedByKyc: affiliatedByKyc.length,
        admissions: admissions.length,
        hospitalTreatments: hospitalTreatments.length,
        allPatients: allPatients.length,
        effectiveHospitalName
      });
      const patientMap = /* @__PURE__ */ new Map();
      for (const p of affiliatedByName) patientMap.set(p.id, p);
      for (const p of affiliatedByKyc) if (!patientMap.has(p.id)) patientMap.set(p.id, p);
      if (!effectiveHospitalName) {
        for (const p of allPatients) if (!patientMap.has(p.id)) patientMap.set(p.id, p);
      }
      const admittedIds = admissions.map((a) => a.patientId);
      const treatedIds = [...new Set(hospitalTreatments.map((t) => t.patientId))];
      const missingIds = [.../* @__PURE__ */ new Set([...admittedIds, ...treatedIds])].filter((id) => !patientMap.has(id));
      if (missingIds.length > 0) {
        const missingUsers = await Promise.all(missingIds.map((id) => storage.getUser(id)));
        for (const p of missingUsers) {
          if (p && p.role === "patient") patientMap.set(p.id, p);
        }
      }
      const patients = Array.from(patientMap.values());
      if (patients.length === 0) {
        return res.json([]);
      }
      const [allKyc, allHealthProfiles] = await Promise.all([
        Promise.all(patients.map((p) => storage.getKYC(p.id))),
        Promise.all(patients.map((p) => storage.getHealthProfile(p.id)))
      ]);
      const kycMap = new Map(patients.map((p, i) => [p.id, allKyc[i]]));
      const healthMap = new Map(patients.map((p, i) => [p.id, allHealthProfiles[i]]));
      const treatmentsByPatient = /* @__PURE__ */ new Map();
      for (const t of hospitalTreatments) {
        if (!treatmentsByPatient.has(t.patientId)) treatmentsByPatient.set(t.patientId, []);
        treatmentsByPatient.get(t.patientId).push(t);
      }
      const activeAdmissions = /* @__PURE__ */ new Map();
      for (const a of admissions) {
        if (a.status === "admitted") activeAdmissions.set(a.patientId, a);
      }
      const enrichedPatients = patients.map((patient) => {
        const patientTreatments = treatmentsByPatient.get(patient.id) || [];
        const latestTreatment = patientTreatments[0];
        const currentAdmission = activeAdmissions.get(patient.id);
        const kycData = kycMap.get(patient.id);
        const healthProfile = healthMap.get(patient.id);
        return {
          ...patient,
          treatmentCount: patientTreatments.length,
          lastTreatment: latestTreatment ? {
            date: latestTreatment.treatmentDate,
            diagnosis: latestTreatment.diagnosis
          } : null,
          hasActiveAccess: false,
          admissionStatus: currentAdmission ? {
            id: currentAdmission.id,
            admissionDate: currentAdmission.admissionDate,
            roomNumber: currentAdmission.roomNumber,
            ward: currentAdmission.ward,
            admissionReason: currentAdmission.admissionReason
          } : null,
          isAdmitted: !!currentAdmission,
          fullName: kycData?.fullName,
          phoneNumber: kycData?.phoneNumber,
          bloodType: healthProfile?.bloodType
        };
      });
      res.json(enrichedPatients);
    } catch (error) {
      console.error("Failed to fetch hospital patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });
  app.get("/api/hospital/all-doctors", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital || hospital.role !== "hospital") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const hospitalKyc = await storage.getKYC(hospital.id);
      const effectiveHospitalName = hospital.hospitalName || hospitalKyc?.institutionName;
      const [affiliatedDoctors, affiliatedByKyc, hospitalTreatments, allDoctors] = await Promise.all([
        effectiveHospitalName ? storage.getUsersByHospital(effectiveHospitalName, "doctor") : Promise.resolve([]),
        effectiveHospitalName ? storage.getUsersByKYCAffiliatedHospital(effectiveHospitalName, "doctor") : Promise.resolve([]),
        // Only fetch treatments for THIS hospital instead of all treatments
        storage.getTreatmentLogs(void 0, void 0, hospital.id),
        // Fallback: get all doctors if no hospital name is set
        !effectiveHospitalName ? storage.getUsersByRole("doctor") : Promise.resolve([])
      ]);
      const doctorIdsWithTreatments = [...new Set(hospitalTreatments.map((t) => t.doctorId).filter(Boolean))];
      const doctorMap = /* @__PURE__ */ new Map();
      for (const d of affiliatedDoctors) doctorMap.set(d.id, d);
      for (const d of affiliatedByKyc) if (!doctorMap.has(d.id)) doctorMap.set(d.id, d);
      const missingDoctorIds = doctorIdsWithTreatments.filter((id) => id && !doctorMap.has(id));
      if (missingDoctorIds.length > 0) {
        const missingDoctors = await Promise.all(missingDoctorIds.map((id) => storage.getUser(id)));
        for (const doc of missingDoctors) {
          if (doc && doc.role === "doctor") doctorMap.set(doc.id, doc);
        }
      }
      if (!effectiveHospitalName) {
        for (const d of allDoctors) if (!doctorMap.has(d.id)) doctorMap.set(d.id, d);
      }
      const doctors = Array.from(doctorMap.values());
      if (doctors.length === 0) {
        return res.json([]);
      }
      const allKyc = await Promise.all(doctors.map((d) => storage.getKYC(d.id)));
      const kycMap = new Map(doctors.map((d, i) => [d.id, allKyc[i]]));
      const treatmentsByDoctor = /* @__PURE__ */ new Map();
      for (const t of hospitalTreatments) {
        if (!t.doctorId) continue;
        if (!treatmentsByDoctor.has(t.doctorId)) treatmentsByDoctor.set(t.doctorId, []);
        treatmentsByDoctor.get(t.doctorId).push(t);
      }
      const enrichedDoctors = doctors.map((doctor) => {
        const doctorTreatments = treatmentsByDoctor.get(doctor.id) || [];
        const latestTreatment = doctorTreatments[0];
        const uniquePatients = new Set(doctorTreatments.map((t) => t.patientId));
        const kycData = kycMap.get(doctor.id);
        return {
          ...doctor,
          treatmentCount: doctorTreatments.length,
          patientCount: uniquePatients.size,
          specialization: kycData?.professionalLicense || "General Practice",
          lastActivity: latestTreatment?.treatmentDate || doctor.createdAt
        };
      });
      res.json(enrichedDoctors);
    } catch (error) {
      console.error("Failed to fetch hospital doctors:", error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });
  app.get("/api/hospital/all-emergency-responders", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital || hospital.role !== "hospital") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const hospitalKyc = await storage.getKYC(hospital.id);
      const effectiveHospitalName = hospital.hospitalName || hospitalKyc?.institutionName;
      const affiliatedByName = effectiveHospitalName ? await storage.getUsersByHospital(effectiveHospitalName, "emergency_responder") : [];
      const affiliatedByKyc = effectiveHospitalName ? await storage.getUsersByKYCAffiliatedHospital(effectiveHospitalName, "emergency_responder") : [];
      const allRespondersFallback = !effectiveHospitalName ? await storage.getUsersByRole("emergency_responder") : [];
      const responderMap = /* @__PURE__ */ new Map();
      for (const r of affiliatedByName) responderMap.set(r.id, r);
      for (const r of affiliatedByKyc) if (!responderMap.has(r.id)) responderMap.set(r.id, r);
      if (!effectiveHospitalName) {
        for (const r of allRespondersFallback) if (!responderMap.has(r.id)) responderMap.set(r.id, r);
      }
      const allResponders = Array.from(responderMap.values());
      const enrichedResponders = await Promise.all(allResponders.map(async (responder) => {
        const kycData = await storage.getKYC(responder.id);
        return {
          ...responder,
          professionalLicense: kycData?.professionalLicense || "N/A",
          joinedAt: responder.createdAt,
          status: responder.status
        };
      }));
      res.json(enrichedResponders);
    } catch (error) {
      console.error("Failed to fetch emergency responders:", error);
      res.status(500).json({ error: "Failed to fetch emergency responders" });
    }
  });
  app.post("/api/hospital/admit-patient", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      if (!walletAddress) {
        return res.status(401).json({ error: "Unauthorized - No wallet address provided" });
      }
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital || hospital.role !== "hospital") {
        return res.status(403).json({ error: "Forbidden - Only hospitals can admit patients" });
      }
      const validationResult = admitPatientSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult.error.errors
        });
      }
      const { patientId, doctorId, admissionReason, roomNumber, ward } = validationResult.data;
      const patient = await storage.getUser(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (patient.role !== "patient") {
        return res.status(400).json({ error: "User is not a patient" });
      }
      if (doctorId) {
        const doctor = await storage.getUser(doctorId);
        if (!doctor || doctor.role !== "doctor") {
          return res.status(400).json({ error: "Invalid doctor ID" });
        }
      }
      const existingAdmission = await storage.getCurrentAdmission(patientId, hospital.id);
      if (existingAdmission) {
        return res.status(400).json({ error: "Patient is already admitted to this hospital" });
      }
      const admission = await storage.createPatientAdmission({
        patientId,
        hospitalId: hospital.id,
        doctorId,
        admittedById: hospital.id,
        admissionReason,
        roomNumber,
        ward,
        status: "admitted"
      });
      await storage.createAuditLog({
        userId: hospital.id,
        action: "patient_admitted",
        targetId: patientId,
        targetType: "patient",
        metadata: { admissionId: admission.id, roomNumber, ward }
      });
      res.json(admission);
    } catch (error) {
      console.error("Failed to admit patient:", error);
      res.status(500).json({ error: "Failed to admit patient" });
    }
  });
  app.post("/api/hospital/discharge-patient", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      if (!walletAddress) {
        return res.status(401).json({ error: "Unauthorized - No wallet address provided" });
      }
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital || hospital.role !== "hospital") {
        return res.status(403).json({ error: "Forbidden - Only hospitals can discharge patients" });
      }
      const validationResult = dischargePatientSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult.error.errors
        });
      }
      const { admissionId, dischargeNotes } = validationResult.data;
      const admissions = await storage.getPatientAdmissions({ hospitalId: hospital.id });
      const admission = admissions.find((a) => a.id === admissionId);
      if (!admission) {
        return res.status(404).json({ error: "Admission not found for this hospital" });
      }
      if (admission.status !== "admitted") {
        return res.status(400).json({ error: "Patient is not currently admitted (already discharged)" });
      }
      await storage.dischargePatient(admissionId, hospital.id, dischargeNotes);
      await storage.createAuditLog({
        userId: hospital.id,
        action: "patient_discharged",
        targetId: admission.patientId,
        targetType: "patient",
        metadata: { admissionId, dischargeNotes }
      });
      res.json({ success: true, message: "Patient discharged successfully" });
    } catch (error) {
      console.error("Failed to discharge patient:", error);
      res.status(500).json({ error: "Failed to discharge patient" });
    }
  });
  app.get("/api/hospital/activity-logs", async (req, res) => {
    try {
      const walletAddress = req.headers["x-wallet-address"];
      const hospital = await storage.getUserByWalletAddress(walletAddress);
      if (!hospital || hospital.role !== "hospital") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const allTreatments = await storage.getTreatmentLogs();
      const hospitalTreatments = allTreatments.filter((t) => t.hospitalId === hospital.id);
      const auditLogs = await storage.getAuditLogs(hospital.id);
      const activities = [
        ...hospitalTreatments.map((t) => ({
          id: t.id,
          type: "treatment",
          timestamp: t.treatmentDate,
          description: `Treatment recorded for patient`,
          patientId: t.patientId,
          doctorId: t.doctorId,
          details: {
            diagnosis: t.diagnosis,
            treatment: t.treatment
          }
        })),
        ...auditLogs.filter((log2) => ["access_requested", "access_granted", "claim_submitted", "qr_scanned"].includes(log2.action)).map((log2) => ({
          id: log2.id,
          type: "activity",
          timestamp: log2.timestamp,
          action: log2.action,
          targetType: log2.targetType,
          targetId: log2.targetId,
          metadata: log2.metadata
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
      res.json({
        totalTreatments: hospitalTreatments.length,
        recentActivities: activities
      });
    } catch (error) {
      console.error("Failed to fetch hospital activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });
  app.post("/api/qr/scan", async (req, res) => {
    try {
      const { qrData } = req.body;
      const walletAddress = req.headers["x-wallet-address"];
      const scanner = await storage.getUserByWalletAddress(walletAddress);
      if (!scanner) {
        return res.status(404).json({ error: "User not found" });
      }
      if (scanner.role !== "doctor" && scanner.role !== "emergency_responder" && scanner.role !== "hospital") {
        return res.status(403).json({ error: "Only doctors, emergency responders, and hospitals can scan QR codes" });
      }
      if (!qrData) {
        return res.status(400).json({ error: "QR data is required" });
      }
      let patientInfo;
      try {
        patientInfo = JSON.parse(qrData);
      } catch (error) {
        return res.status(400).json({ error: "Invalid QR code format" });
      }
      const patient = await storage.getUserByWalletAddress(patientInfo.walletAddress);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      await storage.createAuditLog({
        userId: scanner.id,
        action: "qr_scanned",
        targetType: "user",
        targetId: patient.id,
        metadata: {
          scannerRole: scanner.role,
          patientUid: patient.uid,
          scanTimestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      res.json({
        success: true,
        patientInfo: {
          uid: patientInfo.uid,
          username: patientInfo.username,
          profilePicture: patientInfo.profilePicture,
          hospitalName: patientInfo.hospitalName,
          emergencyDetails: patientInfo.emergencyDetails,
          timestamp: patientInfo.timestamp
        }
      });
    } catch (error) {
      console.error("QR scan error:", error);
      res.status(500).json({ error: "Failed to scan QR code" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}

// server/log.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// server/app.ts
async function createConfiguredApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path4 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path4.startsWith("/api")) {
        let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "\u2026";
        }
        log(logLine);
      }
    });
    next();
  });
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  return { app, server };
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
var devPlugins = [];
if (process.env.NODE_ENV !== "production") {
  if (process.env.REPL_ID !== void 0) {
    const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal").then(
      (m) => m.default || m
    );
    const cartographer = await import("@replit/vite-plugin-cartographer").then(
      (m) => m.cartographer()
    );
    const devBanner = await import("@replit/vite-plugin-dev-banner").then(
      (m) => m.devBanner()
    );
    devPlugins.push(runtimeErrorOverlay(), cartographer, devBanner);
  }
}
var vite_config_default = defineConfig({
  root: path2.resolve(process.cwd(), "client"),
  // ✅ Points Vite to your client folder
  plugins: [react(), ...devPlugins],
  resolve: {
    alias: {
      "@": path2.resolve(process.cwd(), "client", "src"),
      "@shared": path2.resolve(process.cwd(), "shared"),
      "@assets": path2.resolve(process.cwd(), "attached_assets"),
      // ✅ Ensures react-hook-form uses a compatible build
      "react-hook-form": path2.resolve(
        process.cwd(),
        "node_modules",
        "react-hook-form",
        "dist",
        "index.cjs.js"
      ),
      // Some Radix packages publish `exports` pointing to an `.mjs` entry
      // that may be missing in some installs. Point Vite at the actual
      // built file to avoid "Failed to resolve entry" during pre-bundle.
      "@radix-ui/react-popper": path2.resolve(
        process.cwd(),
        "node_modules",
        "@radix-ui",
        "react-popper",
        "dist",
        "index.js"
      )
    }
  },
  build: {
    outDir: path2.resolve(process.cwd(), "dist/public"),
    // ✅ Output goes here
    emptyOutDir: true
    // Cleans dist before build
  },
  server: {
    host: "0.0.0.0",
    port: 5e3,
    strictPort: false,
    hmr: {
      clientPort: 443
    },
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express2.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/billing-scheduler.ts
import cron from "node-cron";
function startBillingScheduler() {
  const schedule = process.env.NODE_ENV === "production" ? "0 2 1 * *" : "0 */6 * * *";
  cron.schedule(schedule, async () => {
    console.log(`[Billing Scheduler] Starting monthly billing cycle at ${(/* @__PURE__ */ new Date()).toISOString()}`);
    try {
      const providers = await storage.getInsuranceProviders();
      let totalProcessed = 0;
      let totalDisconnected = 0;
      for (const provider of providers) {
        try {
          const connections = await storage.getProviderConnections(provider.id);
          const connectedPatients = connections.filter((c) => c.status === "connected");
          for (const connection of connectedPatients) {
            const paymentSuccessful = Math.random() > 0.1;
            if (paymentSuccessful) {
              await storage.updateConnectionBilling(
                connection.id,
                /* @__PURE__ */ new Date(),
                0
              );
              totalProcessed++;
            } else {
              const newMissedCount = (connection.missedPaymentsCount || 0) + 1;
              await storage.updateConnectionBilling(
                connection.id,
                connection.lastBillingDate || /* @__PURE__ */ new Date(),
                newMissedCount
              );
              if (newMissedCount >= 3) {
                await storage.disconnectInsurance(connection.id);
                await storage.createAuditLog({
                  userId: connection.patientId,
                  action: "insurance_auto_disconnected",
                  targetType: "insurance_connection",
                  targetId: connection.id,
                  metadata: {
                    reason: "3 consecutive missed payments",
                    missedPaymentsCount: newMissedCount,
                    providerId: provider.id,
                    providerName: provider.providerName
                  }
                });
                console.log(`[Billing Scheduler] Auto-disconnected patient ${connection.patientId} from ${provider.providerName} (${newMissedCount} missed payments)`);
                totalDisconnected++;
              } else {
                console.log(`[Billing Scheduler] Payment failed for patient ${connection.patientId} (${newMissedCount} missed payments)`);
              }
            }
          }
          await storage.createAuditLog({
            userId: provider.userId,
            action: "monthly_billing_processed_auto",
            targetType: "insurance_provider",
            targetId: provider.id,
            metadata: {
              connectedPatients: connectedPatients.length,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          });
        } catch (error) {
          console.error(`[Billing Scheduler] Error processing billing for provider ${provider.id}:`, error);
        }
      }
      console.log(`[Billing Scheduler] Completed monthly billing cycle. Processed: ${totalProcessed}, Disconnected: ${totalDisconnected}`);
    } catch (error) {
      console.error("[Billing Scheduler] Error in billing cycle:", error);
    }
  });
  console.log(`[Billing Scheduler] Initialized with schedule: ${schedule}`);
  console.log(`[Billing Scheduler] ${process.env.NODE_ENV === "production" ? "Monthly billing will run on the 1st at 2:00 AM" : "Development mode: Billing runs every 6 hours for testing"}`);
}

// server/index.ts
(async () => {
  const { app, server } = await createConfiguredApp();
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  startBillingScheduler();
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
