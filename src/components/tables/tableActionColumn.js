/**
 * Shared DataTable column meta + row cell wrapper for icon action buttons.
 * Keeps actions on one line; pair with DataTable support for meta.thClassName / meta.tdClassName.
 */
export const ACTION_COLUMN_META = Object.freeze({
  thClassName: 'text-right',
  tdClassName: 'whitespace-nowrap text-right w-[1%]',
})

export const ROW_ACTIONS_CLASS =
  'inline-flex flex-nowrap items-center justify-end gap-0.5'
