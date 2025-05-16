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

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CustomPagination({ currentPage, totalPages, onPageChange }: CustomPaginationProps) {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) return null;

  const handlePageClick = (page: number, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onPageChange(page);
  };

  // Calculate which page numbers to show (always show first, last, current, and adjacent pages)
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
    if (currentPage + 1 < totalPages) {
      pages.push(currentPage + 1);
    }

    // Add ellipsis before last page if needed
    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    // Always include last page if it isn't page 1
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={e => handlePageClick(currentPage - 1, e)}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
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
                onClick={e => handlePageClick(page, e)}
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
            onClick={e => handlePageClick(currentPage + 1, e)}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
