export function calcLineTax(line) {
  const qty = Number(line.quantity) || 0
  const price = Number(line.price) || 0
  const pct = Number(line.taxPercent) || 0
  const lineTotal = qty * price
  return lineTotal * (pct / 100)
}

export function calcQuoteTotals(items, discount) {
  const list = Array.isArray(items) ? items : []
  const subtotal = list.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0)
  const taxTotal = list.reduce((s, i) => s + calcLineTax(i), 0)
  const total = subtotal + taxTotal
  const finalAmount = Math.max(0, total - (Number(discount) || 0))
  return { subtotal, taxTotal, total, finalAmount }
}

export function calcInvoiceTotals(items) {
  const list = Array.isArray(items) ? items : []
  const subtotal = list.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0)
  const taxTotal = list.reduce((s, i) => s + calcLineTax(i), 0)
  return subtotal + taxTotal
}
