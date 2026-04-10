import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { useAppStore } from '../../store/useAppStore'
import { canEditEnquiryPricing, canPriceLineItem, collectPricingAssignmentUserIds } from '../../utils/permissions'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FormField } from '../../components/forms/FormField'
import { toast } from 'sonner'
import { getPricesForLine } from './enquiryShared'

function emptyPriceRow() {
  return { id: nanoid(), label: '', amount: '', currency: 'USD' }
}

function buildDraftFromEnquiry(enquiry, userId, visibleLineItems) {
  const next = {}
  for (const li of visibleLineItems) {
    const existing = getPricesForLine(enquiry, userId, li.id)
    next[li.id] = existing.length ? existing.map((p) => ({ ...p, amount: String(p.amount) })) : [emptyPriceRow()]
  }
  return next
}

function PricingFormSections({ enquiry, userId, enquiryInternalId, visibleLineItems, onDone }) {
  const updateEnquiry = useAppStore((s) => s.updateEnquiry)
  const [draft, setDraft] = useState(() => buildDraftFromEnquiry(enquiry, userId, visibleLineItems))

  function setRows(lineItemId, rows) {
    setDraft((d) => ({ ...d, [lineItemId]: rows }))
  }

  function addPriceRow(lineItemId) {
    setRows(lineItemId, [...(draft[lineItemId] || []), emptyPriceRow()])
  }

  function updatePriceRow(lineItemId, idx, key, value) {
    const rows = [...(draft[lineItemId] || [])]
    rows[idx] = { ...rows[idx], [key]: value }
    setRows(lineItemId, rows)
  }

  function removePriceRow(lineItemId, idx) {
    const rows = (draft[lineItemId] || []).filter((_, i) => i !== idx)
    setRows(lineItemId, rows.length ? rows : [emptyPriceRow()])
  }

  function handleSave() {
    const pricingByUser = JSON.parse(JSON.stringify(enquiry.pricingByUser || {}))
    if (!pricingByUser[userId]) pricingByUser[userId] = {}

    for (const li of visibleLineItems) {
      const rows = draft[li.id] || []
      const cleaned = rows
        .filter((r) => String(r.label || '').trim() || Number(r.amount) > 0)
        .map((r) => ({
          id: r.id || nanoid(),
          label: String(r.label || '').trim(),
          amount: Number(r.amount) || 0,
          currency: r.currency || 'USD',
        }))
      pricingByUser[userId][li.id] = cleaned
    }

    void (async () => {
      try {
        await updateEnquiry(enquiryInternalId, { pricingByUser })
        toast.success('Pricing saved')
        onDone()
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not save pricing')
      }
    })()
  }

  if (!visibleLineItems.length) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">No line items assigned to this pricing user for this enquiry.</p>
  }

  return (
    <>
      <div className="space-y-6">
        {visibleLineItems.map((li) => (
          <Card
            key={li.id}
            title={`Line: ${li.description || '(no description)'}`}
            subtitle={`Qty ${li.quantity}`}
            accent="from-emerald-500 to-blue-700"
          >
            <div className="space-y-3">
              {(draft[li.id] || [emptyPriceRow()]).map((row, idx) => (
                <div key={row.id || idx} className="grid gap-2 border border-slate-200 p-3 dark:border-slate-600 md:grid-cols-[1fr_120px_80px_auto]">
                  <Input
                    placeholder="Label (e.g. Option A, Sea freight)"
                    value={row.label}
                    onChange={(e) => updatePriceRow(li.id, idx, 'label', e.target.value)}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => updatePriceRow(li.id, idx, 'amount', e.target.value)}
                  />
                  <Input value={row.currency || 'USD'} onChange={(e) => updatePriceRow(li.id, idx, 'currency', e.target.value)} />
                  <Button type="button" variant="ghost" className="!px-2" onClick={() => removePriceRow(li.id, idx)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => addPriceRow(li.id)}>
                Add price
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={handleSave}>
          Save pricing
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </>
  )
}

export function EnquiryPricing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const authUser = useAppStore((s) => s.auth.user)
  const users = useAppStore((s) => s.users)
  const enquiry = useAppStore((s) => s.enquiries.find((e) => e.id === id))

  const [targetUserId, setTargetUserId] = useState('')

  const assigneeIds = useMemo(() => (enquiry ? collectPricingAssignmentUserIds(enquiry) : []), [enquiry])

  const assignees = useMemo(
    () => assigneeIds.map((uid) => users.find((u) => u.id === uid)).filter(Boolean),
    [assigneeIds, users],
  )

  const effectiveUserId = useMemo(() => {
    if (authUser?.role === 'admin' || authUser?.role === 'boss') return targetUserId || assignees[0]?.id || ''
    return authUser?.id || ''
  }, [authUser, targetUserId, assignees])

  const visibleLineItems = useMemo(() => {
    const lines = enquiry?.lineItems || []
    const uid = effectiveUserId
    if (!enquiry || !uid) return []
    return lines.filter((li) => canPriceLineItem(enquiry, uid, li.id))
  }, [enquiry, effectiveUserId])

  if (!enquiry) {
    return <Navigate to="/enquiries" replace />
  }

  if (!authUser) {
    return null
  }

  if (!canEditEnquiryPricing(authUser.role, enquiry, authUser.id)) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">You cannot add pricing for this enquiry.</p>
        <Button type="button" variant="ghost" onClick={() => navigate('/enquiries')}>
          Back to list
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Line-item pricing</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enquiry {enquiry.enquiryId} — add one or more price options per line (your team&apos;s view).
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={() => navigate('/enquiries')}>
          Back to list
        </Button>
      </div>

      {authUser.role === 'admin' || authUser.role === 'boss' ? (
        <Card
          title="Pricing user"
          subtitle="Admins and management can edit pricing on behalf of an assigned pricing user"
          accent="from-violet-500 to-slate-700"
        >
          <FormField label="User" htmlFor="pu">
            <select
              id="pu"
              className="w-full max-w-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={targetUserId || assignees[0]?.id || ''}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value="">Select…</option>
              {assignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </FormField>
          {!assignees.length ? (
            <p className="mt-2 text-sm text-amber-700">Assign pricing users on the enquiry (enquiry-level or per line) first.</p>
          ) : null}
        </Card>
      ) : null}

      {effectiveUserId ? (
        <PricingFormSections
          key={`${enquiry.id}-${effectiveUserId}-${visibleLineItems.map((l) => l.id).join(',')}`}
          enquiry={enquiry}
          userId={effectiveUserId}
          enquiryInternalId={id}
          visibleLineItems={visibleLineItems}
          onDone={() => navigate('/enquiries', { replace: true })}
        />
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">Select a pricing user above to load line items.</p>
      )}
    </div>
  )
}
