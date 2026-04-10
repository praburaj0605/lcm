const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

function proxyUrl() {
  if (import.meta.env.DEV) return '/__brevo/send'
  const u = import.meta.env.VITE_BREVO_PROXY_URL
  return u && String(u).trim() ? String(u).trim() : null
}

/**
 * @param {object} params
 * @param {string} params.apiKey
 * @param {{ name?: string, email: string }} params.sender
 * @param {string|string[]} params.to - one or more recipient emails
 * @param {string} params.subject
 * @param {string} params.htmlContent
 * @param {string} [params.replyTo]
 * @returns {Promise<{ ok: true, messageId?: string } | { ok: false, error: string, status?: number }>}
 */
export async function sendTransactionalEmail({ apiKey, sender, to, subject, htmlContent, replyTo }) {
  if (!apiKey?.trim()) {
    return { ok: false, error: 'Brevo API key is not configured. Add it in Settings.' }
  }
  if (!sender?.email?.trim()) {
    return { ok: false, error: 'Sender email is not configured. Set it in Settings → Brevo.' }
  }

  const emails = (Array.isArray(to) ? to : [to])
    .map((e) => String(e).trim())
    .filter(Boolean)
  if (!emails.length) {
    return { ok: false, error: 'Add at least one recipient email.' }
  }

  const payload = {
    sender: {
      email: sender.email.trim(),
      ...(sender.name?.trim() ? { name: sender.name.trim() } : {}),
    },
    to: emails.map((email) => ({ email })),
    subject: subject || '(no subject)',
    htmlContent: htmlContent || '<p></p>',
    ...(replyTo?.trim() ? { replyTo: { email: replyTo.trim() } } : {}),
  }

  const proxied = proxyUrl()
  try {
    let res
    if (proxied) {
      res = await fetch(proxied, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), payload }),
      })
    } else {
      res = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })
    }

    const text = await res.text()
    let json
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      json = { raw: text }
    }

    if (!res.ok) {
      const msg = json.message || json.error || json.raw || res.statusText || 'Request failed'
      return {
        ok: false,
        error: typeof msg === 'string' ? msg : JSON.stringify(msg),
        status: res.status,
      }
    }

    return { ok: true, messageId: json.messageId }
  } catch (e) {
    const hint =
      !proxied && !import.meta.env.DEV
        ? ' In production, set VITE_BREVO_PROXY_URL to a same-origin API route that forwards to Brevo (browser CORS).'
        : ''
    return { ok: false, error: `${e?.message || String(e)}.${hint}` }
  }
}

/**
 * Lightweight connectivity check (sends nothing — validates key via a minimal invalid call pattern is not ideal).
 * Brevo has no simple ping; we validate key format and optional account endpoint.
 * Here we only check local config.
 */
export function validateBrevoConfig({ apiKey, senderEmail }) {
  if (!apiKey?.trim()) return { ok: false, error: 'API key is empty' }
  if (!senderEmail?.trim()) return { ok: false, error: 'Sender email is empty' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim())) {
    return { ok: false, error: 'Sender email looks invalid' }
  }
  return { ok: true }
}
