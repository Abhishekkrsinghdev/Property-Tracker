import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Plus, X, Users, ArrowUpRight, ArrowDownRight, UploadCloud, UserPlus, CheckCircle2 } from 'lucide-react'
import { paymentsApi, propertiesApi } from '@/api'
import { useActiveProperty } from '@/hooks/useActiveProperty'
import { useAuthStore } from '@/store/authStore'
import {
  Card, CardHeader, CardBody, Spinner,
  EmptyState, PageHeader, Button, Badge
} from '@/components/ui'
import { formatINR, formatDate } from '@/lib/utils'
import type { Payment } from '@/types'

const PAYMENT_TYPES = ['EMI_SHARE', 'DOWN_PAYMENT', 'PREPAYMENT', 'OTHER'] as const

export default function PaymentsPage() {
  const propertyId = useActiveProperty(s => s.propertyId)
  const user = useAuthStore(s => s.user)
  const [showModal, setShowModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', propertyId],
    queryFn: () => paymentsApi.getAll(propertyId!),
    enabled: !!propertyId,
  })

  const { data: partners } = useQuery({
    queryKey: ['partners', propertyId],
    queryFn: () => propertiesApi.getPartners(propertyId!),
    enabled: !!propertyId,
  })

  if (!propertyId) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <EmptyState title="No property selected" description="Set up your property first from the dashboard." icon={<CreditCard size={32} />} />
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8" /></div>
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Payments"
        subtitle="Co-ownership ledger and partner contribution tracking"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} /> Log payment
          </Button>
        }
      />

      {/* Partner summary cards */}
      {partners && partners.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Users size={14} className="text-gray-400" /> Partners
            </p>
            <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(true)}>
              <UserPlus size={13} /> Invite partner
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map(p => (
            <Card key={p.user.id}>
              <CardBody className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold shrink-0">
                  {p.user.fullName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.user.fullName}
                      {p.user.id === user?.id && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{p.sharePercent}% share</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{formatINR(p.totalPaid)} paid</span>
                    <div className={`flex items-center gap-1 text-sm font-medium ${p.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {p.balance >= 0
                        ? <ArrowUpRight size={14} />
                        : <ArrowDownRight size={14} />}
                      {formatINR(Math.abs(p.balance))}
                      <span className="text-xs font-normal text-gray-400 ml-0.5">
                        {p.balance >= 0 ? 'ahead' : 'behind'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-400 rounded-full transition-all duration-500"
                      style={{ width: `${p.expectedShare > 0 ? Math.min(100, Math.round((p.totalPaid / p.expectedShare) * 100)) : 0}%` }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users size={15} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-900">
              Payment History
              {payments && <span className="ml-2 text-xs text-gray-400 font-normal">{payments.length} transactions</span>}
            </p>
          </div>
        </CardHeader>

        {!payments || payments.length === 0 ? (
          <CardBody>
            <EmptyState
              title="No payments yet"
              description="Log your first payment to start tracking contributions."
              icon={<CreditCard size={28} />}
              action={<Button size="sm" onClick={() => setShowModal(true)}><Plus size={13} /> Log payment</Button>}
            />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Paid by', 'Amount', 'Type', 'UTR', 'Notes'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map(payment => (
                  <PaymentRow key={payment.id} payment={payment} currentUserId={user?.id} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <LogPaymentModal
          propertyId={propertyId}
          onClose={() => setShowModal(false)}
        />
      )}

      {showInviteModal && (
        <InvitePartnerModal
          propertyId={propertyId}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

// ── Payment row ───────────────────────────────────────────────────────────────
function PaymentRow({ payment, currentUserId }: { payment: Payment; currentUserId?: string }) {
  const isYou = payment.paidBy.id === currentUserId
  const typeColors: Record<string, string> = {
    EMI_SHARE: 'info',
    DOWN_PAYMENT: 'success',
    PREPAYMENT: 'warning',
    OTHER: 'default',
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(payment.paymentDate)}</td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-medium">
            {payment.paidBy.fullName[0]}
          </div>
          <span className="text-sm text-gray-700">
            {isYou ? 'You' : payment.paidBy.fullName}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{formatINR(payment.amount)}</td>
      <td className="px-5 py-3.5">
        <Badge variant={typeColors[payment.paymentType] as 'info' | 'success' | 'warning' | 'default'}>
          {payment.paymentType.replace('_', ' ')}
        </Badge>
      </td>
      <td className="px-5 py-3.5 text-sm font-mono text-gray-500 text-xs">
        {payment.utrNumber ?? '—'}
      </td>
      <td className="px-5 py-3.5 text-sm text-gray-400 max-w-xs truncate">
        {payment.notes ?? '—'}
      </td>
    </tr>
  )
}

// ── Log Payment Modal ──────────────────────────────────────────────────────────
function LogPaymentModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'EMI_SHARE' as typeof PAYMENT_TYPES[number],
    utrNumber: '',
    bankName: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)
    try {
      const res = await paymentsApi.uploadScreenshot(propertyId, file)
      if (res.ocrResult) {
        setForm(f => ({
          ...f,
          amount: res.ocrResult?.amount ? String(res.ocrResult.amount) : f.amount,
          paymentDate: res.ocrResult?.paymentDate || f.paymentDate,
          utrNumber: res.ocrResult?.utrNumber || f.utrNumber,
          bankName: res.ocrResult?.bankName || f.bankName,
        }))
      }
    } catch (err) {
      setError('Failed to upload and process screenshot.')
    } finally {
      setIsUploading(false)
    }
  }

  const update = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }))

  const create = useMutation({
    mutationFn: () => paymentsApi.create(propertyId, {
      amount: parseFloat(form.amount),
      paymentDate: form.paymentDate,
      paymentType: form.paymentType,
      utrNumber: form.utrNumber || undefined,
      bankName: form.bankName || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['partners', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', propertyId] })
      onClose()
    },
    onError: () => setError('Failed to log payment. Please try again.'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Log Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative">
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 text-brand-600 py-2">
                <Spinner className="w-5 h-5" />
                <span className="text-sm font-medium">Extracting details with AI...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-gray-500 py-2">
                <UploadCloud size={20} className="text-gray-400 mb-1" />
                <span className="text-sm font-medium text-gray-700">Upload Receipt / Screenshot</span>
                <span className="text-xs">Claude Vision will extract payment details</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Amount (₹) <span className="text-red-400">*</span></label>
              <input type="number" value={form.amount} onChange={update('amount')}
                className={inputClass} placeholder="42000" />
            </div>
            <div>
              <label className={labelClass}>Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.paymentDate} onChange={update('paymentDate')}
                className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Payment type <span className="text-red-400">*</span></label>
            <select value={form.paymentType} onChange={update('paymentType')} className={inputClass}>
              {PAYMENT_TYPES.map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>UTR number</label>
              <input type="text" value={form.utrNumber} onChange={update('utrNumber')}
                className={inputClass} placeholder="UTR / Transaction ref" />
            </div>
            <div>
              <label className={labelClass}>Bank</label>
              <input type="text" value={form.bankName} onChange={update('bankName')}
                className={inputClass} placeholder="HDFC, GPay..." />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={update('notes')}
              className={`${inputClass} resize-none`} rows={2} placeholder="Optional notes" />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
          <Button
            className="flex-1 justify-center"
            loading={create.isPending}
            onClick={() => create.mutate()}
            disabled={!form.amount || parseFloat(form.amount) <= 0}
          >
            Save payment
          </Button>
        </div>
      </div>
    </div>
  )
}

const labelClass = "block text-xs font-medium text-gray-700 mb-1.5"
const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"

// ── Invite Partner Modal ───────────────────────────────────────────────────────
function InvitePartnerModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [sharePercent, setSharePercent] = useState('50')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const invite = useMutation({
    mutationFn: () => propertiesApi.invitePartner(propertyId, {
      email,
      sharePercent: parseFloat(sharePercent),
    }),
    onSuccess: (data) => {
      setSuccess(data.message)
      queryClient.invalidateQueries({ queryKey: ['partners', propertyId] })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to send invite. Please try again.')
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <UserPlus size={16} className="text-brand-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Invite Partner</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">{success}</p>
              <p className="text-xs text-gray-400">The partner will appear in your list once they log in.</p>
              <Button onClick={onClose} className="mt-2">Done</Button>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>Partner's email address <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  className={inputClass}
                  placeholder="partner@example.com"
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  If they're already registered, they'll be added instantly. Otherwise, we'll send them an invite link.
                </p>
              </div>

              <div>
                <label className={labelClass}>Ownership share (%) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={sharePercent}
                  onChange={(e) => setSharePercent(e.target.value)}
                  className={inputClass}
                  placeholder="50"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
                <Button
                  className="flex-1 justify-center"
                  loading={invite.isPending}
                  onClick={() => invite.mutate()}
                  disabled={!email || !sharePercent}
                >
                  Send invite
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}