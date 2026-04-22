import { sql } from "./db";
import type {
  User, InsertUser,
  KYC, InsertKYC,
  HealthProfile, InsertHealthProfile,
  MedicalRecord, InsertMedicalRecord,
  AccessControl, InsertAccessControl,
  TreatmentLog, InsertTreatmentLog,
  InsuranceProvider, InsertInsuranceProvider,
  PatientInsuranceConnection, InsertPatientInsuranceConnection,
  Claim, InsertClaim,
  AuditLog, InsertAuditLog,
  EmergencyQR, InsertEmergencyQR,
  ConsultationRequest, InsertConsultationRequest,
  ChatMessage, InsertChatMessage,
  PatientAdmission, InsertPatientAdmission,
  SubscriptionPayment, InsertSubscriptionPayment,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<void>;
  suspendUser(id: string, suspendedUntil: Date | null): Promise<void>;
  deleteUserPermanently(id: string): Promise<void>;
  updateUserRole(id: string, role: string): Promise<void>;
  updateUserProfilePicture(id: string, profilePicture: string): Promise<void>;
  updateUserInfo(id: string, data: Partial<InsertUser>): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // KYC
  getKYC(userId: string): Promise<KYC | undefined>;
  getKYCById(id: string): Promise<KYC | undefined>;
  createKYC(kycData: InsertKYC): Promise<KYC>;
  updateKYCStatus(id: string, status: string, reviewedBy: string, rejectionReason?: string): Promise<void>;
  getPendingKYC(): Promise<KYC[]>;

  // Health Profiles
  getHealthProfile(userId: string): Promise<HealthProfile | undefined>;
  createHealthProfile(profile: InsertHealthProfile): Promise<HealthProfile>;
  updateHealthProfile(userId: string, profile: Partial<InsertHealthProfile>): Promise<void>;

  // Medical Records
  getMedicalRecords(userId: string): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;

  // Access Control
  getAccessRequests(patientId: string): Promise<AccessControl[]>;
  getAccessRequestsByRequester(requesterId: string): Promise<AccessControl[]>;
  getGrantedAccess(patientId: string): Promise<AccessControl[]>;
  getHospitalNotifiedAccessRequests(hospitalName: string): Promise<AccessControl[]>;
  createAccessRequest(access: InsertAccessControl): Promise<AccessControl>;
  updateAccessStatus(id: string, status: string): Promise<void>;
  checkAccess(patientId: string, requesterId: string): Promise<boolean>;

  // Treatment Logs
  getTreatmentLogs(patientId?: string, doctorId?: string, hospitalId?: string): Promise<TreatmentLog[]>;
  createTreatmentLog(log: InsertTreatmentLog): Promise<TreatmentLog>;

  // Insurance Providers
  getInsuranceProviders(): Promise<InsuranceProvider[]>;
  getInsuranceProviderByUserId(userId: string): Promise<InsuranceProvider | undefined>;
  createInsuranceProvider(provider: InsertInsuranceProvider): Promise<InsuranceProvider>;
  updateInsuranceProvider(id: string, data: Partial<InsertInsuranceProvider>): Promise<void>;

  // Patient Insurance Connections
  getPatientInsuranceConnections(patientId: string): Promise<any[]>;
  getProviderConnections(providerId: string): Promise<any[]>;
  createInsuranceConnectionRequest(connection: InsertPatientInsuranceConnection): Promise<PatientInsuranceConnection>;
  updateConnectionStatus(id: string, status: string, reviewedBy?: string, rejectionReason?: string): Promise<void>;
  updateConnectionBilling(id: string, lastBillingDate: Date, missedPaymentsCount: number): Promise<void>;
  disconnectInsurance(id: string): Promise<void>;

  // Claims
  getClaims(params: { patientId?: string; hospitalId?: string; connectionId?: string }): Promise<any[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaimStatus(id: string, status: string, data?: Partial<Claim>): Promise<void>;
  approveClaimByPatient(claimId: string, patientNote?: string): Promise<void>;
  rejectClaimByPatient(claimId: string, patientNote?: string): Promise<void>;

  // Audit Logs
  getAuditLogs(userId?: string): Promise<AuditLog[]>;
  getUserAuditLogs(userId: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Emergency QR
  getEmergencyQR(userId: string): Promise<EmergencyQR | undefined>;
  createEmergencyQR(qr: InsertEmergencyQR): Promise<EmergencyQR>;
  incrementQRScanCount(userId: string): Promise<void>;

  // Consultation Requests
  getConsultationRequests(params: { patientId?: string; doctorId?: string }): Promise<ConsultationRequest[]>;
  createConsultationRequest(request: InsertConsultationRequest): Promise<ConsultationRequest>;
  updateConsultationStatus(id: string, status: string, rejectionReason?: string): Promise<void>;
  getConsultationById(id: string): Promise<ConsultationRequest | undefined>;

  // Chat Messages
  getChatMessages(consultationId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  markMessagesAsRead(consultationId: string, receiverId: string): Promise<void>;
  getUsersByHospital(hospitalName: string, role?: string): Promise<User[]>;
  getUsersByKYCAffiliatedHospital(hospitalName: string, role?: string): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;

  // Patient Admissions
  getPatientAdmissions(params: { patientId?: string; hospitalId?: string; status?: string }): Promise<PatientAdmission[]>;
  getCurrentAdmission(patientId: string, hospitalId: string): Promise<PatientAdmission | undefined>;
  createPatientAdmission(admission: InsertPatientAdmission): Promise<PatientAdmission>;
  dischargePatient(id: string, dischargedById: string, dischargeNotes?: string): Promise<void>;
  updatePatientAdmissionStatus(id: string, status: string): Promise<void>;
  
  // Subscription Payments
  getSubscriptionPayment(userId: string, role: string): Promise<SubscriptionPayment | undefined>;
  getSubscriptionPaymentByTxHash(transactionHash: string): Promise<SubscriptionPayment | undefined>;
  createSubscriptionPayment(payment: InsertSubscriptionPayment): Promise<SubscriptionPayment>;
  checkActiveSubscription(userId: string, role: string): Promise<boolean>;
}

/**
 * PostgreSQL-based storage implementation using Supabase
 * All methods use Zod-schema validated types
 */
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await sql`SELECT * FROM users WHERE id = ${id}`;
      return result[0] as User | undefined;
    } catch (error) {
      console.error("Error fetching user:", error);
      return undefined;
    }
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    try {
      const result = await sql`SELECT * FROM users WHERE wallet_address = ${walletAddress.trim()} LIMIT 1`;
      return result[0] as User | undefined;
    } catch (error) {
      console.error("Error fetching user by wallet:", error);
      return undefined;
    }
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    try {
      const result = await sql`SELECT * FROM users WHERE uid = ${uid} LIMIT 1`;
      return result[0] as User | undefined;
    } catch (error) {
      console.error("Error fetching user by UID:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
      return result[0] as User | undefined;
    } catch (error) {
      console.error("Error fetching user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = insertUser.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO users (
        id, wallet_address, uid, username, email, role, status, profile_picture, hospital_name, created_at
      ) VALUES (
        ${id}, ${insertUser.walletAddress}, ${insertUser.uid || null}, ${insertUser.username || null},
        ${insertUser.email || null}, ${insertUser.role || "patient"},
        ${insertUser.status || "pending"}, ${insertUser.profilePicture || null},
        ${insertUser.hospitalName || null}, ${now}
      )
      RETURNING *
    `;
    
    return result[0] as User;
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    await sql`UPDATE users SET status = ${status} WHERE id = ${id}`;
  }

  async suspendUser(id: string, suspendedUntil: Date | null): Promise<void> {
    await sql`UPDATE users SET status = 'suspended', suspended_until = ${suspendedUntil} WHERE id = ${id}`;
  }

  async deleteUserPermanently(id: string): Promise<void> {
    try {
      await sql.begin(async (trx) => {
        await trx`DELETE FROM audit_logs WHERE user_id = ${id}`;
        await trx`DELETE FROM users WHERE id = ${id}`;
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    await sql`UPDATE users SET role = ${role}, status = 'verified' WHERE id = ${id}`;
  }

  async updateUserProfilePicture(id: string, profilePicture: string): Promise<void> {
    await sql`UPDATE users SET profile_picture = ${profilePicture} WHERE id = ${id}`;
  }

  async updateUserInfo(id: string, data: Partial<InsertUser>): Promise<void> {
    if (data.email) {
      await sql`UPDATE users SET email = ${data.email} WHERE id = ${id}`;
    }
    if (data.username) {
      await sql`UPDATE users SET username = ${data.username} WHERE id = ${id}`;
    }
    if (data.role) {
      await sql`UPDATE users SET role = ${data.role} WHERE id = ${id}`;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const result = await sql`SELECT * FROM users ORDER BY created_at DESC`;
      return result as User[];
    } catch (error) {
      console.error("Error fetching all users:", error);
      return [];
    }
  }

  // KYC
  async getKYC(userId: string): Promise<KYC | undefined> {
    try {
      const result = await sql`SELECT * FROM kyc WHERE user_id = ${userId} ORDER BY submitted_at DESC LIMIT 1`;
      return result[0] as KYC | undefined;
    } catch {
      return undefined;
    }
  }

  async getKYCById(id: string): Promise<KYC | undefined> {
    try {
      const result = await sql`SELECT * FROM kyc WHERE id = ${id}`;
      return result[0] as KYC | undefined;
    } catch {
      return undefined;
    }
  }

  async createKYC(kycData: InsertKYC): Promise<KYC> {
    const id = kycData.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO kyc (id, user_id, full_name, submitted_at, status)
      VALUES (${id}, ${kycData.userId}, ${kycData.fullName}, ${now}, ${kycData.status || "pending"})
      RETURNING *
    `;
    
    return result[0] as KYC;
  }

  async updateKYCStatus(id: string, status: string, reviewedBy: string, rejectionReason?: string): Promise<void> {
    await sql`UPDATE kyc SET status = ${status}, reviewed_by = ${reviewedBy}, reviewed_at = ${new Date()}, rejection_reason = ${rejectionReason || null} WHERE id = ${id}`;
  }

  async getPendingKYC(): Promise<KYC[]> {
    try {
      const result = await sql`SELECT * FROM kyc WHERE status = 'pending' ORDER BY submitted_at DESC`;
      return result as KYC[];
    } catch {
      return [];
    }
  }

  // Health Profiles
  async getHealthProfile(userId: string): Promise<HealthProfile | undefined> {
    try {
      const result = await sql`SELECT * FROM health_profiles WHERE user_id = ${userId} LIMIT 1`;
      return result[0] as HealthProfile | undefined;
    } catch {
      return undefined;
    }
  }

  async createHealthProfile(profile: InsertHealthProfile): Promise<HealthProfile> {
    const id = profile.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO health_profiles (id, user_id, updated_at)
      VALUES (${id}, ${profile.userId}, ${now})
      RETURNING *
    `;
    
    return result[0] as HealthProfile;
  }

  async updateHealthProfile(userId: string, profileData: Partial<InsertHealthProfile>): Promise<void> {
    await sql`UPDATE health_profiles SET updated_at = ${new Date()} WHERE user_id = ${userId}`;
  }

  // Medical Records
  async getMedicalRecords(userId: string): Promise<MedicalRecord[]> {
    try {
      const result = await sql`SELECT * FROM medical_records WHERE user_id = ${userId} ORDER BY uploaded_at DESC`;
      return result as MedicalRecord[];
    } catch {
      return [];
    }
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const id = record.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO medical_records (id, user_id, title, record_type, file_cid, file_hash, uploaded_by, uploaded_at)
      VALUES (${id}, ${record.userId}, ${record.title}, ${record.recordType}, ${record.fileCID}, ${record.fileHash}, ${record.uploadedBy}, ${now})
      RETURNING *
    `;
    
    return result[0] as MedicalRecord;
  }

  // Access Control
  async getAccessRequests(patientId: string): Promise<AccessControl[]> {
    try {
      const result = await sql`SELECT * FROM access_control WHERE patient_id = ${patientId} ORDER BY requested_at DESC`;
      return result as AccessControl[];
    } catch {
      return [];
    }
  }

  async getAccessRequestsByRequester(requesterId: string): Promise<AccessControl[]> {
    try {
      const result = await sql`SELECT * FROM access_control WHERE requester_id = ${requesterId} ORDER BY requested_at DESC`;
      return result as AccessControl[];
    } catch {
      return [];
    }
  }

  async getGrantedAccess(patientId: string): Promise<AccessControl[]> {
    try {
      const result = await sql`SELECT * FROM access_control WHERE patient_id = ${patientId} AND status = 'granted' ORDER BY responded_at DESC`;
      return result as AccessControl[];
    } catch {
      return [];
    }
  }

  async getHospitalNotifiedAccessRequests(hospitalName: string): Promise<AccessControl[]> {
    try {
      const result = await sql`
        SELECT ac.* FROM access_control ac
        JOIN users u ON u.id = ac.patient_id
        WHERE ac.hospital_notified = true AND ac.is_emergency = true AND u.hospital_name = ${hospitalName}
        ORDER BY ac.requested_at DESC
      `;
      return result as AccessControl[];
    } catch {
      return [];
    }
  }

  async createAccessRequest(access: InsertAccessControl): Promise<AccessControl> {
    const id = access.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO access_control (id, patient_id, requester_id, access_type, status, requested_at)
      VALUES (${id}, ${access.patientId}, ${access.requesterId}, ${access.accessType || "full_access"}, ${access.status || "pending"}, ${now})
      RETURNING *
    `;
    
    return result[0] as AccessControl;
  }

  async updateAccessStatus(id: string, status: string): Promise<void> {
    await sql`UPDATE access_control SET status = ${status}, responded_at = ${new Date()} WHERE id = ${id}`;
  }

  async checkAccess(patientId: string, requesterId: string): Promise<boolean> {
    try {
      const result = await sql`
        SELECT 1 FROM access_control
        WHERE patient_id = ${patientId} AND requester_id = ${requesterId} AND status = 'granted'
        LIMIT 1
      `;
      return result.length > 0;
    } catch {
      return false;
    }
  }

  // Treatment Logs
  async getTreatmentLogs(patientId?: string, doctorId?: string, hospitalId?: string): Promise<TreatmentLog[]> {
    try {
      const conditions = [];
      if (patientId) conditions.push(sql`patient_id = ${patientId}`);
      if (doctorId) conditions.push(sql`doctor_id = ${doctorId}`);
      if (hospitalId) conditions.push(sql`hospital_id = ${hospitalId}`);
      
      let query = sql`SELECT * FROM treatment_logs`;
      if (conditions.length > 0) {
        query = sql`SELECT * FROM treatment_logs WHERE ${conditions.join(sql` AND `)}`;
      }
      
      const result = await query;
      return result as TreatmentLog[];
    } catch {
      return [];
    }
  }

  async createTreatmentLog(log: InsertTreatmentLog): Promise<TreatmentLog> {
    const id = log.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO treatment_logs (id, patient_id, doctor_id, diagnosis, treatment, created_at)
      VALUES (${id}, ${log.patientId}, ${log.doctorId}, ${log.diagnosis || null}, ${log.treatment || null}, ${now})
      RETURNING *
    `;
    
    return result[0] as TreatmentLog;
  }

  // Insurance Providers
  async getInsuranceProviders(): Promise<InsuranceProvider[]> {
    try {
      const result = await sql`SELECT * FROM insurance_providers WHERE is_active = true`;
      return result as InsuranceProvider[];
    } catch {
      return [];
    }
  }

  async getInsuranceProviderByUserId(userId: string): Promise<InsuranceProvider | undefined> {
    try {
      const result = await sql`SELECT * FROM insurance_providers WHERE user_id = ${userId} LIMIT 1`;
      return result[0] as InsuranceProvider | undefined;
    } catch {
      return undefined;
    }
  }

  async createInsuranceProvider(provider: InsertInsuranceProvider): Promise<InsuranceProvider> {
    const id = provider.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO insurance_providers (id, user_id, provider_name, monthly_fee, created_at)
      VALUES (${id}, ${provider.userId}, ${provider.providerName}, ${provider.monthlyFee}, ${now})
      RETURNING *
    `;
    
    return result[0] as InsuranceProvider;
  }

  async updateInsuranceProvider(id: string, data: Partial<InsertInsuranceProvider>): Promise<void> {
    if (data.providerName) {
      await sql`UPDATE insurance_providers SET provider_name = ${data.providerName} WHERE id = ${id}`;
    }
  }

  // Patient Insurance Connections
  async getPatientInsuranceConnections(patientId: string): Promise<any[]> {
    try {
      const result = await sql`
        SELECT pic.*, ip.provider_name, ip.monthly_fee
        FROM patient_insurance_connections pic
        LEFT JOIN insurance_providers ip ON pic.provider_id = ip.id
        WHERE pic.patient_id = ${patientId}
        ORDER BY pic.requested_at DESC
      `;
      return result;
    } catch {
      return [];
    }
  }

  async getProviderConnections(providerId: string): Promise<any[]> {
    try {
      const result = await sql`
        SELECT pic.*, u.uid, u.username
        FROM patient_insurance_connections pic
        LEFT JOIN users u ON pic.patient_id = u.id
        WHERE pic.provider_id = ${providerId}
        ORDER BY pic.requested_at DESC
      `;
      return result;
    } catch {
      return [];
    }
  }

  async createInsuranceConnectionRequest(connection: InsertPatientInsuranceConnection): Promise<PatientInsuranceConnection> {
    const id = connection.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO patient_insurance_connections (id, patient_id, provider_id, status, requested_at)
      VALUES (${id}, ${connection.patientId}, ${connection.providerId}, ${connection.status || "pending"}, ${now})
      RETURNING *
    `;
    
    return result[0] as PatientInsuranceConnection;
  }

  async updateConnectionStatus(id: string, status: string, reviewedBy?: string, rejectionReason?: string): Promise<void> {
    await sql`
      UPDATE patient_insurance_connections
      SET status = ${status}, reviewed_by = ${reviewedBy || null}, rejection_reason = ${rejectionReason || null}
      WHERE id = ${id}
    `;
  }

  async updateConnectionBilling(id: string, lastBillingDate: Date, missedPaymentsCount: number): Promise<void> {
    await sql`UPDATE patient_insurance_connections SET last_billing_date = ${lastBillingDate}, missed_payments_count = ${missedPaymentsCount} WHERE id = ${id}`;
  }

  async disconnectInsurance(id: string): Promise<void> {
    await sql`UPDATE patient_insurance_connections SET status = 'disconnected', disconnected_at = ${new Date()} WHERE id = ${id}`;
  }

  // Claims
  async getClaims(params: { patientId?: string; hospitalId?: string; connectionId?: string }): Promise<any[]> {
    try {
      const conditions = [];
      if (params.patientId) conditions.push(sql`c.patient_id = ${params.patientId}`);
      if (params.hospitalId) conditions.push(sql`c.hospital_id = ${params.hospitalId}`);
      if (params.connectionId) conditions.push(sql`c.connection_id = ${params.connectionId}`);
      
      let query = sql`SELECT c.*, u.hospital_name FROM claims c LEFT JOIN users u ON c.hospital_id = u.id`;
      if (conditions.length > 0) {
        query = sql`SELECT c.*, u.hospital_name FROM claims c LEFT JOIN users u ON c.hospital_id = u.id WHERE ${conditions.join(sql` AND `)}`;
      }
      
      const result = await query;
      return result;
    } catch {
      return [];
    }
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const id = claim.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO claims (id, claim_number, patient_id, hospital_id, amount, claim_type, status, submitted_at)
      VALUES (${id}, ${claim.claimNumber}, ${claim.patientId}, ${claim.hospitalId}, ${claim.amount}, ${claim.claimType}, ${claim.status || "pending"}, ${now})
      RETURNING *
    `;
    
    return result[0] as Claim;
  }

  async updateClaimStatus(id: string, status: string, data?: Partial<Claim>): Promise<void> {
    await sql`UPDATE claims SET status = ${status}, responded_at = ${new Date()} WHERE id = ${id}`;
  }

  async approveClaimByPatient(claimId: string, patientNote?: string): Promise<void> {
    await sql`UPDATE claims SET status = 'approved', responded_at = ${new Date()}, patient_note = ${patientNote || null} WHERE id = ${claimId}`;
  }

  async rejectClaimByPatient(claimId: string, patientNote?: string): Promise<void> {
    await sql`UPDATE claims SET status = 'rejected', responded_at = ${new Date()}, patient_note = ${patientNote || null} WHERE id = ${claimId}`;
  }

  // Audit Logs
  async getAuditLogs(userId?: string): Promise<AuditLog[]> {
    try {
      let query = sql`SELECT * FROM audit_logs`;
      if (userId) {
        query = sql`SELECT * FROM audit_logs WHERE user_id = ${userId}`;
      }
      const result = await query;
      return result as AuditLog[];
    } catch {
      return [];
    }
  }

  async getUserAuditLogs(userId: string): Promise<AuditLog[]> {
    try {
      const result = await sql`SELECT * FROM audit_logs WHERE user_id = ${userId} ORDER BY timestamp DESC`;
      return result as AuditLog[];
    } catch {
      return [];
    }
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = log.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO audit_logs (id, user_id, action, timestamp)
      VALUES (${id}, ${log.userId || null}, ${log.action}, ${now})
      RETURNING *
    `;
    
    return result[0] as AuditLog;
  }

  // Emergency QR
  async getEmergencyQR(userId: string): Promise<EmergencyQR | undefined> {
    try {
      const result = await sql`SELECT * FROM emergency_qr_codes WHERE user_id = ${userId} LIMIT 1`;
      return result[0] as EmergencyQR | undefined;
    } catch {
      return undefined;
    }
  }

  async createEmergencyQR(qrData: InsertEmergencyQR): Promise<EmergencyQR> {
    const id = qrData.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO emergency_qr_codes (id, user_id, qr_data, signed_token, generated_at)
      VALUES (${id}, ${qrData.userId}, ${qrData.qrData}, ${qrData.signedToken}, ${now})
      RETURNING *
    `;
    
    return result[0] as EmergencyQR;
  }

  async incrementQRScanCount(userId: string): Promise<void> {
    await sql`UPDATE emergency_qr_codes SET scan_count = scan_count + 1 WHERE user_id = ${userId}`;
  }

  // Consultation Requests
  async getConsultationRequests(params: { patientId?: string; doctorId?: string }): Promise<ConsultationRequest[]> {
    try {
      const conditions = [];
      if (params.patientId) conditions.push(sql`patient_id = ${params.patientId}`);
      if (params.doctorId) conditions.push(sql`doctor_id = ${params.doctorId}`);
      
      let query = sql`SELECT * FROM consultation_requests`;
      if (conditions.length > 0) {
        query = sql`SELECT * FROM consultation_requests WHERE ${conditions.join(sql` AND `)}`;
      }
      
      const result = await query;
      return result as ConsultationRequest[];
    } catch {
      return [];
    }
  }

  async createConsultationRequest(request: InsertConsultationRequest): Promise<ConsultationRequest> {
    const id = request.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO consultation_requests (id, patient_id, doctor_id, reason, status, requested_at)
      VALUES (${id}, ${request.patientId}, ${request.doctorId}, ${request.reason || null}, ${request.status || "pending"}, ${now})
      RETURNING *
    `;
    
    return result[0] as ConsultationRequest;
  }

  async updateConsultationStatus(id: string, status: string, rejectionReason?: string): Promise<void> {
    await sql`UPDATE consultation_requests SET status = ${status}, responded_at = ${new Date()}, rejection_reason = ${rejectionReason || null} WHERE id = ${id}`;
  }

  async getConsultationById(id: string): Promise<ConsultationRequest | undefined> {
    try {
      const result = await sql`SELECT * FROM consultation_requests WHERE id = ${id}`;
      return result[0] as ConsultationRequest | undefined;
    } catch {
      return undefined;
    }
  }

  // Chat Messages
  async getChatMessages(consultationId: string): Promise<ChatMessage[]> {
    try {
      const result = await sql`SELECT * FROM chat_messages WHERE consultation_id = ${consultationId} ORDER BY sent_at`;
      return result as ChatMessage[];
    } catch {
      return [];
    }
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = message.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO chat_messages (id, consultation_id, sender_id, receiver_id, message, sent_at)
      VALUES (${id}, ${message.consultationId}, ${message.senderId}, ${message.receiverId}, ${message.message}, ${now})
      RETURNING *
    `;
    
    return result[0] as ChatMessage;
  }

  async markMessagesAsRead(consultationId: string, receiverId: string): Promise<void> {
    await sql`UPDATE chat_messages SET is_read = true WHERE consultation_id = ${consultationId} AND receiver_id = ${receiverId}`;
  }

  async getUsersByHospital(hospitalName: string, role?: string): Promise<User[]> {
    try {
      let query = sql`SELECT * FROM users WHERE hospital_name = ${hospitalName}`;
      if (role) {
        query = sql`SELECT * FROM users WHERE hospital_name = ${hospitalName} AND role = ${role}`;
      }
      const result = await query;
      return result as User[];
    } catch {
      return [];
    }
  }

  async getUsersByKYCAffiliatedHospital(hospitalName: string, role?: string): Promise<User[]> {
    try {
      let query = sql`SELECT u.* FROM users u JOIN kyc k ON u.id = k.user_id WHERE k.affiliated_hospital = ${hospitalName}`;
      if (role) {
        query = sql`SELECT u.* FROM users u JOIN kyc k ON u.id = k.user_id WHERE k.affiliated_hospital = ${hospitalName} AND u.role = ${role}`;
      }
      const result = await query;
      return result as User[];
    } catch {
      return [];
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const result = await sql`SELECT * FROM users WHERE role = ${role}`;
      return result as User[];
    } catch {
      return [];
    }
  }

  // Patient Admissions
  async getPatientAdmissions(params: { patientId?: string; hospitalId?: string; status?: string }): Promise<PatientAdmission[]> {
    try {
      const conditions = [];
      if (params.patientId) conditions.push(sql`patient_id = ${params.patientId}`);
      if (params.hospitalId) conditions.push(sql`hospital_id = ${params.hospitalId}`);
      if (params.status) conditions.push(sql`status = ${params.status}`);
      
      let query = sql`SELECT * FROM patient_admissions`;
      if (conditions.length > 0) {
        query = sql`SELECT * FROM patient_admissions WHERE ${conditions.join(sql` AND `)}`;
      }
      
      const result = await query;
      return result as PatientAdmission[];
    } catch {
      return [];
    }
  }

  async getCurrentAdmission(patientId: string, hospitalId: string): Promise<PatientAdmission | undefined> {
    try {
      const result = await sql`
        SELECT * FROM patient_admissions
        WHERE patient_id = ${patientId} AND hospital_id = ${hospitalId} AND status = 'admitted'
        LIMIT 1
      `;
      return result[0] as PatientAdmission | undefined;
    } catch {
      return undefined;
    }
  }

  async createPatientAdmission(admission: InsertPatientAdmission): Promise<PatientAdmission> {
    const id = admission.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO patient_admissions (id, patient_id, hospital_id, admission_date, status)
      VALUES (${id}, ${admission.patientId}, ${admission.hospitalId}, ${now}, ${admission.status || "admitted"})
      RETURNING *
    `;
    
    return result[0] as PatientAdmission;
  }

  async dischargePatient(id: string, dischargedById: string, dischargeNotes?: string): Promise<void> {
    await sql`
      UPDATE patient_admissions
      SET status = 'discharged', discharge_date = ${new Date()}, discharged_by_id = ${dischargedById}, discharge_notes = ${dischargeNotes || null}
      WHERE id = ${id}
    `;
  }

  async updatePatientAdmissionStatus(id: string, status: string): Promise<void> {
    await sql`UPDATE patient_admissions SET status = ${status} WHERE id = ${id}`;
  }

  // Subscription Payments
  async getSubscriptionPayment(userId: string, role: string): Promise<SubscriptionPayment | undefined> {
    try {
      const result = await sql`SELECT * FROM subscription_payments WHERE user_id = ${userId} AND role = ${role} ORDER BY paid_at DESC LIMIT 1`;
      return result[0] as SubscriptionPayment | undefined;
    } catch {
      return undefined;
    }
  }

  async getSubscriptionPaymentByTxHash(transactionHash: string): Promise<SubscriptionPayment | undefined> {
    try {
      const result = await sql`SELECT * FROM subscription_payments WHERE transaction_hash = ${transactionHash} LIMIT 1`;
      return result[0] as SubscriptionPayment | undefined;
    } catch {
      return undefined;
    }
  }

  async createSubscriptionPayment(payment: InsertSubscriptionPayment): Promise<SubscriptionPayment> {
    const id = payment.id || crypto.randomUUID();
    const now = new Date();
    
    const result = await sql`
      INSERT INTO subscription_payments (id, user_id, role, amount, transaction_hash, status, paid_at)
      VALUES (${id}, ${payment.userId}, ${payment.role}, ${payment.amount}, ${payment.transactionHash}, ${payment.status || "pending"}, ${now})
      RETURNING *
    `;
    
    return result[0] as SubscriptionPayment;
  }

  async checkActiveSubscription(userId: string, role: string): Promise<boolean> {
    try {
      const result = await sql`
        SELECT 1 FROM subscription_payments
        WHERE user_id = ${userId} AND role = ${role} AND status = 'confirmed' AND expires_at > NOW()
        LIMIT 1
      `;
      return result.length > 0;
    } catch {
      return false;
    }
  }
}

// Create and export singleton instance
export const storage = new DatabaseStorage();
