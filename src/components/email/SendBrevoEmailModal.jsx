import { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { useAppStore } from '../../store/useAppStore'
import { sendTransactionalEmail } from '../../services/brevoClient'
import { isApiMode } from '../../services/apiMode'
import { apiBrevoSend } from '../../services/crmApi'
import { buildFinalEmailHtml, interpolateTemplate } from '../../services/emailPlaceholders'
import { pickTemplateForCategory } from '../../services/emailTemplatePick'
import { toast } from 'sonner'

/**
 * Remount with a new `key` when opening so recipient/template fields reset cleanly.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.category
 * @param {Record<string, string>} props.placeholderContext
 * @param {Record<string, string>} [props.placeholderContextInternal]
 * @param {boolean} [props.allowAudienceToggle]
 * @param {string} [props.defaultTo]
 * @param {string} [props.title]
 * @param {string} [props.extraBody]
 */
export function SendBrevoEmailModal({
  open,
  onClose,
  category,
  placeholderContext,
  placeholderContextInternal,
  allowAudienceToggle = false,
  defaultTo = '',
  title = 'Send email (Brevo)',
  extraBody = '',
}) {
  const brevoSettings = useAppStore((s) => s.brevoSettings)
  const emailTemplates = useAppStore((s) => s.emailTemplates)

  const [audience, setAudience] = useState('external')
  const [to, setTo] = useState(() => defaultTo || '')
  const [templateId, setTemplateId] = useState(null)
  const [subjectDirty, setSubjectDirty] = useState(false)
  const [subjectOverride, setSubjectOverride] = useState('')
  const [bodyExtra, setBodyExtra] = useState(() => extraBody || '')
  const [sending, setSending] = useState(false)

  const effectiveCategory = allowAudienceToggle && audience === 'internal' ? 'internal_email' : category

  const activeContext = useMemo(() => {
    const ext = placeholderContext || {}
    if (allowAudienceToggle && audience === 'internal') {
      return { ...ext, ...(placeholderContextInternal || ext) }
    }
    return ext
  }, [allowAudienceToggle, audience, placeholderContext, placeholderContextInternal])

  const templatesInCategory = useMemo(
    () => emailTemplates.filter((t) => t.category === effectiveCategory),
    [emailTemplates, effectiveCategory],
  )

  const selected = useMemo(() => {
    return pickTemplateForCategory(emailTemplates, effectiveCategory, templateId || undefined)
  }, [emailTemplates, effectiveCategory, templateId])

  const derivedSubject = useMemo(() => {
    if (!selected) return ''
    const ctx = { ...activeContext, body: bodyExtra || activeContext?.body || '' }
    return interpolateTemplate(selected.subjectTemplate, ctx)
  }, [selected, activeContext, bodyExtra])

  const subjectValue = subjectDirty ? subjectOverride : derivedSubject

  async function handleSend() {
    if (!selected) {
      toast.error('No template for this category. Add one under Email templates.')
      return
    }
    const ctx = {
      ...activeContext,
      body: bodyExtra || activeContext?.body || '',
    }
    const subject = subjectDirty ? interpolateTemplate(subjectOverride, ctx) : derivedSubject
    const innerHtml = interpolateTemplate(selected.bodyHtmlTemplate, ctx)
    const html = buildFinalEmailHtml({
      category: effectiveCategory,
      bodyAfterInterpolation: innerHtml,
      branding: selected.branding,
    })

    const toList = to
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter(Boolean)
    if (!toList.length) {
      toast.error('Add at least one recipient.')
      return
    }

    setSending(true)
    try {
      if (isApiMode()) {
        const payload = {
          sender: {
            email: brevoSettings.senderEmail,
            ...(brevoSettings.senderName || brevoSettings.organizationName
              ? { name: brevoSettings.senderName || brevoSettings.organizationName }
              : {}),
          },
          to: toList.map((email) => ({ email })),
          subject,
          htmlContent: html,
          ...(brevoSettings.replyToEmail?.trim()
            ? { replyTo: { email: brevoSettings.replyToEmail.trim() } }
            : {}),
        }
        await apiBrevoSend(payload)
        toast.success('Email sent (server Brevo proxy)')
      } else {
        const result = await sendTransactionalEmail({
          apiKey: brevoSettings.apiKey,
          sender: {
            email: brevoSettings.senderEmail,
            name: brevoSettings.senderName || brevoSettings.organizationName || undefined,
          },
          to: toList,
          subject,
          htmlContent: html,
          replyTo: brevoSettings.replyToEmail || undefined,
        })
        if (!result.ok) {
          toast.error(result.error || 'Send failed')
          return
        }
        toast.success('Email sent via Brevo')
      }
      onClose?.()
    } catch (e) {
      const d = e?.response?.data?.detail
      const msg = typeof d === 'string' ? d : Array.isArray(d) ? JSON.stringify(d) : e?.message || 'Send failed'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      {!templatesInCategory.length ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No templates in this category. An admin can add them under <strong>Email templates</strong>.
        </p>
      ) : (
        <div className="space-y-4">
          {allowAudienceToggle ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Audience</label>
              <Select
                value={audience}
                onChange={(e) => {
                  setSubjectDirty(false)
                  setTemplateId(null)
                  setAudience(e.target.value)
                }}
              >
                <option value="external">Client / external</option>
                <option value="internal">Internal team</option>
              </Select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                External uses branded templates; internal uses your internal email templates (no client logo wrapper).
              </p>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Template</label>
            <Select
              value={selected?.id || ''}
              onChange={(e) => {
                setSubjectDirty(false)
                setTemplateId(e.target.value || null)
              }}
            >
              {templatesInCategory.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">To (comma-separated)</label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Subject</label>
            <Input
              value={subjectValue}
              onChange={(e) => {
                setSubjectDirty(true)
                setSubjectOverride(e.target.value)
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Extra message (optional — fills <code className="text-[11px]">{'{{body}}'}</code> when used in template)
            </label>
            <Textarea rows={4} value={bodyExtra} onChange={(e) => setBodyExtra(e.target.value)} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Client-facing categories wrap content with logo, accent colour, and footer from the template&apos;s branding
            settings.
          </p>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={sending} onClick={handleSend}>
              {sending ? 'Sending…' : 'Send with Brevo'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
