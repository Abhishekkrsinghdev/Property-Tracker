import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, X, UploadCloud, Download, FileCheck2 } from 'lucide-react'
import { documentsApi } from '@/api'
import { useActiveProperty } from '@/hooks/useActiveProperty'
import {
  Card, CardHeader, CardBody, Spinner,
  EmptyState, PageHeader, Button, Badge
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { Document } from '@/types'

const DOC_TYPES = ['SALE_AGREEMENT', 'ALLOTMENT_LETTER', 'SANCTION_LETTER', 'RECEIPT', 'OTHER'] as const

export default function DocumentsPage() {
  const propertyId = useActiveProperty(s => s.propertyId)
  const [showModal, setShowModal] = useState(false)

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', propertyId],
    queryFn: () => documentsApi.getAll(propertyId!),
    enabled: !!propertyId,
  })

  if (!propertyId) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <EmptyState title="No property selected" description="Set up your property first from the dashboard." icon={<FileText size={32} />} />
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8" /></div>
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Documents"
        subtitle="Property records with AI clause extraction"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} /> Upload document
          </Button>
        }
      />

      {!documents || documents.length === 0 ? (
        <Card className="mt-6">
          <CardBody>
            <EmptyState
              title="No documents yet"
              description="Upload your sale agreement or allotment letter. Claude will extract key clauses automatically."
              icon={<FileText size={28} />}
              action={<Button size="sm" onClick={() => setShowModal(true)}><Plus size={13} /> Upload now</Button>}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          {documents.map(doc => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {showModal && (
        <UploadDocumentModal
          propertyId={propertyId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function DocumentCard({ doc }: { doc: Document }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <FileCheck2 size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 line-clamp-1" title={doc.fileName}>{doc.fileName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default">{doc.docType.replace('_', ' ')}</Badge>
                <span className="text-xs text-gray-400">Uploaded {formatDate(doc.createdAt)}</span>
              </div>
            </div>
          </div>
          <a
            href={doc.storageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-gray-400 hover:text-brand-600 transition-colors bg-gray-50 hover:bg-brand-50 p-1.5 rounded-lg"
            title="Download / View Original"
          >
            <Download size={16} />
          </a>
        </div>
      </CardHeader>
      <CardBody className="pt-2">
        {doc.aiProcessed ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              AI Summary
            </p>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed">
              {doc.aiSummary || 'No summary could be extracted from this document.'}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 border-dashed">
            <Spinner className="w-3.5 h-3.5" />
            <span>AI is currently parsing this document...</span>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function UploadDocumentModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [docType, setDocType] = useState<string>('SALE_AGREEMENT')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected')
      return documentsApi.upload(propertyId, file, docType)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', propertyId] })
      onClose()
    },
    onError: () => setError('Failed to upload document. Please try again.'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Upload Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Document type <span className="text-red-400">*</span></label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
            >
              {DOC_TYPES.map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative ${file ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input
              type="file"
              accept=".pdf,image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={upload.isPending}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2 text-brand-700">
                <FileCheck2 size={24} />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs opacity-70">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-gray-500">
                <UploadCloud size={24} className="text-gray-400 mb-1" />
                <span className="text-sm font-medium text-gray-700">Drop your file here, or click to browse</span>
                <span className="text-xs">Supports PDF, JPG, PNG (Max 10MB)</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-400 leading-relaxed text-center px-4">
            Claude Vision will read your document and extract the core obligations, penalties, and payment milestones.
          </p>
        </div>

        <div className="flex gap-3 px-6 pb-6 mt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
          <Button
            className="flex-1 justify-center"
            loading={upload.isPending}
            onClick={() => upload.mutate()}
            disabled={!file}
          >
            Upload & Analyze
          </Button>
        </div>
      </div>
    </div>
  )
}