import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { DataTable } from '../../components/tables/DataTable'
import { ACTION_COLUMN_META, ROW_ACTIONS_CLASS } from '../../components/tables/tableActionColumn'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { icons } from '../../components/icons/TableActionIcons'
import { canUseSalesPipeline } from '../../utils/permissions'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Badge } from '../../components/ui/Badge'
import { useHydrated } from '../../hooks/useHydrated'
import { Skeleton } from '../../components/ui/Skeleton'
import { isInvoiceOverdue } from '../../utils/metrics'
import { InvoiceDetailView } from '../../components/detailViews/ReadableEntityDetails'
import { EntityShareToolbar } from '../../components/share/EntityShareToolbar'
import { toast } from 'sonner'

function payTone(row) {
  const st = row.paymentStatus
  if (st === 'Paid') return 'green'
  if (st === 'Overdue' || isInvoiceOverdue(row)) return 'red'
  return 'yellow'
}

const columnHelper = createColumnHelper()

export function InvoicesList() {
  const hydrated = useHydrated()
  const navigate = useNavigate()
  const role = useAppStore((s) => s.auth.user?.role)
  const clients = useAppStore((s) => s.clients)
  const invoices = useAppStore((s) => s.invoices)
  const deleteInvoice = useAppStore((s) => s.deleteInvoice)

  const [viewRow, setViewRow] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const printDetailRef = useRef(null)

  const resolveClientLabel = useCallback(
    (id) =>
      clients.find((c) => c.id === id)?.companyName ||
      clients.find((c) => c.id === id)?.clientName ||
      '—',
    [clients],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('invoiceId', { header: 'Invoice ID' }),
      columnHelper.accessor((row) => resolveClientLabel(row.clientId), { id: 'client', header: 'Client' }),
      columnHelper.accessor('totalAmount', {
        header: 'Total',
        cell: (info) => `$${Number(info.getValue() || 0).toFixed(2)}`,
      }),
      columnHelper.accessor('dueAmount', {
        header: 'Due',
        cell: (info) => `$${Number(info.getValue() || 0).toFixed(2)}`,
      }),
      columnHelper.accessor('paymentStatus', {
        header: 'Status',
        cell: ({ row }) => <Badge tone={payTone(row.original)}>{row.original.paymentStatus}</Badge>,
        filterFn: 'equals',
        meta: {
          filter: 'select',
          filterLabel: 'Status',
          options: [
            { value: 'Paid', label: 'Paid' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Overdue', label: 'Overdue' },
          ],
        },
      }),
      columnHelper.accessor('dueDate', {
        header: 'Due date',
        cell: (info) => {
          const v = info.getValue()
          if (!v) return '—'
          try {
            return format(parseISO(v), 'PP')
          } catch {
            return v
          }
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        meta: ACTION_COLUMN_META,
        cell: ({ row }) => (
          <div className={ROW_ACTIONS_CLASS}>
            <IconButton action="view" title="View details" onClick={() => setViewRow(row.original)}>
              {icons.eye}
            </IconButton>
            <IconButton action="edit" title="Edit invoice" onClick={() => navigate(`/invoices/${row.original.id}/edit`)}>
              {icons.pencil}
            </IconButton>
            <IconButton action="delete" title="Delete invoice" onClick={() => setDeleteId(row.original.id)}>
              {icons.trash}
            </IconButton>
          </div>
        ),
        enableSorting: false,
      }),
    ],
    [navigate, resolveClientLabel],
  )

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invoices</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">List view — create from the right.</p>
        </div>
        {role && canUseSalesPipeline(role) ? (
          <Button to="/invoices/new" variant="primary">
            Create invoice
          </Button>
        ) : null}
      </div>

      <Card title="Invoices" accent="from-blue-600 to-red-600">
        <DataTable columns={columns} data={invoices} pageSize={8} />
      </Card>

      <Modal open={!!viewRow} title="Invoice details" onClose={() => setViewRow(null)} wide>
        {viewRow ? (
          <>
            <EntityShareToolbar
              kind="invoice"
              record={viewRow}
              client={clients.find((c) => c.id === viewRow.clientId)}
              printRootRef={printDetailRef}
            />
            <div ref={printDetailRef} className="crm-print-root" data-crm-print-root>
              <h2 className="mb-3 hidden text-base font-bold text-slate-900 print:block dark:text-white">
                Invoice {viewRow.invoiceId || viewRow.id}
              </h2>
              <InvoiceDetailView invoice={viewRow} clientLabel={resolveClientLabel(viewRow.clientId)} />
            </div>
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete invoice?"
        message="Removes this invoice from local storage."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          void (async () => {
            try {
              await deleteInvoice(deleteId)
              toast.success('Deleted')
            } catch (e) {
              const d = e?.response?.data?.detail
              toast.error(typeof d === 'string' ? d : e?.message || 'Delete failed')
            }
            setDeleteId(null)
          })()
        }}
      />
    </div>
  )
}
