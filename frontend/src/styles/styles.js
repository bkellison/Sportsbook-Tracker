export const styles = {
  // Container styles
  innerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 16px'
  },

  // Header styles
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  
  title: {
    fontSize: '2.25rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '8px',
    margin: 0,
    lineHeight: 1.2
  },
  
  subtitle: {
    color: '#c4b5fd',
    margin: 0,
    fontSize: '1rem',
    opacity: 0.9
  },

  // Navigation styles
  navigation: {
    display: 'flex',
    gap: '4px',
    marginBottom: '32px',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: '4px',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    flexWrap: 'wrap'
  },
  
  navButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  
  navButtonInactive: {
    color: '#c4b5fd',
    backgroundColor: 'transparent'
  },

  // Grid and layout styles
  gridContainer: {
    display: 'grid',
    gap: '24px',
    marginBottom: '24px'
  },
  
  grid2: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
  },
  
  grid3: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
  },
  
  grid4: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
  },

  // Card styles
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    backdropFilter: 'blur(10px)',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #334155',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease'
  },
  
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  },
  
  cardTitle: {
    color: '#c4b5fd',
    fontSize: '14px',
    margin: 0,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  cardValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    margin: '4px 0 0 0',
    lineHeight: 1.2
  },
  
  cardValueGreen: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4ade80',
    margin: '4px 0 0 0',
    lineHeight: 1.2
  },
  
  cardValueRed: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#f87171',
    margin: '4px 0 0 0',
    lineHeight: 1.2
  },
  
  cardValueBlue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#60a5fa',
    margin: '4px 0 0 0',
    lineHeight: 1.2
  },
  
  cardValueYellow: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#facc15',
    margin: '4px 0 0 0',
    lineHeight: 1.2
  },

  // Section styles
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },

  // Account card styles
  accountCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #475569',
    transition: 'all 0.2s ease'
  },
  
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  
  accountName: {
    fontWeight: '600',
    color: 'white',
    margin: 0,
    fontSize: '16px'
  },
  
  accountGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    fontSize: '14px'
  },
  
  accountLabel: {
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  accountValue: {
    color: 'white',
    fontWeight: '600',
    fontSize: '14px',
    marginTop: '2px'
  },

  // Tab styles
  tabSelector: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '24px'
  },
  
  tabButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  
  tabButtonInactive: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    color: '#c4b5fd',
    border: '1px solid #475569'
  },

  // Bet/Transaction card styles
  betCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #475569',
    marginBottom: '12px',
    transition: 'all 0.2s ease'
  },
  
  betHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    gap: '16px'
  },
  
  betDescription: {
    color: 'white',
    fontWeight: '500',
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.4
  },
  
  betDate: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '4px 0 0 0'
  },
  
  betAmount: {
    color: 'white',
    fontWeight: '600',
    margin: 0,
    fontSize: '16px',
    textAlign: 'right'
  },

  // Status badge styles
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'inline-block',
    marginTop: '4px'
  },
  
  statusPending: {
    backgroundColor: 'rgba(161, 98, 7, 0.5)',
    color: '#fde047',
    border: '1px solid rgba(161, 98, 7, 0.3)'
  },
  
  statusWon: {
    backgroundColor: 'rgba(20, 83, 45, 0.5)',
    color: '#86efac',
    border: '1px solid rgba(20, 83, 45, 0.3)'
  },
  
  statusLost: {
    backgroundColor: 'rgba(127, 29, 29, 0.5)',
    color: '#fca5a5',
    border: '1px solid rgba(127, 29, 29, 0.3)'
  },

  // Button styles
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap'
  },
  
  smallButton: {
    padding: '6px 12px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  
  winButton: {
    backgroundColor: '#16a34a',
    color: 'white'
  },
  
  loseButton: {
    backgroundColor: '#dc2626',
    color: 'white'
  },

  // Form styles
  formContainer: {
    maxWidth: '400px',
    margin: '0 auto'
  },
  
  formGroup: {
    marginBottom: '16px'
  },
  
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#c4b5fd',
    marginBottom: '8px'
  },
  
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#374151',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    color: 'white',
    fontSize: '16px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease'
  },
  
  select: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#374151',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    color: 'white',
    fontSize: '16px',
    boxSizing: 'border-box',
    cursor: 'pointer'
  },

  // Other styles
  winningsText: {
    color: '#4ade80',
    fontSize: '12px',
    marginTop: '8px',
    fontWeight: '500'
  },
  
  noData: {
    color: '#94a3b8',
    fontSize: '14px',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
  },

  // Pagination styles
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  
  paginationInfo: {
    color: '#94a3b8',
    fontSize: '14px'
  },
  
  paginationButtons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  
  paginationButton: {
    padding: '8px 12px',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    color: '#c4b5fd',
    border: '1px solid #475569',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease'
  },
  
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  }
};

// Add responsive breakpoints
export const breakpoints = {
  mobile: '(max-width: 768px)',
  tablet: '(max-width: 1024px)',
  desktop: '(min-width: 1025px)'
};