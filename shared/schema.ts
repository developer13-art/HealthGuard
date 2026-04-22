import { z } from "zod";

// Users collection - stores wallet addresses and basic info
export const userSchema = z.object({
  id: z.string(),
  walletAddress: z.string(),
  uid: z.string(), // Blockchain-style UID
  username: z.string(),
  email: z.string().optional(),
  role: z.enum(["patient", "doctor", "hospital", "emergency_responder", "insurance_provider", "admin"]).default("patient"),
  status: z.enum(["pending", "verified", "suspended", "deleted"]).default("pending"),
  suspendedUntil: z.date().optional(), // null = permanent suspension, date = temporary
  profilePicture: z.string().optional(),
  hospitalName: z.string().optional(), // Hospital name for hospitals, or affiliated hospital for doctors/emergency responders
  createdAt: z.date(),
});

export type User = z.infer<typeof userSchema>;

// KYC collection - encrypted and stored per user
export const kycSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string().optional(),
  nationalId: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  documentType: z.enum(["passport", "national_id", "drivers_license"]).optional(),
  documentNumber: z.string().optional(),
  documentCID: z.string().optional(), // IPFS CID (simulated)
  professionalLicense: z.string().optional(), // For doctors/hospitals
  institutionName: z.string().optional(), // For hospitals/insurance
  affiliatedHospital: z.string().optional(), // Hospital selection for patients/doctors
  country: z.string().optional(), // For hospital applications
  state: z.string().optional(), // For hospital applications
  location: z.string().optional(), // For hospital applications (address/location)
  hospitalProfile: z.string().optional(), // For hospital applications (description/details)
  requestedRole: z.enum(["doctor", "hospital", "emergency_responder", "insurance_provider"]).optional(),
  providerName: z.string().optional(), // For insurance provider applications
  providerDescription: z.string().optional(), // For insurance provider applications
  monthlyFee: z.number().optional(), // For insurance provider applications
  coverageLimit: z.number().optional(), // For insurance provider applications
  coverageTypes: z.array(z.string()).optional(), // For insurance provider applications
  submittedAt: z.date(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  rejectionReason: z.string().optional(),
});

export type KYC = z.infer<typeof kycSchema>;
export const insertKYCSchema = kycSchema.omit({ id: true, submittedAt: true, reviewedAt: true, reviewedBy: true });
export type InsertKYC = z.infer<typeof insertKYCSchema>;

// Patient health profiles collection
export const healthProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bloodType: z.string().optional(), // A+, A-, B+, B-, AB+, AB-, O+, O-
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  height: z.number().optional(), // in cm
  weight: z.number().optional(), // in kg
  organDonor: z.boolean().default(false),
  updatedAt: z.date(),
});

export type HealthProfile = z.infer<typeof healthProfileSchema>;
export const insertHealthProfileSchema = healthProfileSchema.omit({ id: true, updatedAt: true });
export type InsertHealthProfile = z.infer<typeof insertHealthProfileSchema>;

// Medical records collection - encrypted files stored on IPFS
export const medicalRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  recordType: z.enum(["lab_report", "prescription", "imaging", "diagnosis", "treatment_plan"]),
  fileCID: z.string(), // IPFS CID (simulated)
  fileHash: z.string(), // SHA-256 hash for integrity
  fileName: z.string().optional(), // Original file name
  fileType: z.string().optional(), // MIME type (application/pdf, etc.)
  fileData: z.string().optional(), // Base64 encoded file data
  isEmergency: z.boolean().default(false), // Flag for emergency access
  uploadedBy: z.string(),
  uploadedAt: z.date(),
  encryptionKey: z.string().optional(), // Wrapped AES key (simulated)
});

export type MedicalRecord = z.infer<typeof medicalRecordSchema>;
export const insertMedicalRecordSchema = medicalRecordSchema.omit({ id: true, uploadedAt: true });
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

// Access control collection - who can access which records
export const accessControlSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  requesterId: z.string(),
  recordId: z.string().optional(),
  accessType: z.enum(["full", "emergency_only", "specific_record"]),
  status: z.enum(["pending", "granted", "revoked", "expired"]).default("pending"),
  reason: z.string().optional(),
  isEmergency: z.boolean().default(false), // Flag for emergency access requests
  proofImage: z.string().optional(), // Base64 encoded proof image for emergency requests
  proofDetails: z.string().optional(), // Additional details/context for the request
  hospitalNotified: z.boolean().default(false), // Whether patient's hospital was notified
  requestedAt: z.date(),
  respondedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  encryptedKey: z.string().optional(), // ECIES-wrapped key for this requester
});

export type AccessControl = z.infer<typeof accessControlSchema>;
export const insertAccessControlSchema = accessControlSchema.omit({ id: true, requestedAt: true, respondedAt: true });
export type InsertAccessControl = z.infer<typeof insertAccessControlSchema>;

// Treatment logs collection - signed by doctors
export const treatmentLogSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  hospitalId: z.string().optional(),
  diagnosis: z.string(),
  treatment: z.string(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  treatmentDate: z.date(),
  recordCID: z.string().optional(), // IPFS CID for full record
  doctorSignature: z.string(), // EIP-712 signature
  signatureHash: z.string(),
  treatmentFiles: z.array(z.object({ name: z.string(), type: z.string(), data: z.string() })).optional(), // Array of file objects with {name, type, data (base64)}
  createdAt: z.date(),
});

export type TreatmentLog = z.infer<typeof treatmentLogSchema>;
export const insertTreatmentLogSchema = treatmentLogSchema.omit({ id: true, createdAt: true });
export type InsertTreatmentLog = z.infer<typeof insertTreatmentLogSchema>;

// Insurance providers collection (companies)
export const insuranceProviderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  providerName: z.string(),
  description: z.string().optional(),
  monthlyFee: z.number(),
  coverageLimit: z.number().optional(),
  coverageTypes: z.array(z.string()).optional(), // emergency, outpatient, inpatient, surgery
  isActive: z.boolean().default(true),
  createdAt: z.date(),
});

export type InsuranceProvider = z.infer<typeof insuranceProviderSchema>;
export const insertInsuranceProviderSchema = insuranceProviderSchema.omit({ id: true, createdAt: true });
export type InsertInsuranceProvider = z.infer<typeof insertInsuranceProviderSchema>;

// Patient insurance connections collection (replaces enrollment and applications)
export const patientInsuranceConnectionSchema = z.object({
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
  rejectionReason: z.string().optional(),
});

export type PatientInsuranceConnection = z.infer<typeof patientInsuranceConnectionSchema>;
export const insertPatientInsuranceConnectionSchema = patientInsuranceConnectionSchema.omit({ id: true, requestedAt: true, approvedAt: true, disconnectedAt: true });
export type InsertPatientInsuranceConnection = z.infer<typeof insertPatientInsuranceConnectionSchema>;

// Insurance claims collection (simplified workflow)
export const claimSchema = z.object({
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
  paidAmount: z.number().optional(),
});

export type Claim = z.infer<typeof claimSchema>;
export const insertClaimSchema = claimSchema.omit({ id: true, submittedAt: true, respondedAt: true, paidAt: true });
export type InsertClaim = z.infer<typeof insertClaimSchema>;

// Audit log collection - immutable record of all actions
export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  action: z.string(), // access_requested, access_granted, access_revoked, record_added, claim_submitted, claim_approved, etc.
  targetId: z.string().optional(), // ID of affected resource
  targetType: z.string().optional(), // user, record, claim, access
  metadata: z.record(z.any()).optional(), // Additional context
  ipAddress: z.string().optional(),
  timestamp: z.date(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// Emergency QR codes collection
export const emergencyQRSchema = z.object({
  id: z.string(),
  userId: z.string(),
  qrData: z.string(), // JSON payload with emergency info
  signedToken: z.string(), // EIP-712 signature
  generatedAt: z.date(),
  expiresAt: z.date().optional(),
  scanCount: z.number().default(0),
});

export type EmergencyQR = z.infer<typeof emergencyQRSchema>;

// Consultation requests collection - patients request consultation from doctors
export const consultationRequestSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  hospitalName: z.string().optional(),
  reason: z.string(),
  status: z.enum(["pending", "accepted", "rejected", "completed"]).default("pending"),
  type: z.enum(["text", "video"]).default("text"),
  videoRoomId: z.string().optional(), // Jitsi Meet room ID for video consultations
  paymentPaid: z.boolean().default(false),
  paymentAmount: z.number().default(0), // in cents
  requestedAt: z.date(),
  respondedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
});

export type ConsultationRequest = z.infer<typeof consultationRequestSchema>;
export const insertConsultationRequestSchema = consultationRequestSchema.omit({ id: true, requestedAt: true, respondedAt: true });
export type InsertConsultationRequest = z.infer<typeof insertConsultationRequestSchema>;

// Chat messages - for consultation between patients and doctors
export const chatMessageSchema = z.object({
  id: z.string(),
  consultationId: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  message: z.string(),
  isRead: z.boolean().default(false),
  sentAt: z.date(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export const insertChatMessageSchema = chatMessageSchema.omit({ id: true, sentAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Patient admissions - track current hospital admissions and discharges
export const patientAdmissionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  hospitalId: z.string(),
  doctorId: z.string().optional(), // Doctor assigned to treat this patient
  admittedById: z.string().optional(), // Doctor or hospital staff who admitted
  dischargedById: z.string().optional(), // Doctor or hospital staff who discharged
  admissionDate: z.date(),
  dischargeDate: z.date().optional(),
  admissionReason: z.string().optional(),
  dischargeNotes: z.string().optional(),
  status: z.string().default("admitted"), // admitted, discharged, treated
  roomNumber: z.string().optional(),
  ward: z.string().optional(),
});

export type PatientAdmission = z.infer<typeof patientAdmissionSchema>;
export const insertPatientAdmissionSchema = patientAdmissionSchema.omit({ id: true, admissionDate: true, dischargeDate: true });
export type InsertPatientAdmission = z.infer<typeof insertPatientAdmissionSchema>;

// Subscription payments - tracks 20 BDAG annual subscription for hospitals & insurance providers
export const subscriptionPaymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  kycId: z.string().optional(),
  role: z.string(), // hospital or insurance_provider
  amount: z.number(), // 20 BDAG
  transactionHash: z.string(),
  fromAddress: z.string(),
  toAddress: z.string(), // Admin wallet address
  status: z.string().default("pending"), // pending, confirmed, failed
  paidAt: z.date(),
  expiresAt: z.date(), // One year from payment
});

export type SubscriptionPayment = z.infer<typeof subscriptionPaymentSchema>;
export const insertSubscriptionPaymentSchema = subscriptionPaymentSchema.omit({ id: true, paidAt: true });
export type InsertSubscriptionPayment = z.infer<typeof insertSubscriptionPaymentSchema>;
