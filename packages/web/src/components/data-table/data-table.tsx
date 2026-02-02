// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type GroupingState,
  type ExpandedState,
  type Header,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Search,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type { ColumnDef } from "@tanstack/react-table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder?: string;
  searchColumn?: string;
  enableRowSelection?: boolean;
  enableGrouping?: boolean;
  groupBy?: string[];
  enableDragReorder?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  getRowId?: (row: TData) => string;
  onRowSelectionChange?: (rows: TData[]) => void;
  onReorder?: (activeId: string, overId: string) => void;
  bulkActions?: React.ReactNode;
  className?: string;
}

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function SortableRow({ id, children, className }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={className}>
      <TableCell className="w-8 px-2">
        <button
          className="cursor-grab touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      {children}
    </TableRow>
  );
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchColumn,
  enableRowSelection = false,
  enableGrouping = false,
  groupBy: initialGroupBy,
  enableDragReorder = false,
  enablePagination = true,
  pageSize = 20,
  getRowId,
  onRowSelectionChange,
  onReorder,
  bulkActions,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [grouping, setGrouping] = React.useState<GroupingState>(
    initialGroupBy ?? []
  );
  const [expanded, setExpanded] = React.useState<ExpandedState>(true);

  const allColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    const selectColumn: ColumnDef<TData, unknown> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableGrouping: false,
    };
    return [selectColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
      grouping: enableGrouping ? grouping : [],
      expanded,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getGroupedRowModel: enableGrouping ? getGroupedRowModel() : undefined,
    getRowId,
    enableRowSelection,
    initialState: {
      pagination: { pageSize },
    },
  });

  React.useEffect(() => {
    if (!onRowSelectionChange) return;
    const selectedRows = table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original);
    onRowSelectionChange(selectedRows);
  }, [rowSelection, table, onRowSelectionChange]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorder) {
      onReorder(String(active.id), String(over.id));
    }
  }

  const rowIds = table.getRowModel().rows.map((row) => row.id);
  const selectedCount = Object.keys(rowSelection).length;

  function renderTableBody() {
    const rows = table.getRowModel().rows;
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={allColumns.length + (enableDragReorder ? 1 : 0)}
            className="h-24 text-center text-muted-foreground"
          >
            No results.
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => {
      const cells = row.getVisibleCells().map((cell) => {
        if (cell.getIsGrouped()) {
          return (
            <TableCell key={cell.id} colSpan={allColumns.length}>
              <button
                className="flex items-center gap-1 font-medium"
                onClick={row.getToggleExpandedHandler()}
              >
                {row.getIsExpanded() ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {flexRender(cell.column.columnDef.cell, cell.getContext())}{" "}
                <span className="text-muted-foreground">
                  ({row.subRows.length})
                </span>
              </button>
            </TableCell>
          );
        }
        if (cell.getIsAggregated()) {
          return (
            <TableCell key={cell.id}>
              {flexRender(
                cell.column.columnDef.aggregatedCell ??
                  cell.column.columnDef.cell,
                cell.getContext()
              )}
            </TableCell>
          );
        }
        if (cell.getIsPlaceholder()) {
          return <TableCell key={cell.id} />;
        }
        return (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      });

      if (enableDragReorder) {
        return (
          <SortableRow
            key={row.id}
            id={row.id}
            className={cn(
              row.getIsSelected() && "bg-muted"
            )}
          >
            {cells}
          </SortableRow>
        );
      }

      return (
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() ? "selected" : undefined}
        >
          {enableDragReorder && <TableCell />}
          {cells}
        </TableRow>
      );
    });
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={
                searchColumn
                  ? (table.getColumn(searchColumn)?.getFilterValue() as string) ??
                    ""
                  : globalFilter
              }
              onChange={(e) => {
                if (searchColumn) {
                  table
                    .getColumn(searchColumn)
                    ?.setFilterValue(e.target.value);
                } else {
                  setGlobalFilter(e.target.value);
                }
              }}
              className="pl-9"
            />
          </div>
        </div>
        {selectedCount > 0 && bulkActions && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
            {bulkActions}
          </div>
        )}
      </div>

      <div className="rounded-md border">
        {enableDragReorder ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rowIds}
              strategy={verticalListSortingStrategy}
            >
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      <TableHead className="w-8" />
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder ? null : (
                            <SortableHeader header={header} />
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>{renderTableBody()}</TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <SortableHeader header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>{renderTableBody()}</TableBody>
          </Table>
        )}
      </div>

      {enablePagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} row(s) total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableHeader<TData>({
  header,
}: {
  header: Header<TData, unknown>;
}) {
  if (!header.column.getCanSort()) {
    return (
      <>
        {flexRender(header.column.columnDef.header, header.getContext())}
      </>
    );
  }

  const sorted = header.column.getIsSorted();

  return (
    <button
      className="flex items-center gap-1"
      onClick={header.column.getToggleSortingHandler()}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      {sorted === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}
