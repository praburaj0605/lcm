import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'

function defaultGlobalFilter(row, _columnId, filterValue) {
  const q = String(filterValue || '').toLowerCase()
  if (!q) return true
  return row.getAllCells().some((cell) => {
    const v = cell.getValue()
    if (v == null) return false
    return String(v).toLowerCase().includes(q)
  })
}

export function DataTable({
  columns,
  data,
  pageSize = 10,
  enableRowSelection = false,
  globalFilter: controlledGlobal,
  onGlobalFilterChange,
  /** Extra controls (e.g. Import / Export) — rendered in the toolbar row next to filters, above the table */
  toolbar = null,
}) {
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [rowSelection, setRowSelection] = useState({})
  const [internalGlobal, setInternalGlobal] = useState('')
  const globalFilter = controlledGlobal ?? internalGlobal
  const setGlobalFilter = onGlobalFilterChange ?? setInternalGlobal

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    enableRowSelection,
    globalFilterFn: defaultGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const filterableColumns = useMemo(
    () => table.getAllColumns().filter((c) => c.columnDef.meta?.filter),
    [table],
  )

  return (
    <div className="crm-data-table space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full max-w-md">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Search
          </label>
          <Input
            placeholder="Search all columns…"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        {filterableColumns.length > 0 || toolbar ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end md:w-auto md:max-w-none md:flex-1 md:justify-end">
            {filterableColumns.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filterableColumns.map((col) => {
                  const meta = col.columnDef.meta
                  const val = col.getFilterValue() ?? ''
                  if (meta.filter === 'select') {
                    return (
                      <div key={col.id} className="min-w-[140px]">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {meta.filterLabel || col.id}
                        </label>
                        <Select
                          value={val}
                          onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                        >
                          <option value="">All</option>
                          {(meta.options || []).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )
                  }
                  return (
                    <div key={col.id} className="min-w-[120px]">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {meta.filterLabel || col.id}
                      </label>
                      <Input
                        value={val}
                        onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                        placeholder="Filter…"
                      />
                    </div>
                  )
                })}
              </div>
            ) : null}
            {toolbar ? (
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">{toolbar}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-none border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-slate-700/80 dark:bg-[#1e2130]">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-slate-100 bg-[#f8f9fb] dark:border-slate-700/80 dark:bg-[#262a3d]">
                {hg.headers.map((header) => {
                  const thMeta = header.column.columnDef.meta?.thClassName ?? ''
                  return (
                  <th
                    key={header.id}
                    className={`whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${thMeta}`}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-slate-700 transition hover:text-[var(--color-va-blue)] dark:text-slate-200 dark:hover:text-blue-400"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ▲',
                          desc: ' ▼',
                        }[header.column.getIsSorted()] ?? null}
                      </button>
                    )}
                  </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No rows match your filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100/90 transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-[var(--color-va-blue-soft)]/50 dark:border-slate-800 dark:odd:bg-[#1e2130] dark:even:bg-[#1a1d2e]/80 dark:hover:bg-blue-950/30"
                >
                  {row.getVisibleCells().map((cell) => {
                    const tdMeta = cell.column.columnDef.meta?.tdClassName ?? ''
                    return (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 align-middle text-slate-700 dark:text-slate-200 ${tdMeta}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          {enableRowSelection && Object.keys(rowSelection).length
            ? ` · ${Object.keys(rowSelection).length} selected`
            : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
          >
            First
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  )
}
