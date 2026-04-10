/** @typedef {'admin' | 'sales' | 'pricing' | 'boss'} Role */

export const ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  PRICING: 'pricing',
  BOSS: 'boss',
}

export function canManageUsers(role) {
  return role === ROLES.ADMIN || role === ROLES.BOSS
}

/** Sales + admin + boss: operational CRM (clients, quotes, invoices, enquiries). */
export function canUseSalesPipeline(role) {
  return role === ROLES.ADMIN || role === ROLES.SALES || role === ROLES.BOSS
}

export function canViewAllEnquiries(role) {
  return role === ROLES.ADMIN || role === ROLES.SALES || role === ROLES.BOSS
}

/** All user ids assigned at enquiry level or on any line item. */
export function collectPricingAssignmentUserIds(enquiry) {
  if (!enquiry) return []
  const set = new Set(enquiry.assignedPricingUserIds || [])
  for (const li of enquiry.lineItems || []) {
    for (const id of li.assignedPricingUserIds || []) {
      if (id) set.add(id)
    }
  }
  return [...set]
}

/**
 * User may price this line: explicit line assignees, or (if none) enquiry-level assignees.
 */
export function canPriceLineItem(enquiry, userId, lineItemId) {
  if (!enquiry || !userId || !lineItemId) return false
  const li = (enquiry.lineItems || []).find((l) => l.id === lineItemId)
  if (!li) return false
  const lineIds = li.assignedPricingUserIds
  if (Array.isArray(lineIds) && lineIds.length > 0) return lineIds.includes(userId)
  return (enquiry.assignedPricingUserIds || []).includes(userId)
}

function pricingUserHasAnyLineAccess(enquiry, userId) {
  if ((enquiry.assignedPricingUserIds || []).includes(userId)) return true
  return (enquiry.lineItems || []).some((li) => {
    const ids = li.assignedPricingUserIds
    if (Array.isArray(ids) && ids.length > 0) return ids.includes(userId)
    return false
  })
}

export function canSeeEnquiry(role, enquiry, userId) {
  if (!enquiry) return false
  if (role === ROLES.ADMIN || role === ROLES.SALES || role === ROLES.BOSS) return true
  if (role === ROLES.PRICING) return pricingUserHasAnyLineAccess(enquiry, userId)
  return false
}

export function canEditEnquiryCore(role) {
  return role === ROLES.ADMIN || role === ROLES.SALES
}

export function canDeleteEnquiry(role) {
  return role === ROLES.ADMIN || role === ROLES.SALES
}

/** Add / edit line-item prices for an enquiry (pricing user must be assigned on enquiry or a line) */
export function canEditEnquiryPricing(role, enquiry, userId) {
  if (!enquiry) return false
  if (role === ROLES.ADMIN || role === ROLES.BOSS) return true
  if (role === ROLES.PRICING) return pricingUserHasAnyLineAccess(enquiry, userId)
  return false
}

export function canAssignPricingTeam(role) {
  return role === ROLES.ADMIN || role === ROLES.SALES || role === ROLES.BOSS
}
