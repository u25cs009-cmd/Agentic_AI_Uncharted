import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingIndicator } from './LoadingIndicator';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  loadingMessage = 'Loading data...',
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display matching the criteria.',
  pageSize = 8,
  onRowClick,
  selectedRowKey,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="card p-8">
        <LoadingIndicator message={loadingMessage} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className={`card overflow-hidden flex flex-col shadow-xl ${className}`}>
      {/* Scrollable Table Area */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#383838] bg-[#212121] text-[#b4b4b4] font-mono uppercase tracking-wider text-[11px]">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignClass =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, col.sortable)}
                    className={`py-3 px-4 font-semibold select-none ${alignClass} ${
                      col.sortable ? 'cursor-pointer hover:text-[#ececec] transition-colors' : ''
                    } ${col.className || ''}`}
                  >
                    <div className={`inline-flex items-center space-x-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-[#888]">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#cc8b3c]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#cc8b3c]" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 text-[#666] opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {paginatedData.map((row, index) => {
              const rowKey = keyExtractor(row);
              const isSelected = selectedRowKey === rowKey;

              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-all duration-150 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-[rgba(204,139,60,0.15)] text-[#f0f0f0] border-l-2 border-l-[#cc8b3c]'
                      : 'hover:bg-[#2e2e2e] text-[#d0d0d0]'
                  }`}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    return (
                      <td
                        key={`${rowKey}-${col.key}`}
                        className={`py-3 px-4 text-xs ${alignClass} ${col.className || ''}`}
                      >
                        {col.render ? col.render(row, index) : row[col.key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="border-t border-[#383838] bg-[#212121] px-4 py-3 flex items-center justify-between text-xs text-[#b4b4b4] font-mono">
        <div>
          Showing <span className="font-bold text-[#f0f0f0]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
          <span className="font-bold text-[#f0f0f0]">
            {Math.min(currentPage * pageSize, sortedData.length)}
          </span>{' '}
          of <span className="font-bold text-[#cc8b3c]">{sortedData.length}</span> records
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-[#484848] bg-[#252525] text-[#b4b4b4] hover:text-[#f0f0f0] hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2.5 py-1 rounded-lg bg-[rgba(204,139,60,0.15)] text-[#f0aa55] border border-[rgba(204,139,60,0.3)] text-xs font-semibold">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-[#484848] bg-[#252525] text-[#b4b4b4] hover:text-[#f0f0f0] hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
