import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = mode === 'login'
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register({ email: form.email, password: form.password, fullName: form.fullName })

      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? (mode === 'login' ? 'Invalid email or password' : 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setForm({ email: '', password: '', fullName: '' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-400 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">
            PropTrack <span className="text-brand-400">AI</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-gray-100">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 py-3.5 text-sm font-medium transition-colors capitalize',
                  mode === m
                    ? 'text-brand-600 border-b-2 border-brand-400 bg-brand-50'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div className="p-8">
            <p className="text-sm text-gray-500 mb-6">
              {mode === 'login'
                ? 'Welcome back — sign in to your account'
                : 'Set up your PropTrack account'}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Full name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={update('fullName')}
                    className={inputClass}
                    placeholder="Rahul Sharma"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={update('password')}
                  className={inputClass}
                  placeholder="••••••••"
                />
                {mode === 'register' && (
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                )}
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full justify-center mt-2"
              >
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          PropTrack AI · Property Co-ownership Tracker
        </p>
      </div>
    </div>
  )
}

const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"