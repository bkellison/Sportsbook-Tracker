import { useState, useEffect } from 'react';
import { accountsService } from '../services/accounts.service';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const accountsData = await accountsService.getAllAccounts();
      setAccounts(accountsData);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err.message || 'Failed to fetch accounts');
      
      // If unauthorized, clear token and reload
      if (err.message.includes('401') || err.message.includes('403')) {
        localStorage.removeItem('token');
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have a token
    const token = localStorage.getItem('token');
    if (token) {
      fetchAccounts();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshAccounts = async () => {
    await fetchAccounts();
  };

  const clearError = () => {
    setError(null);
  };

  return {
    accounts,
    isLoading,
    error,
    refreshAccounts,
    clearError
  };
};