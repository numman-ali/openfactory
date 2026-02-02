// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { ArrowUpDown, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  accessorFn: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  groupBy?: {
    accessor: (row: T) => string;
    label: (value: string) => string;
  };
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

type SortDirection = "asc" | "desc";

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchPlaceholder = "Search...",
  searchAccessor,
  groupBy,
  onRowClick,
  emptyMessage = "No data",
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search || !searchAccessor) return data;
    const lower = search.toLowerCase();
    return data.filter((row) => searchAccessor(row).toLowerCase().includes(lower));
  }, [data, search, searchAccessor]);

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;
    const col = columns.find((c) => c.id === sortColumn);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = String(col.accessorFn(a) ?? "");
      const bVal = String(col.accessorFn(b) ?? "");
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortColumn, sortDirection, columns]);

  const toggleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const toggleGroup = (groupValue: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupValue)) {
        next.delete(groupValue);
      } else {
        next.add(groupValue);
      }
      return next;
    });
  };

  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, T[]>();
    for (const row of sorted) {
      const key = groupBy.accessor(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map;
  }, [sorted, groupBy]);

  const renderRows = (rows: T[]) =>
    rows.map((row) => (
      <tr
        key={getRowId(row)}
        onClick={() => onRowClick?.(row)}
        className={cn(
          "border-b border-border transition-colors hover:bg-muted/50",
          onRowClick && "cursor-pointer"
        )}
      >
        {columns.map((col) => (
          <td key={col.id} className="px-4 py-3 text-sm" style={{ width: col.width }}>
            {col.accessorFn(row)}
          </td>
        ))}
      </tr>
    ));

  return (
    <div className={cn("flex flex-col", className)}>
      {searchAccessor && (
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  style={{ width: col.width }}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.id)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.header}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups ? (
              Array.from(groups.entries()).map(([groupValue, rows]) => (
                <React.Fragment key={groupValue}>
                  <tr className="border-b border-border bg-muted/30">
                    <td colSpan={columns.length} className="px-4 py-2">
                      <button
                        onClick={() => toggleGroup(groupValue)}
                        className="inline-flex items-center gap-2 text-sm font-medium"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            collapsedGroups.has(groupValue) && "-rotate-90"
                          )}
                        />
                        {groupBy!.label(groupValue)}
                        <span className="text-xs text-muted-foreground">({rows.length})</span>
                      </button>
                    </td>
                  </tr>
                  {!collapsedGroups.has(groupValue) && renderRows(rows)}
                </React.Fragment>
              ))
            ) : sorted.length > 0 ? (
              renderRows(sorted)
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
