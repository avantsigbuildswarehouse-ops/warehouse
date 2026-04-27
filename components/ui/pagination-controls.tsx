"use client";

import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItemsLabel?: string;
};

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItemsLabel,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
      <div className="text-slate-600 dark:text-slate-400">
        Page {currentPage} of {totalPages}
        {totalItemsLabel ? ` (${totalItemsLabel})` : ""}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        {pageNumbers.map((pageNum) => (
          <Button
            key={pageNum}
            size="sm"
            variant={currentPage === pageNum ? "default" : "outline"}
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
