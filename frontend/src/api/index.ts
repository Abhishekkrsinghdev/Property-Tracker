import api from './client'
import type {
  AuthResponse,
  LoginRequest,
  DashboardSummary,
  Payment,
  EmiScheduleEntry,
  Document,
  Property,
  Loan,
  PartnerSummary,
  ValuationHistory,
} from '@/types'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data).then(r => r.data),

  register: (data: { email: string; password: string; fullName: string }) =>
    api.post<AuthResponse>('/auth/register', data).then(r => r.data),

  logout: () => api.post('/auth/logout'),
}

// ── Properties ────────────────────────────────────────────────────────────────
export const propertiesApi = {
  getAll: () =>
    api.get<Property[]>('/properties').then(r => r.data),

  getById: (id: string) =>
    api.get<Property>(`/properties/${id}`).then(r => r.data),

  create: (data: {
    name: string
    address: string
    city: string
    state: string
    areaSqft?: number
    purchasePrice: number
    purchaseDate: string
    possessionDate: string
    builderName?: string
    partnerUserId?: string
  }) => api.post<Property>('/properties', data).then(r => r.data),

  updateValuation: (id: string, data: { amount: number; valuationDate: string; source?: string }) =>
    api.patch<Property>(`/properties/${id}/valuation`, data).then(r => r.data),

  getPartners: (id: string) =>
    api.get<PartnerSummary[]>(`/properties/${id}/partners`).then(r => r.data),

  getValuationHistory: (id: string) =>
    api.get<ValuationHistory[]>(`/properties/${id}/valuation-history`).then(r => r.data),

  invitePartner: (id: string, data: { email: string; sharePercent: number }) =>
    api.post<{ message: string; existingUser: boolean; partnerEmail: string }>(
      `/properties/${id}/partners/invite`, data
    ).then(r => r.data),
}

// ── Loan ──────────────────────────────────────────────────────────────────────
export const loanApi = {
  create: (propertyId: string, data: {
    bankName: string
    sanctionAmount: number
    disbursedAmount: number
    interestRate: number
    tenureMonths: number
    startDate: string
    loanAccountNumber?: string
  }) => api.post<Loan>(`/properties/${propertyId}/loan`, data).then(r => r.data),

  get: (propertyId: string) =>
    api.get<Loan>(`/properties/${propertyId}/loan`).then(r => r.data),

  getSchedule: (propertyId: string) =>
    api.get<EmiScheduleEntry[]>(`/properties/${propertyId}/loan/schedule`).then(r => r.data),

  markEmiPaid: (propertyId: string, emiId: string, data: { paidDate: string; paidAmount?: number }) =>
    api.patch<EmiScheduleEntry>(`/properties/${propertyId}/loan/emis/${emiId}/pay`, data).then(r => r.data),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: (propertyId: string) =>
    api.get<DashboardSummary>(`/dashboard/${propertyId}`).then(r => r.data),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  getAll: (propertyId: string) =>
    api.get<Payment[]>(`/properties/${propertyId}/payments`).then(r => r.data),

  create: (propertyId: string, data: {
    amount: number
    paymentDate: string
    paymentType: string
    utrNumber?: string
    bankName?: string
    notes?: string
  }) => api.post<Payment>(`/properties/${propertyId}/payments`, data).then(r => r.data),

  uploadScreenshot: (propertyId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ screenshotUrl: string; ocrResult: Partial<Payment> }>(
      `/properties/${propertyId}/payments/upload-screenshot`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data)
  },
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  getAll: (propertyId: string) =>
    api.get<Document[]>(`/properties/${propertyId}/documents`).then(r => r.data),

  upload: (propertyId: string, file: File, docType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('docType', docType)
    return api.post<Document>(
      `/properties/${propertyId}/documents`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data)
  },
}