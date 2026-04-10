import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import {
  CODE_MODULE_KEYS,
  DATE_PATTERN_OPTIONS,
  previewNextBusinessCode,
} from '../../services/businessCodeGenerator'
import { toast } from 'sonner'

const MODULE_LABELS = {
  enquiry: 'Enquiry',
  quotation: 'Quotation',
  invoice: 'Invoice',
}

export function SettingsCodeConventions() {
  const codeConventions = useAppStore((s) => s.codeConventions)
  const codeCounters = useAppStore((s) => s.codeCounters)
  const setCodeConvention = useAppStore((s) => s.setCodeConvention)
  const resetCodeCounters = useAppStore((s) => s.resetCodeCounters)
  const [confirmResetSeq, setConfirmResetSeq] = useState(false)

  return (
    <>
      <Card
        title="Document numbering"
        subtitle="Prefix, numeric sequence width, optional date segment (e.g. 04/2026), and suffix for enquiry, quotation, and invoice reference IDs. Applies when the ID field is left empty on create."
        accent="from-indigo-500 to-slate-900"
      >
        <p className="mb-6 text-xs text-slate-600 dark:text-slate-400">
          Internal row keys stay random; these settings control the human-visible reference (
          <code className="text-[11px]">enquiryId</code>, <code className="text-[11px]">quoteId</code>,{' '}
          <code className="text-[11px]">invoiceId</code>) built as: prefix → padded number → optional date → suffix,
          separated by your separator.
        </p>

        <div className="space-y-10">
          {CODE_MODULE_KEYS.map((key) => {
            const c = codeConventions[key]
            const preview = previewNextBusinessCode(key, codeConventions, codeCounters[key] ?? 0)
            return (
              <section key={key} className="border-t border-slate-100 pt-8 first:border-t-0 first:pt-0 dark:border-slate-800">
                <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{MODULE_LABELS[key]}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor={`cc-${key}-prefix`}>
                      Prefix
                    </label>
                    <Input
                      id={`cc-${key}-prefix`}
                      value={c.prefix}
                      onChange={(e) => setCodeConvention(key, { prefix: e.target.value })}
                      placeholder="e.g. ENQ"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor={`cc-${key}-suffix`}>
                      Suffix
                    </label>
                    <Input
                      id={`cc-${key}-suffix`}
                      value={c.suffix}
                      onChange={(e) => setCodeConvention(key, { suffix: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor={`cc-${key}-digits`}>
                      Number digits
                    </label>
                    <Input
                      id={`cc-${key}-digits`}
                      type="number"
                      min={1}
                      max={12}
                      value={c.digits}
                      onChange={(e) => setCodeConvention(key, { digits: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor={`cc-${key}-sep`}>
                      Separator
                    </label>
                    <Input
                      id={`cc-${key}-sep`}
                      value={c.separator}
                      onChange={(e) => setCodeConvention(key, { separator: e.target.value })}
                      placeholder="-"
                      maxLength={3}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400" htmlFor={`cc-${key}-datepat`}>
                      Date in ID
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-[var(--color-va-blue)]"
                          checked={c.appendDate}
                          onChange={(e) => setCodeConvention(key, { appendDate: e.target.checked })}
                        />
                        Append date
                      </label>
                      <select
                        id={`cc-${key}-datepat`}
                        disabled={!c.appendDate}
                        value={c.datePattern}
                        onChange={(e) => setCodeConvention(key, { datePattern: e.target.value })}
                        className="w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {DATE_PATTERN_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                  Next preview (after save uses current sequence):{' '}
                  <code className="rounded-none bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {preview}
                  </code>{' '}
                  · last sequence: <strong>{codeCounters[key] ?? 0}</strong>
                </p>
              </section>
            )
          })}
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Reset sequence counters to 0 so the next created document starts again from 000001 (prefix and date rules unchanged).
          </p>
          <Button type="button" variant="outline" onClick={() => setConfirmResetSeq(true)}>
            Reset sequence numbers
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmResetSeq}
        title="Reset sequence numbers?"
        message="Enquiry, quotation, and invoice counters all go back to 0. Existing references are not changed; only the next auto-generated IDs use the new sequence."
        confirmLabel="Reset counters"
        onClose={() => setConfirmResetSeq(false)}
        onConfirm={() => {
          resetCodeCounters()
          setConfirmResetSeq(false)
          toast.success('Sequence counters reset')
        }}
      />
    </>
  )
}
