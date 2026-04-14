import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Building2, Landmark, ChevronRight, ChevronLeft } from 'lucide-react'
import { propertiesApi, loanApi } from '@/api'
import { useActiveProperty } from '@/hooks/useActiveProperty'
import { Button } from '@/components/ui'

type Step = 'property' | 'loan'

interface PropertyForm {
  name: string
  address: string
  city: string
  state: string
  purchasePrice: string
  purchaseDate: string
  possessionDate: string
  builderName: string
  areaSqft: string
}

interface LoanForm {
  bankName: string
  sanctionAmount: string
  disbursedAmount: string
  interestRate: string
  tenureMonths: string
  startDate: string
  loanAccountNumber: string
}

const PROPERTY_DEFAULTS: PropertyForm = {
  name: '', address: '', city: '', state: '',
  purchasePrice: '', purchaseDate: '', possessionDate: '',
  builderName: '', areaSqft: '',
}

const LOAN_DEFAULTS: LoanForm = {
  bankName: '', sanctionAmount: '', disbursedAmount: '',
  interestRate: '', tenureMonths: '', startDate: '', loanAccountNumber: '',
}

export default function SetupPage() {
  const navigate = useNavigate()
  const setPropertyId = useActiveProperty(s => s.setPropertyId)

  const [step, setStep] = useState<Step>('property')
  const [property, setProperty] = useState<PropertyForm>(PROPERTY_DEFAULTS)
  const [loan, setLoan] = useState<LoanForm>(LOAN_DEFAULTS)
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null)

  const createProperty = useMutation({
    mutationFn: () => propertiesApi.create({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      purchasePrice: parseFloat(property.purchasePrice),
      purchaseDate: property.purchaseDate,
      possessionDate: property.possessionDate,
      builderName: property.builderName || undefined,
      areaSqft: property.areaSqft ? parseFloat(property.areaSqft) : undefined,
    }),
    onSuccess: (data) => {
      setCreatedPropertyId(data.id)
      setStep('loan')
    },
  })

  const createLoan = useMutation({
    mutationFn: () => loanApi.create(createdPropertyId!, {
      bankName: loan.bankName,
      sanctionAmount: parseFloat(loan.sanctionAmount),
      disbursedAmount: parseFloat(loan.disbursedAmount),
      interestRate: parseFloat(loan.interestRate),
      tenureMonths: parseInt(loan.tenureMonths),
      startDate: loan.startDate,
      loanAccountNumber: loan.loanAccountNumber || undefined,
    }),
    onSuccess: () => {
      setPropertyId(createdPropertyId!)
      navigate('/dashboard')
    },
  })

  const handleSkipLoan = () => {
    setPropertyId(createdPropertyId!)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-400 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">
            PropTrack <span className="text-brand-400">AI</span>
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6 px-1">
          {(['property', 'loan'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3 flex-1">
              <div className={`flex items-center gap-2 ${step === s ? 'text-brand-600' : step === 'loan' && s === 'property' ? 'text-green-600' : 'text-gray-300'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2
                  ${step === s ? 'border-brand-400 bg-brand-50 text-brand-600' :
                    step === 'loan' && s === 'property' ? 'border-green-500 bg-green-50 text-green-600' :
                    'border-gray-200 text-gray-400'}`}>
                  {step === 'loan' && s === 'property' ? '✓' : i + 1}
                </div>
                <span className="text-sm font-medium capitalize">{s} details</span>
              </div>
              {i === 0 && <div className={`flex-1 h-px ${step === 'loan' ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {/* ── Step 1: Property ───────────────────────────────── */}
          {step === 'property' && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Building2 size={18} className="text-brand-400" />
                <h2 className="text-lg font-semibold text-gray-900">Your Property</h2>
              </div>

              {createProperty.isError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                  Failed to create property. Please try again.
                </div>
              )}

              <div className="space-y-4">
                <Field label="Property name" required>
                  <input className={input} placeholder="e.g. Prestige Lakeside Habitat - 3BHK"
                    value={property.name} onChange={e => setProperty(p => ({ ...p, name: e.target.value }))} />
                </Field>

                <Field label="Full address" required>
                  <input className={input} placeholder="Flat no, tower, society name"
                    value={property.address} onChange={e => setProperty(p => ({ ...p, address: e.target.value }))} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" required>
                    <input className={input} placeholder="Bengaluru"
                      value={property.city} onChange={e => setProperty(p => ({ ...p, city: e.target.value }))} />
                  </Field>
                  <Field label="State" required>
                    <input className={input} placeholder="Karnataka"
                      value={property.state} onChange={e => setProperty(p => ({ ...p, state: e.target.value }))} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Purchase price (₹)" required>
                    <input className={input} type="number" placeholder="8500000"
                      value={property.purchasePrice} onChange={e => setProperty(p => ({ ...p, purchasePrice: e.target.value }))} />
                  </Field>
                  <Field label="Area (sq ft)">
                    <input className={input} type="number" placeholder="1250"
                      value={property.areaSqft} onChange={e => setProperty(p => ({ ...p, areaSqft: e.target.value }))} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Purchase date" required>
                    <input className={input} type="date"
                      value={property.purchaseDate} onChange={e => setProperty(p => ({ ...p, purchaseDate: e.target.value }))} />
                  </Field>
                  <Field label="Possession date" required>
                    <input className={input} type="date"
                      value={property.possessionDate} onChange={e => setProperty(p => ({ ...p, possessionDate: e.target.value }))} />
                  </Field>
                </div>

                <Field label="Builder name">
                  <input className={input} placeholder="Prestige Group"
                    value={property.builderName} onChange={e => setProperty(p => ({ ...p, builderName: e.target.value }))} />
                </Field>
              </div>

              <Button
                className="w-full justify-center mt-6"
                loading={createProperty.isPending}
                onClick={() => createProperty.mutate()}
                disabled={!property.name || !property.address || !property.city || !property.state || !property.purchasePrice || !property.purchaseDate || !property.possessionDate}
              >
                Continue <ChevronRight size={15} />
              </Button>
            </>
          )}

          {/* ── Step 2: Loan ───────────────────────────────────── */}
          {step === 'loan' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Landmark size={18} className="text-brand-400" />
                <h2 className="text-lg font-semibold text-gray-900">Home Loan Details</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">Skip if you paid in full or want to add later.</p>

              {createLoan.isError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                  Failed to create loan. Please try again.
                </div>
              )}

              <div className="space-y-4">
                <Field label="Bank name" required>
                  <input className={input} placeholder="HDFC Bank"
                    value={loan.bankName} onChange={e => setLoan(l => ({ ...l, bankName: e.target.value }))} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sanction amount (₹)" required>
                    <input className={input} type="number" placeholder="6500000"
                      value={loan.sanctionAmount} onChange={e => setLoan(l => ({ ...l, sanctionAmount: e.target.value }))} />
                  </Field>
                  <Field label="Disbursed amount (₹)" required>
                    <input className={input} type="number" placeholder="6500000"
                      value={loan.disbursedAmount} onChange={e => setLoan(l => ({ ...l, disbursedAmount: e.target.value }))} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Interest rate (% p.a.)" required>
                    <input className={input} type="number" step="0.05" placeholder="8.75"
                      value={loan.interestRate} onChange={e => setLoan(l => ({ ...l, interestRate: e.target.value }))} />
                  </Field>
                  <Field label="Tenure (months)" required>
                    <input className={input} type="number" placeholder="240"
                      value={loan.tenureMonths} onChange={e => setLoan(l => ({ ...l, tenureMonths: e.target.value }))} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="EMI start date" required>
                    <input className={input} type="date"
                      value={loan.startDate} onChange={e => setLoan(l => ({ ...l, startDate: e.target.value }))} />
                  </Field>
                  <Field label="Loan account number">
                    <input className={input} placeholder="Optional"
                      value={loan.loanAccountNumber} onChange={e => setLoan(l => ({ ...l, loanAccountNumber: e.target.value }))} />
                  </Field>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setStep('property')}>
                  <ChevronLeft size={15} /> Back
                </Button>
                <Button
                  className="flex-1 justify-center"
                  loading={createLoan.isPending}
                  onClick={() => createLoan.mutate()}
                  disabled={!loan.bankName || !loan.sanctionAmount || !loan.disbursedAmount || !loan.interestRate || !loan.tenureMonths || !loan.startDate}
                >
                  Save & go to dashboard
                </Button>
              </div>

              <button
                onClick={handleSkipLoan}
                className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip for now — add loan details later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const input = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"

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