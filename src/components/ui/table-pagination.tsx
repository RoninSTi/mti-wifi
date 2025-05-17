'use client';

import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { PaginationMeta } from '@/lib/pagination/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface TablePaginationProps {
  // Required props
  pagination: PaginationMeta | null;

  // Optional config
  useURLParams?: boolean;
  className?: string;

  // For controlled pagination (when not using URL params)
  currentPage?: number;
  onPageChange?: (page: number) => void;

  // Items per page config
  showItemsPerPage?: boolean;
  itemsPerPageOptions?: number[];
  onItemsPerPageChange?: (limit: number) => void;
}

export function TablePagination({
  pagination,
  useURLParams = false,
  className = '',
  currentPage: controlledPage,
  onPageChange,
  showItemsPerPage = false,
  itemsPerPageOptions = [5, 10, 25, 50],
  onItemsPerPageChange,
}: TablePaginationProps) {
  // URL-based pagination
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine the current page based on props or URL
  const currentPage = useURLParams ? Number(searchParams.get('page') || '1') : controlledPage || 1;

  // Determine the current limit based on URL
  const currentLimit = useURLParams
    ? Number(searchParams.get('limit') || '10')
    : pagination?.itemsPerPage || 10;

  // Don't render pagination if there's no data or only one page
  if (!pagination || pagination.totalPages <= 1) return null;

  // Calculate which page numbers to show (first, last, current, and adjacent pages)
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];

    // Always include first page
    pages.push(1);

    // Add ellipsis after page 1 if needed
    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    // Add page before current if it exists and isn't page 1
    if (currentPage - 1 > 1) {
      pages.push(currentPage - 1);
    }

    // Add current page if it isn't page 1
    if (currentPage !== 1) {
      pages.push(currentPage);
    }

    // Add page after current if it exists and isn't the last page
    if (currentPage + 1 < pagination.totalPages) {
      pages.push(currentPage + 1);
    }

    // Add ellipsis before last page if needed
    if (currentPage < pagination.totalPages - 2) {
      pages.push('ellipsis');
    }

    // Always include last page if it isn't page 1
    if (pagination.totalPages > 1) {
      pages.push(pagination.totalPages);
    }

    return pages;
  };

  // Update URL params
  const updateParams = (params: Record<string, string | number | null>) => {
    if (!useURLParams) return;

    const newParams = new URLSearchParams(searchParams.toString());

    // Update or remove params
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    router.push(`${pathname}?${newParams.toString()}`);
  };

  // Handle page change
  const handlePageChange = (page: number, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (useURLParams) {
      updateParams({ page });
    } else if (onPageChange) {
      onPageChange(page);
    }
  };

  // Handle items per page change
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);

    if (useURLParams) {
      updateParams({ limit: newLimit, page: 1 });
    } else if (onItemsPerPageChange) {
      onItemsPerPageChange(newLimit);
    }
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={`mt-4 flex items-center justify-between ${className}`}>
      {/* Items count text */}
      <div className="text-sm text-muted-foreground">
        Showing {pagination.itemsPerPage} of {pagination.totalItems} items
      </div>

      {/* Pagination controls */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={e => handlePageChange(currentPage - 1, e)}
              className={!pagination.hasPreviousPage ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>

          {visiblePages.map((page, index) =>
            page === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={e => handlePageChange(page, e)}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={e => handlePageChange(currentPage + 1, e)}
              className={!pagination.hasNextPage ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Items per page selector */}
      {showItemsPerPage && (
        <div className="flex items-center gap-2">
          <select
            className="text-sm h-8 rounded-md border border-input bg-background px-2"
            value={currentLimit}
            onChange={handleLimitChange}
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
      )}
    </div>
  );
}
