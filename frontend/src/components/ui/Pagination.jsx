import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { styles } from '../../styles/styles';

export const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage, 
  itemType = 'items' 
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div style={styles.paginationContainer}>
      <div style={styles.paginationInfo}>
        Showing {startIndex}-{endIndex} of {totalItems} {itemType}
      </div>
      <div style={styles.paginationButtons}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            ...styles.paginationButton,
            ...(currentPage === 1 ? styles.paginationButtonDisabled : {}),
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <span style={{ color: '#c4b5fd', padding: '8px 16px' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            ...styles.paginationButton,
            ...(currentPage === totalPages ? styles.paginationButtonDisabled : {}),
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};