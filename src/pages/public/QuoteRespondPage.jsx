import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useHydrated } from '../../hooks/useHydrated'
import { Button } from '../../components/ui/Button'
import { isApiMode } from '../../services/apiMode'
import { getApiBaseUrl } from '../../services/apiClient'
import * as crmApi from '../../services/crmApi'

function Panel({ ok, title, body }) {
  return (
    <div className="mx-auto max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-[#1e2130]">
      <p
        className={`text-lg font-bold ${
          ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
        }`}
      >
        {title}
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
      <Link
        to="/login"
        className="mt-6 inline-block text-sm font-semibold text-[var(--color-va-blue)] underline-offset-2 hover:underline"
      >
        Go to login
      </Link>
    </div>
  )
}

export function QuoteRespondPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action')
  const token = searchParams.get('token') || ''
  const hydrated = useHydrated()

  const quotation = useAppStore((s) => s.quotations.find((q) => q.id === id))
  const [outcome, setOutcome] = useState(null)
  const [apiQuoteId, setApiQuoteId] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (!hydrated) return
    if (ran.current) return
    if (!id) {
      ran.current = true
      queueMicrotask(() => setOutcome({ ok: false, error: 'not_found' }))
      return
    }
    if (!token || (action !== 'accept' && action !== 'reject')) {
      ran.current = true
      queueMicrotask(() => setOutcome({ ok: false, error: 'bad_link' }))
      return
    }

    if (isApiMode()) {
      ran.current = true
      const base = getApiBaseUrl()
      if (!base) {
        queueMicrotask(() => setOutcome({ ok: false, error: 'bad_link' }))
        return
      }
      void crmApi
        .apiPublicQuotationRespond(base, id, token, action)
        .then((json) => {
          setApiQuoteId(String(json?.status || ''))
          setOutcome({ ok: true })
        })
        .catch((e) => {
          const st = e?.status
          if (st === 404) setOutcome({ ok: false, error: 'not_found' })
          else if (st === 403) setOutcome({ ok: false, error: 'forbidden' })
          else if (st === 409) setOutcome({ ok: false, error: 'conflict' })
          else setOutcome({ ok: false, error: e?.message || 'unknown' })
        })
      return
    }

    if (!quotation) {
      ran.current = true
      queueMicrotask(() => setOutcome({ ok: false, error: 'not_found' }))
      return
    }
    ran.current = true
    const r = useAppStore.getState().respondToQuotationClient({ id, token, action })
    queueMicrotask(() => setOutcome(r))
  }, [hydrated, id, quotation, token, action])

  const loading = !hydrated || outcome === null

  return (
    <div className="min-h-svh bg-slate-100 px-4 py-16 dark:bg-slate-950">
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-va-blue)]">Logistics CRM</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Quotation response</h1>
      </div>

      {loading ? (
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">Loading…</p>
      ) : null}

      {!loading && outcome?.error === 'not_found' ? (
        <Panel
          ok={false}
          title="Quotation not found"
          body={
            isApiMode()
              ? 'This link may be invalid or the quotation id does not exist on the server.'
              : 'This link may be invalid, or the quotation is not available in this browser. Data is stored locally — open the link on a device that uses the same CRM session as the sender, or ask them to update the status manually.'
          }
        />
      ) : null}

      {!loading && outcome?.error === 'bad_link' ? (
        <Panel
          ok={false}
          title="Invalid link"
          body="Please use the Accept or Decline button from your quotation email."
        />
      ) : null}

      {!loading && outcome?.error === 'forbidden' ? (
        <Panel ok={false} title="Invalid link" body="This response link is invalid or has expired." />
      ) : null}

      {!loading && outcome?.error === 'conflict' ? (
        <Panel
          ok={false}
          title="Already responded"
          body="This quotation has already been accepted or declined."
        />
      ) : null}

      {!loading && outcome && !outcome.ok && outcome.error && !['not_found', 'bad_link', 'forbidden', 'conflict'].includes(outcome.error) ? (
        <Panel ok={false} title="Could not update" body={outcome.error} />
      ) : null}

      {!loading && outcome?.ok ? (
        <div className="mx-auto max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-[#1e2130]">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {action === 'accept' ? 'Thank you — quotation accepted' : 'Recorded — quotation declined'}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {quotation?.quoteId ? `Reference: ${quotation.quoteId}. ` : ''}
            Your decision has been saved. The quotation status is now{' '}
            <strong>{action === 'accept' ? 'Accepted' : 'Rejected'}</strong>
            {isApiMode() && apiQuoteId ? ` (${apiQuoteId}).` : '.'}
          </p>
          <Button type="button" variant="primary" className="mt-6" to="/login">
            Done
          </Button>
        </div>
      ) : null}
    </div>
  )
}
