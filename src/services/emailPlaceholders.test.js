import { describe, expect, it } from 'vitest'
import {
  buildClientEmailContext,
  buildFinalEmailHtml,
  buildInternalQuotationEmailContext,
  buildInvoiceShareEmailContext,
  buildQuotationEmailContext,
  buildReportEmailContext,
  interpolateTemplate,
} from './emailPlaceholders'

describe('interpolateTemplate', () => {
  it('replaces known keys', () => {
    expect(interpolateTemplate('Hello {{name}}', { name: 'Ada' })).toBe('Hello Ada')
  })

  it('trims spaces inside braces', () => {
    expect(interpolateTemplate('{{  x  }}', { x: 'y' })).toBe('y')
  })

  it('uses empty string for unknown keys', () => {
    expect(interpolateTemplate('{{a}}-{{b}}', { a: '1' })).toBe('1-')
  })

  it('returns empty for falsy template', () => {
    expect(interpolateTemplate('', {})).toBe('')
    expect(interpolateTemplate(null, {})).toBe('')
  })
})

describe('buildClientEmailContext', () => {
  it('prefers contact name and company fields', () => {
    const ctx = buildClientEmailContext({
      client: {
        companyName: 'Co',
        contactPersonName: 'Pat',
        clientName: 'Ignore',
      },
      sender: { name: 'Sam', email: 's@x.com', company: 'Org' },
    })
    expect(ctx.recipientName).toBe('Pat')
    expect(ctx.clientCompanyName).toBe('Co')
    expect(ctx.senderName).toBe('Sam')
  })
})

describe('buildQuotationEmailContext', () => {
  it('includes respond URLs when token and base are set', () => {
    const ctx = buildQuotationEmailContext({
      quotation: {
        id: 'q1',
        quoteId: 'Q-9',
        clientResponseToken: 'tok',
        currency: 'USD',
        items: [{ name: 'Item', quantity: 1, price: 10, taxPercent: 0 }],
        status: 'Sent',
      },
      client: { companyName: 'Buyer' },
      respondBaseUrl: 'https://app.example.com',
    })
    expect(ctx.quotationClientActions).toContain('/api/public/quotations/q1/respond')
    expect(ctx.quotationClientActions).toContain(encodeURIComponent('tok'))
  })

  it('omits action buttons for internal copy', () => {
    const ctx = buildInternalQuotationEmailContext({
      quotation: { id: 'q1', quoteId: 'Q-1', items: [], currency: 'EUR' },
      client: {},
    })
    expect(ctx.quotationClientActions).toContain('Internal copy')
    expect(ctx.body).toContain('Internal:')
  })
})

describe('buildInvoiceShareEmailContext', () => {
  it('builds internal invoice summary body', () => {
    const ctx = buildInvoiceShareEmailContext({
      invoice: {
        id: 'inv1',
        invoiceId: 'INV-1',
        paymentStatus: 'Pending',
        quoteId: 'Q-1',
        totalAmount: 100,
        paidAmount: 0,
        dueAmount: 100,
        dueDate: '2026-04-01',
        paymentMethod: 'Wire',
        billingAddress: '123 St',
        items: [{ name: 'Freight', quantity: 1, price: 100, taxPercent: 0 }],
        currency: 'USD',
      },
      client: { companyName: 'Acme' },
      sender: { name: 'Sam', email: 's@x.com' },
    })
    expect(ctx.subjectLine).toContain('INV-1')
    expect(ctx.body).toContain('Invoice summary')
    expect(ctx.body).toContain('Acme')
    expect(ctx.senderEmail).toBe('s@x.com')
  })
})

describe('buildFinalEmailHtml', () => {
  it('wraps external categories with branding shell', () => {
    const html = buildFinalEmailHtml({
      category: 'quotation',
      bodyAfterInterpolation: '<p>Hi</p>',
      branding: { companyName: 'ACME', accentColor: '#ff0000' },
    })
    expect(html).toContain('ACME')
    expect(html).toContain('#ff0000')
  })

  it('uses minimal wrapper for internal_email', () => {
    const html = buildFinalEmailHtml({
      category: 'internal_email',
      bodyAfterInterpolation: '<p>X</p>',
      branding: {},
    })
    expect(html).toContain('<p>X</p>')
    expect(html).not.toContain('max-width:640px')
  })
})

describe('buildReportEmailContext', () => {
  it('formats KPI table', () => {
    const ctx = buildReportEmailContext({
      kpis: { enquiries: 3, quotations: 2, invoices: 1, collected: 100.5, outstanding: 40 },
      rangeSubtitle: 'Jan 2026',
      salesFocusLabel: 'Team A',
      sender: {},
    })
    expect(ctx.reportSummaryTable).toContain('Jan 2026')
    expect(ctx.reportSummaryTable).toContain('100.50')
    expect(ctx.generatedAt).toMatch(/\d{4}/)
  })
})
