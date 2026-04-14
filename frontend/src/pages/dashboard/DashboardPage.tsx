import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, TrendingUp, Users,
  AlertCircle, ArrowRight, RefreshCw
} from 'lucide-react'
import { dashboardApi, propertiesApi } from '@/api'
import { useActiveProperty } from '@/hooks/useActiveProperty'
import {
  Stat, Card, CardHeader, CardBody,
  Badge, Spinner, PageHeader, Button
} from '@/components/ui'
import { formatINR, formatDate, daysUntil } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { DashboardSummary } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const propertyId = useActiveProperty(s => s.propertyId)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', propertyId],
    queryFn: () => dashboardApi.getSummary(propertyId!),
    enabled: !!propertyId,
    retry: 1,
  })

  if (!propertyId) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={24} className="text-brand-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Add your property</h2>
          <p className="text-sm text-gray-500 mb-6">
            Set up your property and loan details to start tracking your investment.
          </p>
          <Button onClick={() => navigate('/setup')} className="mx-auto">
            Get started <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Could not load dashboard</p>
            <p className="text-xs text-red-600 mt-0.5">Check that the backend is running.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw size={13} /> Retry
          </Button>
        </div>
      </div>
    )
  }

  return <DashboardContent data={data} />
}

function DashboardContent({ data }: { data: DashboardSummary }) {
  const possessionDays = daysUntil(data.property.possessionDate)
  const possessionYears = Math.floor(possessionDays / 365)
  const possessionMonths = Math.floor((possessionDays % 365) / 30)
  const loanProgress = data.loan
    ? Math.round((data.emisPaid / (data.emisPaid + data.emisRemaining)) * 100)
    : 0

  return (
    <div className="p-8">
      <PageHeader
        title={data.property.name}
        subtitle={`${data.property.city}, ${data.property.state}`}
        action={
          <Badge variant={data.property.status === 'UNDER_CONSTRUCTION' ? 'warning' : 'success'}>
            {data.property.status.replace(/_/g, ' ')}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Invested" value={formatINR(data.totalInvested)} sub="All payments to date" />
        <Stat label="Outstanding Loan" value={formatINR(data.outstandingPrincipal)} sub={`${data.emisPaid} EMIs paid`} />
        <Stat label="Interest Paid" value={formatINR(data.totalInterestPaid)} sub="Cumulative" />
        <Stat
          label="Possession In"
          value={possessionDays > 0 ? `${possessionYears}y ${possessionMonths}m` : 'Due'}
          sub={formatDate(data.property.possessionDate)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Property Valuation</p>
              <span className="text-xs text-gray-400">Purchased {formatINR(data.property.purchasePrice)}</span>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            <AppreciationChart
              propertyId={data.property.id}
              purchasePrice={data.property.purchasePrice}
              purchaseDate={data.property.purchaseDate}
              possessionDate={data.property.possessionDate}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-900">Partner Contributions</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            {data.partnerSummaries.map(p => {
              const pct = p.expectedShare > 0
                ? Math.min(100, Math.round((p.totalPaid / p.expectedShare) * 100))
                : 0
              return (
                <div key={p.user.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-medium">
                        {p.user.fullName[0]}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{p.user.fullName}</span>
                    </div>
                    <span className="text-xs text-gray-400">{p.sharePercent}% share</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">{formatINR(p.totalPaid)} paid</span>
                    <span className={`text-xs font-medium ${p.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {p.balance >= 0 ? '+' : ''}{formatINR(p.balance)}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {data.nextEmiDueDate && (
          <Card>
            <CardBody className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Next EMI due</p>
                <p className="text-lg font-semibold text-gray-900">{formatINR(data.nextEmiAmount!)}</p>
                <p className="text-xs text-gray-400">{formatDate(data.nextEmiDueDate)}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {data.loan && (
          <Card>
            <CardBody>
              <p className="text-xs text-gray-500 mb-2">Loan repayment progress</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${loanProgress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{loanProgress}% complete</span>
                <span>{data.emisRemaining} EMIs left</span>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="space-y-2.5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Property details</p>
            <FactRow label="Builder" value={data.property.builderName ?? '—'} />
            <FactRow label="Area" value={data.property.areaSqft ? `${data.property.areaSqft} sq ft` : '—'} />
            <FactRow label="Purchase date" value={formatDate(data.property.purchaseDate)} />
            {data.loan && <FactRow label="Bank" value={data.loan.bankName} />}
            {data.loan && <FactRow label="Rate" value={`${data.loan.interestRate}% p.a.`} />}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function AppreciationChart({ propertyId, purchasePrice, purchaseDate, possessionDate }: {
  propertyId: string; purchasePrice: number; purchaseDate: string; possessionDate: string
}) {
  const { data: history } = useQuery({
    queryKey: ['valuationHistory', propertyId],
    queryFn: () => propertiesApi.getValuationHistory(propertyId),
  })

  const points = []
  const purchaseYear = new Date(purchaseDate).getFullYear()
  const possessionYear = new Date(possessionDate).getFullYear()
  const currentYear = new Date().getFullYear()
  const targetYear = Math.max(currentYear, possessionYear + 2)

  if (history && history.length > 0) {
    const ascHistory = [...history].reverse()
    
    // Add real historical data
    for (const h of ascHistory) {
      points.push({
        label: new Date(h.valuationDate).toLocaleDateString(undefined, { year: '2-digit', month: 'short' }),
        year: new Date(h.valuationDate).getFullYear(),
        value: h.amount,
        projected: false
      })
    }
    
    // Project from the last known data point
    const lastPoint = ascHistory[ascHistory.length - 1]
    const lastYear = new Date(lastPoint.valuationDate).getFullYear()
    let currentVal = lastPoint.amount
    
    for (let y = lastYear + 1; y <= targetYear; y++) {
      currentVal = Math.round(currentVal * 1.07)
      points.push({
        label: `${String(y).slice(2)} (Est)`,
        year: y,
        value: currentVal,
        projected: true
      })
    }
  } else {
    // Fallback logic if history query hasn't finished or is empty
    for (let y = purchaseYear; y <= targetYear; y++) {
      const isProjected = y > currentYear
      const value = isProjected ? Math.round(purchasePrice * Math.pow(1.07, y - currentYear))
        : purchasePrice
      points.push({ label: String(y), year: y, value, projected: isProjected })
    }
  }

  return (
    <ResponsiveContainer width="100%" height={185}>
      <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v: unknown) => [formatINR(Number(v ?? 0)), 'Valuation']}
          contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
        />
        <Area type="monotone" dataKey="value" stroke="#c9a84c" strokeWidth={2} fill="url(#valGrad)"
          dot={{ r: 3, fill: '#c9a84c', strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700">{value}</span>
    </div>
  )
}