import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import {
  USERS_JSON_STORAGE_KEY,
  getUsersJsonString,
  parseImportedUsersJson,
  replaceAllUsers,
} from '../../services/usersJsonStorage'
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
import { UserDetailView } from '../../components/detailViews/ReadableEntityDetails'
import { toast } from 'sonner'

const columnHelper = createColumnHelper()

function roleTone(role) {
  if (role === 'admin') return 'blue'
  if (role === 'sales') return 'green'
  if (role === 'pricing') return 'yellow'
  if (role === 'boss') return 'violet'
  return 'neutral'
}

export function UsersList() {
  const hydrated = useHydrated()
  const navigate = useNavigate()
  const users = useAppStore((s) => s.users)
  const deleteUser = useAppStore((s) => s.deleteUser)
  const hydrateUsersFromJson = useAppStore((s) => s.hydrateUsersFromJson)

  const fileInputRef = useRef(null)
  const [viewRow, setViewRow] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.accessor('email', { header: 'Email' }),
      columnHelper.accessor('role', {
        header: 'Role',
        cell: (info) => <Badge tone={roleTone(info.getValue())}>{info.getValue()}</Badge>,
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
            <IconButton action="view" title="View" onClick={() => setViewRow(row.original)}>
              {icons.eye}
            </IconButton>
            <IconButton action="edit" title="Edit" onClick={() => navigate(`/users/${row.original.id}/edit`)}>
              {icons.pencil}
            </IconButton>
            <IconButton action="delete" title="Delete" onClick={() => setDeleteId(row.original.id)}>
              {icons.trash}
            </IconButton>
          </div>
        ),
        enableSorting: false,
      }),
    ],
    [navigate],
  )

  function downloadJson() {
    const json = getUsersJsonString()
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded users.json')
  }

  function onImportFile(ev) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        const imported = parseImportedUsersJson(text)
        if (!imported.length) {
          toast.error('No users in file')
          return
        }
        replaceAllUsers(imported)
        hydrateUsersFromJson()
        toast.success(`Imported ${imported.length} user(s) from JSON`)
      } catch (e) {
        toast.error(e?.message || 'Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            List is driven by local JSON in <code className="text-xs font-mono text-[var(--color-va-blue)]">{USERS_JSON_STORAGE_KEY}</code>{' '}
            (DevTools → Application → Local Storage). Create / edit / delete updates that file; next step is swapping this layer for an API.
          </p>
        </div>
        <div className="flex shrink-0">
          <Button to="/users/new" variant="primary">
            Create user
          </Button>
        </div>
      </div>

      <Card
        title="Directory"
        subtitle={`${users.length} user(s) — source: localStorage JSON envelope { version, updatedAt, users }`}
        accent="from-indigo-600 to-slate-800"
      >
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
        <DataTable
          columns={columns}
          data={users}
          pageSize={8}
          toolbar={
            <>
              <Button type="button" variant="neutral" onClick={() => fileInputRef.current?.click()}>
                Import JSON
              </Button>
              <Button type="button" variant="outline" onClick={downloadJson}>
                Export JSON
              </Button>
            </>
          }
        />
      </Card>

      <Modal open={!!viewRow} title="User details" onClose={() => setViewRow(null)} wide>
        {viewRow ? <UserDetailView user={viewRow} /> : null}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete user?"
        message="They will no longer be able to sign in. The JSON file will be updated. Records they created remain."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          void (async () => {
            try {
              await deleteUser(deleteId)
              toast.success('User removed')
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
