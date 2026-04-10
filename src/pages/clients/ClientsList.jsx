import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { DataTable } from '../../components/tables/DataTable'
import { ACTION_COLUMN_META, ROW_ACTIONS_CLASS } from '../../components/tables/tableActionColumn'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Badge } from '../../components/ui/Badge'
import { IconButton } from '../../components/ui/IconButton'
import { icons } from '../../components/icons/TableActionIcons'
import { useHydrated } from '../../hooks/useHydrated'
import { Skeleton } from '../../components/ui/Skeleton'
import { ClientDetailView } from '../../components/detailViews/ReadableEntityDetails'
import { toast } from 'sonner'
import { canUseSalesPipeline } from '../../utils/permissions'

const columnHelper = createColumnHelper()

export function ClientsList() {
  const hydrated = useHydrated()
  const navigate = useNavigate()
  const role = useAppStore((s) => s.auth.user?.role)
  const clients = useAppStore((s) => s.clients)
  const deleteClient = useAppStore((s) => s.deleteClient)

  const [viewRow, setViewRow] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const columns = useMemo(
    () => [
      columnHelper.accessor('clientName', { header: 'Name' }),
      columnHelper.accessor('companyName', { header: 'Company' }),
      columnHelper.accessor(
        (row) => `${row.email} · ${row.phone}`,
        { id: 'contact', header: 'Contact' },
      ),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) =>
          info.getValue() === 'Active' ? (
            <Badge tone="green">Active</Badge>
          ) : (
            <Badge tone="neutral">Inactive</Badge>
          ),
        filterFn: 'equals',
        meta: {
          filter: 'select',
          filterLabel: 'Status',
          options: [
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ],
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
            <IconButton action="edit" title="Edit client" onClick={() => navigate(`/clients/${row.original.id}/edit`)}>
              {icons.pencil}
            </IconButton>
            <IconButton action="delete" title="Delete client" onClick={() => setDeleteId(row.original.id)}>
              {icons.trash}
            </IconButton>
          </div>
        ),
        enableSorting: false,
      }),
    ],
    [navigate],
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clients</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Directory — create new records from the button on the right.</p>
        </div>
        {role && canUseSalesPipeline(role) ? (
          <Button to="/clients/new" variant="primary">
            Create client
          </Button>
        ) : null}
      </div>

      <Card title="Client directory" subtitle="Sort, search, filter, paginate" accent="from-amber-400 to-red-600">
        <DataTable columns={columns} data={clients} pageSize={8} />
      </Card>

      <Modal open={!!viewRow} title="Client details" onClose={() => setViewRow(null)} wide>
        {viewRow ? <ClientDetailView client={viewRow} /> : null}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete client?"
        message="This cannot be undone. If the client is referenced elsewhere, delete will be blocked."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          void (async () => {
            try {
              const res = await deleteClient(deleteId)
              if (!res.ok) toast.error(res.error)
              else toast.success('Client deleted')
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
