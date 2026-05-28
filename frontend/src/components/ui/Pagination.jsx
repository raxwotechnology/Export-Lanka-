import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange, total }) {
    if (totalPages <= 1) return null;

    const canPrev = page > 1;
    const canNext = page < totalPages;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
                Page <span className="font-medium">{page}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
                {total !== undefined && <span className="text-gray-400 ml-2">({total} total)</span>}
            </p>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!canPrev}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    <ChevronLeft size={16} />
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!canNext}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    Next
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}