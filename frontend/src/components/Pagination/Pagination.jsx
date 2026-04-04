import React from "react";


export default function Pagination({ currentPage, totalPages, onPageChange, fixed = false, showWhenSinglePage = false }) {
    if (totalPages <= 0) return null;
    if (totalPages <= 1 && !showWhenSinglePage) return null;

    // Calculate page numbers to show
    const maxVisible = 10;
    let startPage = 1;
    let endPage = totalPages;
    if (totalPages > maxVisible) {
        if (currentPage <= 6) {
            startPage = 1;
            endPage = maxVisible;
        } else if (currentPage + 4 >= totalPages) {
            startPage = totalPages - maxVisible + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - 5;
            endPage = currentPage + 4;
        }
    }
    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    const containerClass = fixed
        ? 'fixed left-1/2 lg:left-[calc((100%+var(--sidebar-width))/2)] lg:transition-[left] lg:duration-200 lg:ease-in-out bottom-6 transform -translate-x-1/2 flex justify-center z-50 gap-3 px-4'
        : 'w-full flex justify-center gap-3 mt-4 mb-8';

    return (
        <div className={containerClass}>
            <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                title="First Page"
            >
                {'<<'}
            </button>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                title="Previous Page"
            >
                {'<'}
            </button>
            <div className="flex items-center gap-2">
                {startPage > 1 && (
                    <>
                        <button
                            onClick={() => onPageChange(1)}
                            className="rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                            style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}
                        >
                            1
                        </button>
                        {startPage > 2 && (
                            <span className="rounded bg-gray-200 text-gray-400 flex items-center justify-center select-none" style={{ width: '32px', height: '32px', display: 'inline-flex', fontVariantNumeric: 'tabular-nums' }}>...</span>
                        )}
                    </>
                )}
                {pageNumbers.map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`rounded ${
                            currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                        style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}
                    >
                        {page}
                    </button>
                ))}
                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && (
                            <span className="rounded bg-gray-200 text-gray-400 flex items-center justify-center select-none" style={{ width: '32px', height: '32px', display: 'inline-flex', fontVariantNumeric: 'tabular-nums' }}>...</span>
                        )}
                        <button
                            onClick={() => onPageChange(totalPages)}
                            className="rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                            style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}
                        >
                            {totalPages}
                        </button>
                    </>
                )}
            </div>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                title="Next Page"
            >
                {'>'}
            </button>
            <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                title="Last Page"
            >
                {'>>'}
            </button>
        </div>
    );
}
