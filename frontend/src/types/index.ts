// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  fullName: string
  role: 'OWNER' | 'PARTNER'
}

// ── Property ──────────────────────────────────────────────────────────────────
export interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  areaSqft: number | null
  purchasePrice: number
  purchaseDate: string
  possessionDate: string
  builderName: string | null
  currentValuation: number | null
  status: 'UNDER_CONSTRUCTION' | 'READY_TO_MOVE' | 'POSSESSION_TAKEN' | 'RENTED' | 'SOLD'
  createdAt: string
}

// ── Valuation History ─────────────────────────────────────────────────────────
export interface ValuationHistory {
  id: string
  valuationDate: string
  amount: number
  source: string
  notes: string | null
}

// ── Loan ──────────────────────────────────────────────────────────────────────
export interface Loan {
  id: string
  propertyId: string
  bankName: string
  sanctionAmount: number
  disbursedAmount: number
  interestRate: number
  tenureMonths: number
  emiAmount: number
  startDate: string
  loanAccountNumber: string | null
  status: 'ACTIVE' | 'CLOSED' | 'FORECLOSED'
  // Computed fields from backend
  outstandingPrincipal: number
  totalInterestPaid: number
  totalPrincipalPaid: number
  emisPaid: number
  emisRemaining: number
}

// ── EMI ───────────────────────────────────────────────────────────────────────
export interface EmiScheduleEntry {
  id: string
  emiNumber: number
  dueDate: string
  emiAmount: number
  principalComponent: number
  interestComponent: number
  balanceAfter: number
  status: 'PENDING' | 'PAID' | 'OVERDUE'
  paidDate: string | null
  paidAmount: number | null
}

// ── Payment ───────────────────────────────────────────────────────────────────
export interface Payment {
  id: string
  propertyId: string
  paidBy: User
  amount: number
  paymentDate: string
  paymentType: 'EMI_SHARE' | 'DOWN_PAYMENT' | 'PREPAYMENT' | 'OTHER'
  utrNumber: string | null
  bankName: string | null
  notes: string | null
  screenshotUrl: string | null
  ocrProcessed: boolean
  createdAt: string
}

// ── Partner Ledger ────────────────────────────────────────────────────────────
export interface PartnerSummary {
  user: User
  sharePercent: number
  totalPaid: number
  expectedShare: number
  balance: number  // positive = overpaid, negative = underpaid
}

// ── Document ──────────────────────────────────────────────────────────────────
export interface Document {
  id: string
  propertyId: string
  docType: 'SALE_AGREEMENT' | 'ALLOTMENT_LETTER' | 'SANCTION_LETTER' | 'RECEIPT' | 'OTHER'
  fileName: string
  storageUrl: string
  aiSummary: string | null
  aiProcessed: boolean
  uploadedBy: User
  createdAt: string
}

// ── Dashboard Summary (assembled by Spring Boot) ──────────────────────────────
export interface DashboardSummary {
  property: Property
  loan: Loan | null
  totalInvested: number
  outstandingPrincipal: number
  totalInterestPaid: number
  emisPaid: number
  emisRemaining: number
  nextEmiDueDate: string | null
  nextEmiAmount: number | null
  partnerSummaries: PartnerSummary[]
  daysUntilPossession: number
}

// ── API Generic Wrapper ────────────────────────────────────────────────────────
export interface ApiError {
  status: number
  message: string
  details: Record<string, string> | null
}