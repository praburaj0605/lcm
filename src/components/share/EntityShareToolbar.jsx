import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/Button'
import { SendBrevoEmailModal } from '../email/SendBrevoEmailModal'
import {
  buildEnquiryEmailContext,
  buildInternalEnquiryEmailContext,
  buildQuotationEmailContext,
  buildInternalQuotationEmailContext,
  buildInvoiceShareEmailContext,
} from '../../services/emailPlaceholders'
import { toast } from 'sonner'

function respondBaseUrl() {
  return (
    (import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')) ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  )
}

function entityEditPath(kind, id) {
  if (!id) return ''
  if (kind === 'enquiry') return `/enquiries/${id}/edit`
  if (kind === 'quotation') return `/quotations/${id}/edit`
  return `/invoices/${id}/edit`
}

/**
 * Print, email (Brevo), and copy deep-link for list detail modals.
 * Toolbar stays outside `.crm-print-root` so it does not appear in print.
 */
export function EntityShareToolbar({ kind, record, client, enquiry }) {
  const [mailOpen, setMailOpen] = useState(false)
  const [mailKey, setMailKey] = useState(0)
  const authUser = useAppStore((s) => s.auth.user)
  const brevoSettings = useAppStore((s) => s.brevoSettings)

  const sender = useMemo(
    () => ({
      name: authUser?.name,
      email: authUser?.email,
      company: brevoSettings.organizationName,
    }),
    [authUser?.name, authUser?.email, brevoSettings.organizationName],
  )

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !record?.id) return ''
    return `${window.location.origin}${entityEditPath(kind, record.id)}`
  }, [kind, record?.id])

  const defaultMailTo = useMemo(() => {
    if (kind === 'enquiry') return record?.contactEmail?.trim() || client?.email?.trim() || ''
    return client?.contactPersonEmail?.trim() || client?.email?.trim() || ''
  }, [kind, record, client])

  const mailExternal = useMemo(() => {
    if (!record) return null
    if (kind === 'enquiry') return buildEnquiryEmailContext({ enquiry: record, client, sender })
    if (kind === 'quotation')
      return buildQuotationEmailContext({
        quotation: record,
        client,
        enquiry: enquiry || null,
        sender,
        respondBaseUrl: respondBaseUrl(),
        includeClientActions: true,
      })
    if (kind === 'invoice') return null
    return null
  }, [kind, record, client, enquiry, sender])

  const mailInternal = useMemo(() => {
    if (!record) return null
    if (kind === 'enquiry') return buildInternalEnquiryEmailContext({ enquiry: record, client, sender })
    if (kind === 'quotation')
      return buildInternalQuotationEmailContext({
        quotation: record,
        client,
        enquiry: enquiry || null,
        sender,
        respondBaseUrl: respondBaseUrl(),
      })
    if (kind === 'invoice') return buildInvoiceShareEmailContext({ invoice: record, client, sender })
    return null
  }, [kind, record, client, enquiry, sender])

  function handlePrint() {
    document.documentElement.classList.add('crm-printing-detail')
    const done = () => {
      document.documentElement.classList.remove('crm-printing-detail')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    requestAnimationFrame(() => window.print())
  }

  async function copyUrl() {
    if (!shareUrl) {
      toast.error('No link available')
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied — paste to share this record')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const mailCategory = kind === 'invoice' ? 'internal_email' : kind === 'quotation' ? 'quotation' : 'enquiry'
  const allowToggle = kind !== 'invoice'
  const canEmail = Boolean(record && mailInternal && (kind === 'invoice' || mailExternal))

  return (
    <div className="no-print mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-4 dark:border-slate-700">
      <Button type="button" variant="outline" onClick={handlePrint}>
        Print
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setMailKey((k) => k + 1)
          setMailOpen(true)
        }}
      >
        Share as email
      </Button>
      <Button type="button" variant="outline" onClick={() => void copyUrl()}>
        Share as URL
      </Button>
      {canEmail ? (
        <SendBrevoEmailModal
          key={mailKey}
          open={mailOpen}
          onClose={() => setMailOpen(false)}
          category={mailCategory}
          placeholderContext={kind === 'invoice' ? mailInternal : mailExternal}
          placeholderContextInternal={mailInternal}
          allowAudienceToggle={allowToggle}
          defaultTo={defaultMailTo}
          title={kind === 'invoice' ? 'Share invoice (email)' : kind === 'quotation' ? 'Share quotation (Brevo)' : 'Share enquiry (Brevo)'}
        />
      ) : null}
    </div>
  )
}
