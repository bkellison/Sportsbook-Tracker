export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  BET: 'bet',
  BONUS_BET: 'bonus-bet',
  BONUS_CREDIT: 'bonus-credit',
  HISTORICAL_WIN: 'historical-win',
  HISTORICAL_LOSS: 'historical-loss'
};

export const BET_STATUSES = {
  PENDING: 'pending',
  WON: 'won',
  LOST: 'lost'
};

export const DEFAULT_ACCOUNTS = [
  { key: 'draftkings1', name: 'DraftKings #1' },
  { key: 'draftkings2', name: 'DraftKings #2' },
  { key: 'fanduel', name: 'FanDuel' },
  { key: 'betmgm', name: 'BetMGM' },
  { key: 'bet365', name: 'Bet365' }
];

export const ITEMS_PER_PAGE = 20;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout'
  },
  ACCOUNTS: '/accounts',
  TRANSACTIONS: '/transactions',
  BETS: '/bets',
  BULK_IMPORT: '/bulk-import'
};

export const LOCAL_STORAGE_KEYS = {
  TOKEN: 'token',
  THEME: 'sportsbookTheme',
  GLOW_LINES: 'glowLinesEnabled',
  AUTO_BACKUP: 'autoBackup'
};

export const COLORS = {
  SUCCESS: '#4ade80',
  ERROR: '#f87171',
  WARNING: '#facc15',
  INFO: '#60a5fa',
  PRIMARY: '#7c3aed',
  SECONDARY: '#c4b5fd',
  NEUTRAL: '#94a3b8'
};

export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200
};
