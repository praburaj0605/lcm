import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EMAIL_TEMPLATE_CATEGORIES, isExternalFacingCategory } from '../../services/emailTemplateCategories'
import { toast } from 'sonner'

const emptyForm = () => ({
  name: '',
  category: 'client_email',
  subjectTemplate: '',
  bodyHtmlTemplate: '',
  isDefault: false,
  branding: {
    logoUrl: '',
    logoAlt: 'Company logo',
    logoMaxWidthPx: 160,
    companyName: '',
    accentColor: '#2563eb',
    headerTagline: '',
    footerNote: '',
  },
})

export function EmailTemplatesPage() {
  const emailTemplates = useAppStore((s) => s.emailTemplates)
  const addEmailTemplate = useAppStore((s) => s.addEmailTemplate)
  const updateEmailTemplate = useAppStore((s) => s.updateEmailTemplate)
  const deleteEmailTemplate = useAppStore((s) => s.deleteEmailTemplate)
  const setDefaultEmailTemplate = useAppStore((s) => s.setDefaultEmailTemplate)
  const resetEmailTemplatesToDefaults = useAppStore((s) => s.resetEmailTemplatesToDefaults)

  const [filterCat, setFilterCat] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() => emptyForm())
  const [creating, setCreating] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    if (filterCat === 'all') return emailTemplates
    return emailTemplates.filter((t) => t.category === filterCat)
  }, [emailTemplates, filterCat])

  function startCreate() {
    setCreating(true)
    setEditingId(null)
    setForm({ ...emptyForm(), category: filterCat === 'all' ? 'client_email' : filterCat })
  }

  function startEdit(t) {
    setCreating(false)
    setEditingId(t.id)
    setForm({
      name: t.name,
      category: t.category,
      subjectTemplate: t.subjectTemplate,
      bodyHtmlTemplate: t.bodyHtmlTemplate,
      isDefault: t.isDefault,
      branding: { ...emptyForm().branding, ...(t.branding || {}) },
    })
  }

  function cancelEditor() {
    setCreating(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  function save() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    void (async () => {
      try {
        if (creating) {
          await addEmailTemplate(form)
          toast.success('Template created')
        } else if (editingId) {
          await updateEmailTemplate(editingId, form)
          toast.success('Template updated')
        }
        cancelEditor()
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Save failed')
      }
    })()
  }

  function onDelete(id) {
    void (async () => {
      try {
        await deleteEmailTemplate(id)
        toast.success('Template removed')
        setConfirmDelete(null)
        if (editingId === id) cancelEditor()
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Delete failed')
      }
    })()
  }

  const externalFields = isExternalFacingCategory(form.category)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-700 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Email templates</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Manage Brevo email layouts for clients, internal notes, enquiries, quotations, and reports. Mark one template
            per category as default. External-facing templates support logo, company line, accent colour, and footer.
            Enquiry placeholders include <code className="text-[11px]">clientDetailsBlock</code>,{' '}
            <code className="text-[11px]">enquirySummaryBlock</code>, <code className="text-[11px]">enquiryLineItemsBlock</code>
            . Quotation templates can use <code className="text-[11px]">quotationLineItemsBlock</code>,{' '}
            <code className="text-[11px]">quotationTotalsBlock</code>, <code className="text-[11px]">quotationClientActions</code>{' '}
            (Accept/Decline links). Use <strong>Restore defaults</strong> to load the latest starter layouts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirmReset(true)}>
            Restore defaults
          </Button>
          <Button type="button" variant="primary" onClick={startCreate}>
            New template
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Category</label>
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">All</option>
            {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Templates" subtitle="Click a row to edit" accent="from-[var(--color-va-blue)] to-slate-800">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No templates in this filter.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => startEdit(t)}
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {EMAIL_TEMPLATE_CATEGORIES.find((c) => c.id === t.category)?.label || t.category}
                      {t.isDefault ? ' · default' : ''}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    {!t.isDefault ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="!text-xs"
                        onClick={() => {
                          void (async () => {
                            try {
                              await setDefaultEmailTemplate(t.id)
                              toast.success('Default updated')
                            } catch (e) {
                              const d = e?.response?.data?.detail
                              toast.error(typeof d === 'string' ? d : e?.message || 'Could not set default')
                            }
                          })()
                        }}
                      >
                        Make default
                      </Button>
                    ) : null}
                    <Button type="button" variant="ghost" className="!text-xs text-rose-600" onClick={() => setConfirmDelete(t.id)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {(creating || editingId) && (
          <Card
            title={creating ? 'New template' : 'Edit template'}
            subtitle="Use {{variableName}} placeholders in subject and body"
            accent="from-emerald-500 to-blue-800"
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Name</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Category</label>
                <Select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
                Default for this category
              </label>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Subject</label>
                <Input
                  value={form.subjectTemplate}
                  onChange={(e) => setForm((f) => ({ ...f, subjectTemplate: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">HTML body</label>
                <Textarea
                  rows={12}
                  className="font-mono text-xs"
                  value={form.bodyHtmlTemplate}
                  onChange={(e) => setForm((f) => ({ ...f, bodyHtmlTemplate: e.target.value }))}
                />
              </div>

              {externalFields ? (
                <div className="space-y-3 border border-slate-200 p-3 dark:border-slate-600">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-va-blue)]">
                    External branding (client & external mail)
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Logo URL</label>
                    <Input
                      value={form.branding.logoUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, branding: { ...f.branding, logoUrl: e.target.value } }))
                      }
                      placeholder="https://…"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Logo alt text</label>
                      <Input
                        value={form.branding.logoAlt}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, branding: { ...f.branding, logoAlt: e.target.value } }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Logo max width (px)</label>
                      <Input
                        type="number"
                        min={48}
                        max={400}
                        value={form.branding.logoMaxWidthPx}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            branding: { ...f.branding, logoMaxWidthPx: Number(e.target.value) || 160 },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Company / header line</label>
                    <Input
                      value={form.branding.companyName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, branding: { ...f.branding, companyName: e.target.value } }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Accent colour (hex)</label>
                    <Input
                      value={form.branding.accentColor}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, branding: { ...f.branding, accentColor: e.target.value } }))
                      }
                      placeholder="#2563eb"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Header tagline (optional)</label>
                    <Input
                      value={form.branding.headerTagline}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, branding: { ...f.branding, headerTagline: e.target.value } }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Footer note</label>
                    <Textarea
                      rows={2}
                      value={form.branding.footerNote}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, branding: { ...f.branding, footerNote: e.target.value } }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Internal-only templates use a simple layout without the external logo wrapper.
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={cancelEditor}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={save}>
                  {creating ? 'Create' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Restore default templates?"
        message="This replaces all email templates with the built-in starter set. Your Brevo API settings in Settings are not changed."
        confirmLabel="Restore"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetEmailTemplatesToDefaults()
          toast.success('Templates reset to defaults')
          setConfirmReset(false)
          cancelEditor()
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete template?"
        message="Remove this template permanently?"
        confirmLabel="Delete"
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && onDelete(confirmDelete)}
      />
    </div>
  )
}
