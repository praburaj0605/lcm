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
import { QuotationDetailView } from '../../components/detailViews/ReadableEntityDetails'
import { EntityShareToolbar } from '../../components/share/EntityShareToolbar'
import { toast } from 'sonner'

const columnHelper = createColumnHelper()

export function QuotationsList() {
  const hydrated = useHydrated()
  const navigate = useNavigate()
  const role = useAppStore((s) => s.auth.user?.role)
  const clients = useAppStore((s) => s.clients)
  const quotations = useAppStore((s) => s.quotations)
  const enquiries = useAppStore((s) => s.enquiries)
  const deleteQuotation = useAppStore((s) => s.deleteQuotation)

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
      columnHelper.accessor('quoteId', { header: 'Quote ID' }),
      columnHelper.accessor((row) => resolveClientLabel(row.clientId), { id: 'client', header: 'Client' }),
      columnHelper.accessor('finalAmount', {
        header: 'Amount',
        cell: (info) => `$${Number(info.getValue() || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <Badge tone="blue">{info.getValue()}</Badge>,
        filterFn: 'equals',
        meta: {
          filter: 'select',
          filterLabel: 'Status',
          options: ['Draft', 'Sent', 'Accepted', 'Rejected'].map((s) => ({ value: s, label: s })),
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: (info) => {
          const v = info.getValue()
          try {
            return v ? format(parseISO(v), 'PP') : '—'
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
            <IconButton action="edit" title="Edit quotation" onClick={() => navigate(`/quotations/${row.original.id}/edit`)}>
              {icons.pencil}
            </IconButton>
            <IconButton action="delete" title="Delete quotation" onClick={() => setDeleteId(row.original.id)}>
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quotations</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">List view — create from the right.</p>
        </div>
        {role && canUseSalesPipeline(role) ? (
          <Button to="/quotations/new" variant="primary">
            Create quotation
          </Button>
        ) : null}
      </div>

      <Card title="Quotations" accent="from-red-500 to-amber-400">
        <DataTable columns={columns} data={quotations} pageSize={8} />
      </Card>

      <Modal open={!!viewRow} title="Quotation details" onClose={() => setViewRow(null)} wide>
        {viewRow ? (
          <>
            <EntityShareToolbar
              kind="quotation"
              record={viewRow}
              client={clients.find((c) => c.id === viewRow.clientId)}
              enquiry={enquiries.find((e) => e.id === viewRow.enquiryId)}
              printRootRef={printDetailRef}
            />
            <div ref={printDetailRef} className="crm-print-root" data-crm-print-root>
              <h2 className="mb-3 hidden text-base font-bold text-slate-900 print:block dark:text-white">
                Quotation {viewRow.quoteId || viewRow.id}
              </h2>
              <QuotationDetailView quotation={viewRow} clientLabel={resolveClientLabel(viewRow.clientId)} />
            </div>
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete quotation?"
        message="Removes this quotation from local storage."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          void (async () => {
            try {
              await deleteQuotation(deleteId)
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
