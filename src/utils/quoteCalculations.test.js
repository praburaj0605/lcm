import { describe, expect, it } from 'vitest'
import { calcInvoiceTotals, calcLineTax, calcQuoteTotals } from './quoteCalculations'

describe('calcLineTax', () => {
  it('computes tax from qty, price, and percent', () => {
    expect(calcLineTax({ quantity: 2, price: 50, taxPercent: 10 })).toBe(10)
  })

  it('treats missing numbers as zero', () => {
    expect(calcLineTax({})).toBe(0)
    expect(calcLineTax({ quantity: 'x', price: null, taxPercent: NaN })).toBe(0)
  })
})

describe('calcQuoteTotals', () => {
  it('sums subtotal, tax, discount, and final amount', () => {
    const items = [
      { quantity: 1, price: 100, taxPercent: 10 },
      { quantity: 2, price: 25, taxPercent: 0 },
    ]
    const out = calcQuoteTotals(items, 15)
    expect(out.subtotal).toBe(150)
    expect(out.taxTotal).toBe(10)
    expect(out.total).toBe(160)
    expect(out.finalAmount).toBe(145)
  })

  it('never returns negative final amount', () => {
    const out = calcQuoteTotals([{ quantity: 1, price: 10, taxPercent: 0 }], 999)
    expect(out.finalAmount).toBe(0)
  })

  it('handles non-array items', () => {
    const out = calcQuoteTotals(null, 0)
    expect(out).toEqual({ subtotal: 0, taxTotal: 0, total: 0, finalAmount: 0 })
  })
})

describe('calcInvoiceTotals', () => {
  it('returns subtotal plus tax', () => {
    expect(
      calcInvoiceTotals([
        { quantity: 1, price: 200, taxPercent: 5 },
        { quantity: 1, price: 100, taxPercent: 0 },
      ]),
    ).toBe(310)
  })
})
