import { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, Loader2, Sparkles } from 'lucide-react'
import { useActiveProperty } from '@/hooks/useActiveProperty'
import { EmptyState } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  'Should I make a prepayment this month?',
  'How much has my uncle paid vs me?',
  'When is the best time to sell?',
  'What is my current EMI interest vs principal split?',
  'How much interest will I pay in total?',
]

export default function AdvisorPage() {
  const propertyId = useActiveProperty(s => s.propertyId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !propertyId) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/ai/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          messages: updatedMessages,
        }),
      })

      if (!res.ok) throw new Error('Advisor request failed')
      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
      }])
    } catch {
      setError('Could not reach the AI advisor. Make sure the AI service is running.')
      // Remove the user message on failure so they can retry
      setMessages(messages)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (!propertyId) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <EmptyState
          title="No property selected"
          description="Set up your property first to use the AI advisor."
          icon={<Bot size={32} />}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <Bot size={18} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">AI Financial Advisor</h1>
            <p className="text-xs text-gray-400">Powered by Claude · Has full context of your property data</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-brand-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Ask me anything about your property</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-md">
              I have full context of your loan, payments, partner contributions, and valuation.
              My answers are grounded in your actual numbers.
            </p>

            {/* Quick question chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-sm px-4 py-2 bg-white border border-gray-200 rounded-full hover:border-brand-400 hover:text-brand-600 transition-colors text-gray-600"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={15} className="text-brand-400" />
              </div>
            )}

            <div className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-brand-400 text-white rounded-tr-sm'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <User size={15} className="text-gray-500" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-brand-400" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 size={13} className="animate-spin" />
                <span className="text-sm">Claude is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 max-w-md">
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-8 py-4 border-t border-gray-100 bg-white shrink-0">
        {/* Quick questions after first message */}
        {messages.length > 0 && !loading && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-thin">
            {QUICK_QUESTIONS.slice(0, 3).map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:border-brand-400 hover:text-brand-600 transition-colors text-gray-500 whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about prepayments, partner balances, sell timing..."
            rows={1}
            className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none transition"
            style={{ maxHeight: '120px' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = t.scrollHeight + 'px'
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0',
              input.trim() && !loading
                ? 'bg-brand-400 hover:bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            )}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}