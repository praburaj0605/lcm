export function pickTemplateForCategory(templates, category, templateId) {
  const list = (templates || []).filter((t) => t.category === category)
  if (templateId) {
    const one = list.find((t) => t.id === templateId)
    if (one) return one
  }
  return list.find((t) => t.isDefault) || list[0] || null
}
