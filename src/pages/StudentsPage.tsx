import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CheckSquare,
  Columns3,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Select, statusTone } from '@/components/ui'
import { canSeeSensitive } from '@/lib/access'
import { visibleStudents } from '@/lib/lookups'
import { downloadBlob, maskSensitive, toCsv } from '@/lib/utils'
import { usePortalStore } from '@/store/portalStore'
import { COLUMN_CATEGORIES, STUDENT_COLUMNS, type ColumnDefinition } from '@/lib/studentColumns'
import type { Student } from '@/types'

// Default visible columns
const DEFAULT_VISIBLE_COLUMNS = [
  'registrationId',
  'applicationNumber',
  'fullName',
  'programme',
  'batchYear',
  'currentYear',
  'gender',
  'studentStatus',
  'email',
  'phoneNumber',
]

export function StudentsPage() {
  const user = usePortalStore((s) => s.currentUser)!
  const allStudents = usePortalStore((s) => s.students)
  const isLoadingData = usePortalStore((s) => s.isLoadingData)
  const students = visibleStudents(allStudents, user.role, user.schoolId, user.departmentId).filter(
    (s) => !s.isArchived,
  )

  // Search & Filters
  const [globalQuery, setGlobalQuery] = useState('')
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string>('all')
  const [filterMissingOnly, setFilterMissingOnly] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Sorting
  const [sortColumnId, setSortColumnId] = useState<string>('registrationId')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Column Customization
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS)
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [colSearch, setColSearch] = useState('')

  // Pagination (Optimized for 8,000+ students)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Map for fast column definitions lookup
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnDefinition>()
    STUDENT_COLUMNS.forEach((col) => map.set(col.id, col))
    return map
  }, [])

  // Filtered & Sorted student dataset
  const filteredAndSorted = useMemo(() => {
    let result = students

    // Missing filter
    if (filterMissingOnly && selectedColumnFilter !== 'all') {
      const colDef = columnMap.get(selectedColumnFilter)
      if (colDef) {
        result = result.filter((s) => {
          const val = colDef.getValue(s)
          return val === undefined || val === null || String(val).trim() === ''
        })
      }
    }

    // Text Query search
    if (globalQuery.trim()) {
      const q = globalQuery.toLowerCase().trim()
      if (selectedColumnFilter === 'all') {
        // Search across all visible columns
        result = result.filter((s) => {
          return visibleColumnIds.some((colId) => {
            const def = columnMap.get(colId)
            if (!def) return false
            const val = def.getValue(s)
            if (val === undefined || val === null) return false
            return String(val).toLowerCase().includes(q)
          })
        })
      } else {
        // Specific column search
        const colDef = columnMap.get(selectedColumnFilter)
        if (colDef) {
          result = result.filter((s) => {
            const val = colDef.getValue(s)
            if (val === undefined || val === null) return false
            return String(val).toLowerCase().includes(q)
          })
        }
      }
    }

    // Sorting
    const sortCol = columnMap.get(sortColumnId)
    if (sortCol) {
      result = [...result].sort((a, b) => {
        let valA = sortCol.getValue(a)
        let valB = sortCol.getValue(b)

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

        const isNum = typeof valA === 'number' && typeof valB === 'number'
        let cmp = 0
        if (isNum) {
          cmp = (valA as number) - (valB as number)
        } else {
          cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
        }

        return sortDirection === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [students, globalQuery, selectedColumnFilter, filterMissingOnly, sortColumnId, sortDirection, visibleColumnIds, columnMap])

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize))
  const displayedStudents = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredAndSorted.slice(start, start + pageSize)
  }, [filteredAndSorted, page, pageSize])

  // Sorting toggle
  function handleSort(colId: string) {
    if (sortColumnId === colId) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumnId(colId)
      setSortDirection('asc')
    }
    setPage(1)
  }

  // Column toggle
  function toggleColumn(colId: string) {
    setVisibleColumnIds((prev) => {
      if (prev.includes(colId)) {
        if (prev.length <= 1) return prev // Keep at least one
        return prev.filter((id) => id !== colId)
      }
      return [...prev, colId]
    })
  }

  // Export current filtered view
  function exportFiltered() {
    const activeCols = visibleColumnIds.map((id) => columnMap.get(id)).filter(Boolean) as ColumnDefinition[]
    const exportRows = filteredAndSorted.map((s) => {
      const row: Record<string, string | number> = {}
      activeCols.forEach((col) => {
        const raw = col.getValue(s)
        row[col.label] = raw !== undefined && raw !== null && String(raw).trim() !== '' ? raw : 'Missing'
      })
      return row
    })
    downloadBlob(`students_filtered_${Date.now()}.csv`, toCsv(exportRows))
  }

  // Filter columns inside modal
  const modalColumns = useMemo(() => {
    return STUDENT_COLUMNS.filter((col) => {
      const matchCat = activeCategory === 'all' || col.category === activeCategory
      const matchSearch =
        !colSearch ||
        col.label.toLowerCase().includes(colSearch.toLowerCase()) ||
        col.id.toLowerCase().includes(colSearch.toLowerCase())
      return matchCat && matchSearch
    })
  }, [activeCategory, colSearch])

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Student Database"
        subtitle={`Search, sort, filter, and inspect student records across all 250 institutional headers.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/data/import">
              <Button variant="outline" className="text-xs">
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-navy-600" />
                Import Sheet
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowColumnModal(true)} className="text-xs">
              <Columns3 className="mr-1.5 h-3.5 w-3.5 text-navy-600" />
              Columns ({visibleColumnIds.length})
            </Button>
            <Button variant="outline" onClick={exportFiltered} className="text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5 text-navy-600" />
              Export Filtered
            </Button>
          </div>
        }
      />

      {/* Advanced Search & Filtering Toolbar */}
      <Card className="p-4 bg-white shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Main Search Input */}
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={globalQuery}
                onChange={(e) => {
                  setGlobalQuery(e.target.value)
                  setPage(1)
                }}
                placeholder={
                  selectedColumnFilter === 'all'
                    ? 'Search in visible columns...'
                    : `Search by ${columnMap.get(selectedColumnFilter)?.label || 'column'}...`
                }
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-8 text-xs focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
              {globalQuery && (
                <button
                  type="button"
                  onClick={() => setGlobalQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Target Column Selector */}
            <div className="w-full sm:w-56">
              <select
                value={selectedColumnFilter}
                onChange={(e) => {
                  setSelectedColumnFilter(e.target.value)
                  setPage(1)
                }}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-navy-900 focus:border-navy-500 focus:outline-none"
              >
                <option value="all">🔍 Search: All Visible Columns</option>
                <optgroup label="Search by Specific Header:">
                  {STUDENT_COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Quick Flags & Count */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            {selectedColumnFilter !== 'all' && (
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterMissingOnly}
                  onChange={(e) => {
                    setFilterMissingOnly(e.target.checked)
                    setPage(1)
                  }}
                  className="rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                />
                <span className="font-medium text-amber-700">Show &quot;Missing&quot; Only</span>
              </label>
            )}

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-navy-900">{filteredAndSorted.length}</span> of{' '}
              <span className="font-semibold text-navy-900">{students.length}</span>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {(globalQuery || selectedColumnFilter !== 'all' || filterMissingOnly) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Filters:
            </span>
            {globalQuery && (
              <span className="inline-flex items-center gap-1 rounded bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-800">
                Query: &quot;{globalQuery}&quot;
                <button type="button" onClick={() => setGlobalQuery('')} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedColumnFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-800">
                Target: {columnMap.get(selectedColumnFilter)?.label}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedColumnFilter('all')
                    setFilterMissingOnly(false)
                  }}
                  className="hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterMissingOnly && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                Missing values only
                <button type="button" onClick={() => setFilterMissingOnly(false)} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setGlobalQuery('')
                setSelectedColumnFilter('all')
                setFilterMissingOnly(false)
                setPage(1)
              }}
              className="text-xs text-slate-500 hover:text-navy-900 underline ml-2"
            >
              Reset all
            </button>
          </div>
        )}
      </Card>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] relative">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-navy-900 text-slate-100 shadow-sm">
              <tr>
                <th className="px-3.5 py-3 font-semibold text-slate-200 uppercase tracking-wider text-[11px] w-12 text-center">
                  #
                </th>
                {visibleColumnIds.map((colId) => {
                  const col = columnMap.get(colId)
                  if (!col) return null
                  const isSorted = sortColumnId === colId

                  return (
                    <th
                      key={colId}
                      onClick={() => handleSort(colId)}
                      className="px-3.5 py-3 font-semibold text-slate-200 cursor-pointer select-none hover:bg-navy-800 transition whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUpAZ className="h-3.5 w-3.5 text-gold-500" />
                          ) : (
                            <ArrowDownAZ className="h-3.5 w-3.5 text-gold-500" />
                          )
                        ) : (
                          <span className="text-navy-600 opacity-0 group-hover:opacity-100">↕</span>
                        )}
                      </div>
                    </th>
                  )
                })}
                <th className="px-3.5 py-3 font-semibold text-slate-200 uppercase tracking-wider text-[11px] text-right sticky right-0 bg-navy-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnIds.length + 2} className="py-12 text-center text-slate-400">
                    {isLoadingData && allStudents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-700 border-t-transparent" />
                        <p className="text-sm font-medium text-navy-800">Loading student records from Supabase…</p>
                        <p className="text-xs text-slate-500">Fetching normalized dataset…</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-navy-800">No matching students found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Try relaxing your search query or column filters.
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                displayedStudents.map((s, index) => {
                  const globalIndex = (page - 1) * pageSize + index + 1
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                        {globalIndex}
                      </td>

                      {visibleColumnIds.map((colId) => {
                        const col = columnMap.get(colId)
                        if (!col) return null
                        const raw = col.getValue(s)
                        const isMissing = raw === undefined || raw === null || String(raw).trim() === ''

                        // Sensitive data masking check
                        let displayValue: React.ReactNode = raw
                        if (
                          !isMissing &&
                          ['pan', 'aadhar', 'bankAccount', 'ifsc'].includes(colId) &&
                          !canSeeSensitive(user.role)
                        ) {
                          displayValue = maskSensitive(String(raw))
                        }

                        // Status badge rendering
                        if (colId === 'studentStatus' && !isMissing) {
                          displayValue = <Badge tone={statusTone(String(raw))}>{String(raw)}</Badge>
                        }

                        return (
                          <td key={colId} className="px-3.5 py-2.5 whitespace-nowrap max-w-xs truncate text-navy-800">
                            {isMissing ? (
                              <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                Missing
                              </span>
                            ) : (
                              displayValue
                            )}
                          </td>
                        )
                      })}

                      <td className="px-3.5 py-2.5 text-right sticky right-0 bg-white/95">
                        <Link
                          to={`/students/${s.id}`}
                          className="font-medium text-navy-600 hover:text-navy-900 underline text-xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Rows-Per-Page Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-navy-900 focus:outline-none"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400">|</span>
            <span>
              Page <span className="font-semibold text-navy-900">{page}</span> of{' '}
              <span className="font-semibold text-navy-900">{totalPages}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              First
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-navy-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Column Visibility & Header Selection Modal */}
      {showColumnModal && (
        <Modal
          open={showColumnModal}
          title={`Configure Columns (${visibleColumnIds.length} visible)`}
          onClose={() => setShowColumnModal(false)}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Select which of the 250 headers you want to display in the main data grid.
            </p>

            {/* Modal search & category filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Search header name..."
                value={colSearch}
                onChange={(e) => setColSearch(e.target.value)}
                className="h-8 flex-1 rounded-md border border-slate-300 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="h-8 rounded-md border border-slate-300 px-2 text-xs text-navy-900 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {COLUMN_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Fast bulk selectors */}
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVisibleColumnIds(STUDENT_COLUMNS.map((c) => c.id))}
                  className="text-navy-600 hover:underline font-medium"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleColumnIds(DEFAULT_VISIBLE_COLUMNS)}
                  className="text-navy-600 hover:underline font-medium"
                >
                  Reset Defaults
                </button>
              </div>
              <span>{modalColumns.length} headers</span>
            </div>

            {/* Checkbox Grid */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-2">
              {modalColumns.map((col) => {
                const checked = visibleColumnIds.includes(col.id)
                return (
                  <label
                    key={col.id}
                    className="flex items-center justify-between rounded p-1.5 hover:bg-slate-50 text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumn(col.id)}
                        className="rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                      />
                      <span className="font-medium text-navy-900">{col.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {col.category}
                    </span>
                  </label>
                )
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button onClick={() => setShowColumnModal(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Keep stub for backwards compatibility
export function StaffPage() {
  return (
    <Card className="p-8 text-center text-slate-500">
      <p>Staff management module is archived for now.</p>
    </Card>
  )
}
