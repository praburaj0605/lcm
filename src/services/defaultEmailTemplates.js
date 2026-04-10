import { nanoid } from 'nanoid'

const defaultBranding = () => ({
  logoUrl: '',
  logoAlt: 'Company logo',
  logoMaxWidthPx: 160,
  companyName: '',
  accentColor: '#2563eb',
  headerTagline: '',
  footerNote: '',
})

function tpl(category, name, subjectTemplate, bodyHtmlTemplate, isDefault, branding) {
  return {
    id: nanoid(),
    category,
    name,
    subjectTemplate,
    bodyHtmlTemplate,
    isDefault,
    branding: { ...defaultBranding(), ...branding },
  }
}

export function createDefaultEmailTemplates() {
  return [
    tpl(
      'client_email',
      'Default client message',
      'Message from {{senderCompany}}',
      `<p>Hello {{recipientName}},</p>
<p>{{body}}</p>
<p>Kind regards,<br/>{{senderName}}<br/>{{senderEmail}}</p>`,
      true,
      { companyName: '{{senderCompany}}', footerNote: 'This email was sent from your logistics CRM.' },
    ),
    tpl(
      'internal_email',
      'Default internal note',
      '[Internal] {{subjectLine}}',
      `<p>Hi team,</p>
<p>{{body}}</p>
<p><small>Sent by {{senderName}} ({{senderEmail}})</small></p>`,
      true,
      {},
    ),
    tpl(
      'enquiry',
      'Share enquiry (client)',
      'Enquiry {{enquiryId}} — {{commodityDescription}}',
      `<p>Hello {{contactPerson}},</p>
<p>Thank you for your interest. Below is a structured summary for enquiry <strong>{{enquiryId}}</strong> ({{customerCompanyName}}).</p>
{{clientDetailsBlock}}
{{enquirySummaryBlock}}
{{enquiryLineItemsBlock}}
{{enquiryRemarks}}
<p>We will be in touch shortly.</p>
<p>Best regards,<br/>{{senderName}}<br/>{{senderEmail}}</p>`,
      true,
      { footerNote: 'If you have questions, reply to this email.' },
    ),
    tpl(
      'quotation',
      'Share quotation (client)',
      'Quotation {{quoteId}} — {{currency}} {{finalAmount}}',
      `<p>Hello {{clientContactName}},</p>
<p>Please review our quotation <strong>{{quoteId}}</strong> for <strong>{{clientCompanyName}}</strong>.</p>
{{clientDetailsBlock}}
{{quotationLineItemsBlock}}
{{quotationTotalsBlock}}
{{quotationClientActions}}
<p>{{quoteNotes}}</p>
<p>Kind regards,<br/>{{senderName}}<br/>{{senderEmail}}</p>`,
      true,
      { footerNote: 'This quotation is subject to our standard terms. Use the buttons above to accept or decline where supported.' },
    ),
    tpl(
      'report',
      'Management summary',
      'Management report — {{periodLabel}}',
      `<p>Hello,</p>
<p>Please find a summary for <strong>{{periodLabel}}</strong>.</p>
{{reportSummaryTable}}
<p><small>Generated {{generatedAt}} · {{salesFocusLabel}}</small></p>
<p>{{senderName}} · {{senderEmail}}</p>`,
      true,
      { companyName: 'Management reporting', footerNote: 'Confidential — for internal distribution.' },
    ),
  ]
}
