import { useCallback, useMemo, useRef, useState } from 'react'
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
import { EnquiryDetailView } from '../../components/detailViews/ReadableEntityDetails'
import { EntityShareToolbar } from '../../components/share/EntityShareToolbar'
import { toast } from 'sonner'
import {
  canAssignPricingTeam,
  canDeleteEnquiry,
  canEditEnquiryCore,
  canEditEnquiryPricing,
  canUseSalesPipeline,
  canViewAllEnquiries,
  canSeeEnquiry,
} from '../../utils/permissions'

function statusTone(status) {
  if (status === 'New') return 'yellow'
  if (status === 'In Progress') return 'blue'
  if (status === 'Quoted') return 'violet'
  if (status === 'Closed') return 'green'
  return 'neutral'
}

const columnHelper = createColumnHelper()

export function EnquiriesList() {
  const hydrated = useHydrated()
  const navigate = useNavigate()
  const role = useAppStore((s) => s.auth.user?.role)
  const userId = useAppStore((s) => s.auth.user?.id)
  const clients = useAppStore((s) => s.clients)
  const users = useAppStore((s) => s.users)
  const enquiries = useAppStore((s) => s.enquiries)
  const deleteEnquiry = useAppStore((s) => s.deleteEnquiry)
  const setEnquiryPricingAssignees = useAppStore((s) => s.setEnquiryPricingAssignees)

  const pricingTeamUsers = useMemo(() => users.filter((u) => u.role === 'pricing'), [users])

  const [viewRow, setViewRow] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [assignRow, setAssignRow] = useState(null)
  const [assignSelected, setAssignSelected] = useState([])
  const printDetailRef = useRef(null)

  const openAssign = useCallback((row) => {
    setAssignSelected([...(row.assignedPricingUserIds || [])])
    setAssignRow(row)
  }, [])

  const visibleEnquiries = useMemo(() => {
    if (!role || !userId) return []
    if (canViewAllEnquiries(role)) return enquiries
    return enquiries.filter((e) => canSeeEnquiry(role, e, userId))
  }, [enquiries, role, userId])

  const resolveClientName = useCallback(
    (cid) =>
      clients.find((c) => c.id === cid)?.companyName ||
      clients.find((c) => c.id === cid)?.clientName ||
      '—',
    [clients],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('enquiryId', { header: 'ID' }),
      columnHelper.accessor((row) => resolveClientName(row.clientId), { id: 'client', header: 'Client' }),
      columnHelper.accessor('serviceType', {
        header: 'Service',
        cell: (info) => <span className="capitalize">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('source', { header: 'Source' }),
      columnHelper.accessor('priority', { header: 'Priority' }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <Badge tone={statusTone(info.getValue())}>{info.getValue()}</Badge>,
        filterFn: 'equals',
        meta: {
          filter: 'select',
          filterLabel: 'Status',
          options: [
            { value: 'New', label: 'New' },
            { value: 'In Progress', label: 'In Progress' },
            { value: 'Quoted', label: 'Quoted' },
            { value: 'Closed', label: 'Closed' },
          ],
        },
      }),
      columnHelper.accessor('expectedValue', {
        header: 'Value',
        cell: (info) => `$${Number(info.getValue() || 0).toLocaleString()}`,
      }),
      columnHelper.accessor('followUpDate', {
        header: 'Follow-up',
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
        cell: ({ row }) => {
          const e = row.original
          return (
            <div className={ROW_ACTIONS_CLASS}>
              <IconButton action="view" title="View details" onClick={() => setViewRow(e)}>
                {icons.eye}
              </IconButton>
              {canEditEnquiryPricing(role, e, userId) ? (
                <IconButton
                  action="pricing"
                  title="Add line pricing"
                  onClick={() => navigate(`/enquiries/${e.id}/pricing`)}
                >
                  {icons.tag}
                </IconButton>
              ) : null}
              {canAssignPricingTeam(role) ? (
                <IconButton action="assign" title="Assign pricing team" onClick={() => openAssign(e)}>
                  {icons.userPlus}
                </IconButton>
              ) : null}
              {canEditEnquiryCore(role) ? (
                <IconButton action="edit" title="Edit enquiry" onClick={() => navigate(`/enquiries/${e.id}/edit`)}>
                  {icons.pencil}
                </IconButton>
              ) : null}
              {canDeleteEnquiry(role) ? (
                <IconButton action="delete" title="Delete" onClick={() => setDeleteId(e.id)}>
                  {icons.trash}
                </IconButton>
              ) : null}
            </div>
          )
        },
        enableSorting: false,
      }),
    ],
    [navigate, openAssign, resolveClientName, role, userId],
  )

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  function toggleAssign(uid) {
    setAssignSelected((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]))
  }

  function saveAssignees() {
    if (!assignRow) return
    void (async () => {
      try {
        await setEnquiryPricingAssignees(assignRow.id, assignSelected)
        toast.success('Pricing team updated')
        setAssignRow(null)
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not save assignments')
      }
    })()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Enquiries</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {role === 'pricing' ? 'Only enquiries assigned to you are listed.' : 'Pipeline — create from the button on the right.'}
          </p>
        </div>
        {role && canUseSalesPipeline(role) ? (
          <Button to="/enquiries/new" variant="primary">
            Create enquiry
          </Button>
        ) : null}
      </div>

      <Card title="Enquiry pipeline" accent="from-green-500 to-yellow-400">
        <DataTable columns={columns} data={visibleEnquiries} pageSize={8} />
      </Card>

      <Modal open={!!viewRow} title="Enquiry details" onClose={() => setViewRow(null)} wide>
        {viewRow ? (
          <>
            <EntityShareToolbar
              kind="enquiry"
              record={viewRow}
              client={clients.find((c) => c.id === viewRow.clientId)}
              printRootRef={printDetailRef}
            />
            <div ref={printDetailRef} className="crm-print-root" data-crm-print-root>
              <h2 className="mb-3 hidden text-base font-bold text-slate-900 print:block dark:text-white">
                Enquiry {viewRow.enquiryId || viewRow.id}
              </h2>
              <EnquiryDetailView enquiry={viewRow} clientLabel={resolveClientName(viewRow.clientId)} />
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={!!assignRow} title="Assign pricing team" onClose={() => setAssignRow(null)} wide>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Sets enquiry-wide pricing assignees (default for lines with no per-line assignees). To assign different users per line item, use Edit enquiry → Pricing line items.
        </p>
        {pricingTeamUsers.length === 0 ? (
          <p className="text-sm text-amber-700">Create users with the Pricing role under Users first.</p>
        ) : (
          <div className="mb-6 flex flex-col gap-3">
            {pricingTeamUsers.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={assignSelected.includes(u.id)} onChange={() => toggleAssign(u.id)} />
                <span>
                  {u.name} <span className="text-slate-500">({u.email})</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={saveAssignees} disabled={!pricingTeamUsers.length}>
            Save assignments
          </Button>
          <Button type="button" variant="ghost" onClick={() => setAssignRow(null)}>
            Cancel
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete enquiry?"
        message="This will remove the enquiry permanently from local storage."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          void (async () => {
            try {
              await deleteEnquiry(deleteId)
              toast.success('Enquiry deleted')
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
