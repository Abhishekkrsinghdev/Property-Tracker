import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Landmark, CheckCircle2, Clock, AlertCircle, Calculator, ChevronDown, ChevronUp } from 'lucide-react'
import { loanApi } from '@/api'
import { useActiveProperty } from '@/hooks/useActiveProperty'
import {
  Card, CardHeader, CardBody, Stat,
  Badge, Spinner, EmptyState, PageHeader, Button
} from '@/components/ui'
import { formatINR, formatDate } from '@/lib/utils'
import type { EmiScheduleEntry } from '@/types'

type Tab = 'schedule' | 'prepayment'

export default function LoanPage() {
  const propertyId = useActiveProperty(s => s.propertyId)
  const [tab, setTab] = useState<Tab>('schedule')

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan', propertyId],
    queryFn: () => loanApi.get(propertyId!),
    enabled: !!propertyId,
  })

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['schedule', propertyId],
    queryFn: () => loanApi.getSchedule(propertyId!),
    enabled: !!propertyId,
  })

  if (!propertyId) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <EmptyState title="No property selected" description="Set up your property first from the dashboard." icon={<Landmark size={32} />} />
      </div>
    )
  }

  if (loanLoading || scheduleLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8" /></div>
  }

  if (!loan) {
    return (
      <div className="p-8">
        <PageHeader title="Loan & EMIs" subtitle="No active loan found for this property" />
        <EmptyState title="No loan added yet" description="Add your home loan details during setup to track EMIs." icon={<Landmark size={32} />} />
      </div>
    )
  }

  const paidCount = schedule?.filter(e => e.status === 'PAID').length ?? 0
  const totalCount = schedule?.length ?? 0
  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

  return (
    <div className="p-8">
      <PageHeader
        title="Loan & EMIs"
        subtitle={`${loan.bankName} · ${loan.interestRate}% p.a. · ${loan.tenureMonths} months`}
        action={<Badge variant={loan.status === 'ACTIVE' ? 'success' : 'default'}>{loan.status}</Badge>}
      />

      {/* Loan summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Outstanding" value={formatINR(loan.outstandingPrincipal)} sub="Principal remaining" />
        <Stat label="Monthly EMI" value={formatINR(loan.emiAmount)} sub={`Due on ${new Date(loan.startDate).getDate()}th`} />
        <Stat label="Interest Paid" value={formatINR(loan.totalInterestPaid)} sub="Cumulative" />
        <Stat label="EMIs Remaining" value={String(loan.emisRemaining)} sub={`${loan.emisPaid} of ${totalCount} paid`} />
      </div>

      {/* Loan progress bar */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Repayment progress</p>
            <span className="text-sm font-semibold text-gray-900">{progressPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-400">
            <span>{formatINR(loan.totalPrincipalPaid)} paid</span>
            <span>{formatINR(loan.outstandingPrincipal)} remaining</span>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {(['schedule', 'prepayment'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'schedule' ? 'EMI Schedule' : 'Prepayment Calculator'}
          </button>
        ))}
      </div>

      {tab === 'schedule' && schedule && (
        <EmiScheduleTable schedule={schedule} propertyId={propertyId} />
      )}

      {tab === 'prepayment' && loan && (
        <PrepaymentCalculator
          outstandingPrincipal={loan.outstandingPrincipal}
          interestRate={loan.interestRate}
          remainingMonths={loan.emisRemaining}
        />
      )}
    </div>
  )
}

// ── EMI Schedule Table ─────────────────────────────────────────────────────────
function EmiScheduleTable({ schedule, propertyId }: { schedule: EmiScheduleEntry[]; propertyId: string }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const markPaid = useMutation({
    mutationFn: (emiId: string) =>
      loanApi.markEmiPaid(propertyId, emiId, {
        paidDate: new Date().toISOString().split('T')[0],
      }),
    onMutate: (emiId) => setMarkingId(emiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['loan', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', propertyId] })
    },
    onSettled: () => setMarkingId(null),
  })

  const statusBadge = (status: EmiScheduleEntry['status']) => {
    if (status === 'PAID') return <Badge variant="success"><CheckCircle2 size={11} className="mr-1" />Paid</Badge>
    if (status === 'OVERDUE') return <Badge variant="danger"><AlertCircle size={11} className="mr-1" />Overdue</Badge>
    return <Badge variant="default"><Clock size={11} className="mr-1" />Pending</Badge>
  }

  // Show paid EMIs collapsed by default — show last 3 paid + all pending/overdue
  const paidEmis = schedule.filter(e => e.status === 'PAID')
  const unpaidEmis = schedule.filter(e => e.status !== 'PAID')
  const showingPaid = expanded === 'paid' ? paidEmis : paidEmis.slice(-3)
  const displayList = [...showingPaid, ...unpaidEmis]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            EMI Schedule
            <span className="ml-2 text-xs text-gray-400 font-normal">{schedule.length} total</span>
          </p>
          {paidEmis.length > 3 && (
            <button
              onClick={() => setExpanded(expanded === 'paid' ? null : 'paid')}
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              {expanded === 'paid' ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show all {paidEmis.length} paid</>}
            </button>
          )}
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['#', 'Due date', 'EMI', 'Principal', 'Interest', 'Balance', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayList.map(emi => (
              <tr
                key={emi.id}
                className={`hover:bg-gray-50 transition-colors ${
                  emi.status === 'OVERDUE' ? 'bg-red-50/40' :
                  emi.status === 'PAID' ? 'opacity-60' : ''
                }`}
              >
                <td className="px-5 py-3 text-sm font-mono text-gray-500">{emi.emiNumber}</td>
                <td className="px-5 py-3 text-sm text-gray-700">{formatDate(emi.dueDate)}</td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatINR(emi.emiAmount)}</td>
                <td className="px-5 py-3 text-sm text-green-700">{formatINR(emi.principalComponent)}</td>
                <td className="px-5 py-3 text-sm text-amber-700">{formatINR(emi.interestComponent)}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{formatINR(emi.balanceAfter)}</td>
                <td className="px-5 py-3">{statusBadge(emi.status)}</td>
                <td className="px-5 py-3">
                  {emi.status !== 'PAID' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={markingId === emi.id}
                      onClick={() => markPaid.mutate(emi.id)}
                    >
                      Mark paid
                    </Button>
                  )}
                  {emi.status === 'PAID' && emi.paidDate && (
                    <span className="text-xs text-gray-400">{formatDate(emi.paidDate)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Prepayment Calculator ──────────────────────────────────────────────────────
function PrepaymentCalculator({
  outstandingPrincipal, interestRate, remainingMonths
}: {
  outstandingPrincipal: number
  interestRate: number
  remainingMonths: number
}) {
  const [amount, setAmount] = useState('')
  const [alternateRate, setAlternateRate] = useState('12')
  const [result, setResult] = useState<{
    monthsSaved: number
    interestSaved: number
    prepaymentRoi: number
    alternateValue: number
    recommendation: string
    reasoning: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyse = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/ai/finance/prepayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principal_outstanding: outstandingPrincipal,
          interest_rate: interestRate,
          remaining_months: remainingMonths,
          prepayment_amount: parseFloat(amount),
          alternate_investment_rate: parseFloat(alternateRate),
        }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      setResult(await res.json())
    } catch {
      setError('Could not run analysis. Make sure the AI service is running.')
    } finally {
      setLoading(false)
    }
  }

  const recColor = result?.recommendation === 'PREPAY' ? 'text-green-700 bg-green-50 border-green-200'
    : result?.recommendation === 'INVEST' ? 'text-blue-700 bg-blue-50 border-blue-200'
    : 'text-amber-700 bg-amber-50 border-amber-200'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator size={15} className="text-brand-400" />
            <p className="text-sm font-medium text-gray-900">Prepayment Analysis</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Outstanding principal</span>
              <span className="font-medium">{formatINR(outstandingPrincipal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interest rate</span>
              <span className="font-medium">{interestRate}% p.a.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining tenure</span>
              <span className="font-medium">{remainingMonths} months</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Prepayment amount (₹) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              placeholder="e.g. 500000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Alternate investment CAGR (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={alternateRate}
              onChange={e => setAlternateRate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              placeholder="12"
            />
            <p className="text-xs text-gray-400 mt-1">Expected return if you invested instead (e.g. index fund CAGR)</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <Button
            className="w-full justify-center"
            onClick={analyse}
            loading={loading}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Analyse with AI
          </Button>
        </CardBody>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-gray-900">Analysis Result</p>
        </CardHeader>
        <CardBody>
          {!result && !loading && (
            <EmptyState
              title="No analysis yet"
              description="Enter a prepayment amount and click Analyse to get AI-powered insights."
              icon={<Calculator size={28} />}
            />
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner className="w-7 h-7" />
              <p className="text-sm text-gray-400">Claude is analysing your numbers...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className={`border rounded-xl px-4 py-3 ${recColor}`}>
                <p className="text-xs font-medium uppercase tracking-wide mb-0.5">Recommendation</p>
                <p className="text-lg font-bold">{result.recommendation}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Months saved</p>
                  <p className="text-xl font-semibold text-gray-900">{result.monthsSaved}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Interest saved</p>
                  <p className="text-xl font-semibold text-gray-900">{formatINR(result.interestSaved)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Prepayment ROI</p>
                  <p className="text-xl font-semibold text-gray-900">{result.prepaymentRoi.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Alternate value</p>
                  <p className="text-xl font-semibold text-gray-900">{formatINR(result.alternateValue)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Claude's Reasoning</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.reasoning}</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}