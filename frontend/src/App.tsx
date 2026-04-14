import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import LoginPage from '@/pages/auth/LoginPage'
import SetupPage from '@/pages/setup/SetupPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import LoanPage from '@/pages/loan/LoanPage'
import PaymentsPage from '@/pages/payments/PaymentsPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import AdvisorPage from '@/pages/advisor/AdvisorPage'
import PropertySettingsPage from '@/pages/settings/PropertySettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/setup" element={<SetupPage />} />

            <Route element={<AppLayout />}>
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/loan"       element={<LoanPage />} />
              <Route path="/payments"   element={<PaymentsPage />} />
              <Route path="/documents"  element={<DocumentsPage />} />
              <Route path="/advisor"    element={<AdvisorPage />} />
              <Route path="/settings"   element={<PropertySettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}