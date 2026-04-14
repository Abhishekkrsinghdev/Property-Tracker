import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, TrendingUp, Landmark, CheckCircle2, ChevronLeft } from 'lucide-react'
import { propertiesApi, loanApi } from '@/api'
import { useActiveProperty } from '@/hooks/useActiveProperty'
import {
  Card, CardHeader, CardBody,
  Spinner, EmptyState, PageHeader, Button, Badge
} from '@/components/ui'
import { formatINR, formatDate } from '@/lib/utils'

export default function PropertySettingsPage() {
  const propertyId = useActiveProperty(s => s.propertyId)
  const [isAddingLoan, setIsAddingLoan] = useState(false)

  const { data: property, isLoading: propLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => propertiesApi.getById(propertyId!),
    enabled: !!propertyId,
  })

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan', propertyId],
    queryFn: () => loanApi.get(propertyId!),
    enabled: !!propertyId,
  })

  if (!propertyId) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <EmptyState title="No property selected" icon={<Settings size={32} />} />
      </div>
    )
  }

  if (propLoading || loanLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8" /></div>
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Property Settings"
        subtitle="Update valuation, view property and loan details"
      />

      {/* Property details — read only */}
      {property && (
        <Card className="mb-5">
          <CardHeader>
            <p className="text-sm font-medium text-gray-900">Property Details</p>
          </CardHeader>
          <CardBody className="space-y-3">
            <Row label="Name" value={property.name} />
            <Row label="Address" value={`${property.address}, ${property.city}, ${property.state}`} />
            {property.areaSqft && <Row label="Area" value={`${property.areaSqft} sq ft`} />}
            <Row label="Purchase price" value={formatINR(property.purchasePrice)} />
            <Row label="Purchase date" value={formatDate(property.purchaseDate)} />
            <Row label="Possession date" value={formatDate(property.possessionDate)} />
            {property.builderName && <Row label="Builder" value={property.builderName} />}
            <Row label="Status" value={
              <Badge variant={property.status === 'UNDER_CONSTRUCTION' ? 'warning' : 'success'}>
                {property.status.replace(/_/g, ' ')}
              </Badge>
            } />
          </CardBody>
        </Card>
      )}

      {/* Update current valuation */}
      {property && (
        <UpdateValuationCard
          propertyId={propertyId}
          currentValuation={property.currentValuation}
          purchasePrice={property.purchasePrice}
        />
      )}

      {/* Loan details — read only */}
      {loan && (
        <Card className="mt-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-900">Loan Details</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <Row label="Bank" value={loan.bankName} />
            <Row label="Sanction amount" value={formatINR(loan.sanctionAmount)} />
            <Row label="Disbursed amount" value={formatINR(loan.disbursedAmount)} />
            <Row label="Interest rate" value={`${loan.interestRate}% p.a.`} />
            <Row label="Tenure" value={`${loan.tenureMonths} months`} />
            <Row label="Monthly EMI" value={formatINR(loan.emiAmount)} />
            <Row label="EMI start date" value={formatDate(loan.startDate)} />
            {loan.loanAccountNumber && <Row label="Loan account" value={loan.loanAccountNumber} />}
          </CardBody>
        </Card>
      )}

      {!loan && !isAddingLoan && (
        <Card className="mt-5">
          <CardBody>
            <EmptyState
              title="No loan added"
              description="You skipped adding loan details during setup."
              icon={<Landmark size={28} />}
              action={
                <Button onClick={() => setIsAddingLoan(true)} className="mt-4">
                  Add loan details
                </Button>
              }
            />
          </CardBody>
        </Card>
      )}

      {!loan && isAddingLoan && (
        <Card className="mt-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-900">Add Loan Details</p>
            </div>
          </CardHeader>
          <CardBody>
            <AddLoanForm propertyId={propertyId} onCancel={() => setIsAddingLoan(false)} />
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// ── Update Valuation Card ──────────────────────────────────────────────────────
function UpdateValuationCard({
  propertyId, currentValuation, purchasePrice
}: {
  propertyId: string
  currentValuation: number | null
  purchasePrice: number
}) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(currentValuation ? String(currentValuation) : '')
  const [saved, setSaved] = useState(false)

  const update = useMutation({
    mutationFn: () => propertiesApi.updateValuation(propertyId, {
      amount: parseFloat(amount),
      valuationDate: new Date().toISOString().split('T')[0],
      source: 'MANUAL',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', propertyId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const appreciation = amount && parseFloat(amount) > 0
    ? (((parseFloat(amount) - purchasePrice) / purchasePrice) * 100).toFixed(1)
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-brand-400" />
          <p className="text-sm font-medium text-gray-900">Current Valuation</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-gray-500">
          Update your property's estimated market value. This affects the appreciation chart on your dashboard.
          Log a new valuation whenever you get a broker estimate or hear of comparable sales.
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Current market value (₹)
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setSaved(false) }}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            placeholder={String(purchasePrice)}
          />
          {appreciation && (
            <p className={`text-xs mt-1 ${parseFloat(appreciation) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {parseFloat(appreciation) >= 0 ? '+' : ''}{appreciation}% vs purchase price ({formatINR(purchasePrice)})
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => update.mutate()}
            loading={update.isPending}
            disabled={!amount || parseFloat(amount) <= 0 || saved}
          >
            {saved ? <><CheckCircle2 size={14} /> Saved</> : 'Update valuation'}
          </Button>
          {currentValuation && (
            <span className="text-xs text-gray-400">
              Last: {formatINR(currentValuation)}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

// ── Row helper ────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="text-sm text-gray-400 whitespace-nowrap pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-900 max-w-[65%] text-right break-words">{value}</span>
    </div>
  )
}

// ── Add Loan Form ─────────────────────────────────────────────────────────────
interface LoanFormState {
  bankName: string
  sanctionAmount: string
  disbursedAmount: string
  interestRate: string
  tenureMonths: string
  startDate: string
  loanAccountNumber: string
}

function AddLoanForm({ propertyId, onCancel }: { propertyId: string, onCancel: () => void }) {
  const queryClient = useQueryClient()
  const [loan, setLoan] = useState<LoanFormState>({
    bankName: '', sanctionAmount: '', disbursedAmount: '',
    interestRate: '', tenureMonths: '', startDate: '', loanAccountNumber: ''
  })

  const createLoan = useMutation({
    mutationFn: () => loanApi.create(propertyId, {
      bankName: loan.bankName,
      sanctionAmount: parseFloat(loan.sanctionAmount),
      disbursedAmount: parseFloat(loan.disbursedAmount),
      interestRate: parseFloat(loan.interestRate),
      tenureMonths: parseInt(loan.tenureMonths),
      startDate: loan.startDate,
      loanAccountNumber: loan.loanAccountNumber || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', propertyId] })
      onCancel()
    },
  })

  return (
    <div className="space-y-4">
      <Field label="Bank name" required>
        <input className={inputClass} placeholder="HDFC Bank"
          value={loan.bankName} onChange={e => setLoan(l => ({ ...l, bankName: e.target.value }))} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sanction amount (₹)" required>
          <input className={inputClass} type="number" placeholder="6500000"
            value={loan.sanctionAmount} onChange={e => setLoan(l => ({ ...l, sanctionAmount: e.target.value }))} />
        </Field>
        <Field label="Disbursed amount (₹)" required>
          <input className={inputClass} type="number" placeholder="6500000"
            value={loan.disbursedAmount} onChange={e => setLoan(l => ({ ...l, disbursedAmount: e.target.value }))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Interest rate (% p.a.)" required>
          <input className={inputClass} type="number" step="0.05" placeholder="8.75"
            value={loan.interestRate} onChange={e => setLoan(l => ({ ...l, interestRate: e.target.value }))} />
        </Field>
        <Field label="Tenure (months)" required>
          <input className={inputClass} type="number" placeholder="240"
            value={loan.tenureMonths} onChange={e => setLoan(l => ({ ...l, tenureMonths: e.target.value }))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="EMI start date" required>
          <input className={inputClass} type="date"
            value={loan.startDate} onChange={e => setLoan(l => ({ ...l, startDate: e.target.value }))} />
        </Field>
        <Field label="Loan account number">
          <input className={inputClass} placeholder="Optional"
            value={loan.loanAccountNumber} onChange={e => setLoan(l => ({ ...l, loanAccountNumber: e.target.value }))} />
        </Field>
      </div>

      <div className="flex gap-3 !mt-6">
        <Button variant="secondary" onClick={onCancel} disabled={createLoan.isPending}>
          <ChevronLeft size={15} /> Cancel
        </Button>
        <Button
          className="flex-1 justify-center"
          loading={createLoan.isPending}
          onClick={() => createLoan.mutate()}
          disabled={!loan.bankName || !loan.sanctionAmount || !loan.disbursedAmount || !loan.interestRate || !loan.tenureMonths || !loan.startDate}
        >
          Save loan details
        </Button>
      </div>
    </div>
  )
}

const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}