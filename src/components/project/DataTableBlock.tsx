import { Fragment, useEffect, useId, useState } from 'react'
import type { DataTable } from '@/types'

export function DataTableBlock({ table }: { table: DataTable }) {
  const [rows, setRows] = useState(table.rows ?? null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const hasDetail = !!table.detailFields?.length
  const tableId = useId()

  useEffect(() => {
    // Each DataTableBlock is keyed by table.title in the parent, so this
    // instance is remounted (not re-rendered in place) if the table changes.
    if (rows || !table.loadRows) return
    let cancelled = false
    table.loadRows().then(loaded => {
      if (!cancelled) setRows(loaded)
    })
    return () => { cancelled = true }
  }, [])

  function toggle(rowIndex: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(rowIndex)) next.delete(rowIndex)
      else next.add(rowIndex)
      return next
    })
  }

  return (
    <div>
      <p className="mono text-text text-sm mb-1">{table.title}</p>
      {table.description && (
        <p className="text-sm text-text-muted leading-relaxed mb-4 max-w-2xl">
          {table.description}
        </p>
      )}
      {!rows ? (
        <p className="mono text-text-muted">[ loading… ]</p>
      ) : (
        <div className="border border-border-strong overflow-x-auto lg:max-h-[36rem] lg:overflow-y-auto">
          <table className="w-full text-xs mono border-collapse">
            <thead className="sticky top-0 bg-surface">
              <tr>
                {hasDetail && <th className="border-b border-border-strong w-8" />}
                {table.columns.map(col => (
                  <th
                    key={col.key}
                    className={`text-text-muted font-normal uppercase tracking-wider px-4 py-3 border-b border-border-strong whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => {
                const isOpen = expanded.has(i)
                const detailId = `${tableId}-detail-${i}`
                return (
                  <Fragment key={i}>
                    <tr
                      onClick={hasDetail ? () => toggle(i) : undefined}
                      className={`hover:bg-surface transition-colors ${hasDetail ? 'cursor-pointer' : ''}`}
                    >
                      {hasDetail && (
                        <td className="px-0 align-top">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={detailId}
                            aria-label={isOpen ? 'Hide details' : 'Show details'}
                            onClick={e => {
                              e.stopPropagation()
                              toggle(i)
                            }}
                            className={`inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:-outline-offset-2 ${isOpen ? 'text-accent' : 'text-text-muted'}`}
                          >
                            {isOpen ? '−' : '+'}
                          </button>
                        </td>
                      )}
                      {table.columns.map(col => (
                        <td
                          key={col.key}
                          className={`text-text-muted px-4 py-3 align-top ${
                            col.align === 'right' ? 'text-right whitespace-nowrap' : 'text-left'
                          }`}
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                    {hasDetail && isOpen && (
                      <tr id={detailId}>
                        <td colSpan={table.columns.length + 1} className="px-4 py-4 bg-background space-y-4">
                          {table.detailFields!.map(field => (
                            <div key={field.key}>
                              <span className="text-text-muted uppercase tracking-wider block mb-1.5">
                                {field.label}
                              </span>
                              {field.code ? (
                                <pre className="text-text-muted border border-border p-3 overflow-x-auto leading-relaxed whitespace-pre">
                                  {row[field.key]}
                                </pre>
                              ) : (
                                <p className="text-text-muted leading-relaxed whitespace-pre-wrap">
                                  {row[field.key]}
                                </p>
                              )}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
