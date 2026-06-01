import { apiFetch } from './db';

// Admin API
export const fetchAdminCustomers = () => apiFetch('/admin/customers');
export const fetchAdminAuditLogs = () => apiFetch('/admin/audit-logs');
export const fetchAdminWithdrawals = () => apiFetch('/admin/withdrawals/pending');
export const fetchAdminAnimals = () => apiFetch('/admin/animals/pending');
export const fetchPayouts = () => apiFetch('/admin/payouts/pending');
export const fetchRefunds = () => apiFetch('/admin/refunds/pending');
export const fetchTickets = () => apiFetch('/admin/tickets');

// Shared API
export const fetchUser = () => apiFetch('/auth/me');
export const fetchWallets = () => apiFetch('/wallets');
export const fetchHolidays = () => apiFetch('/holidays');
export const fetchAnimals = () => apiFetch('/animals');
export const fetchTransactions = () => apiFetch('/transactions');
export const fetchNotifications = () => apiFetch('/notifications');
export const fetchOrders = () => apiFetch('/orders');
export const fetchWithdrawals = () => apiFetch('/withdrawals');
export const fetchFavorites = () => apiFetch('/animals/favorites/list');
export const fetchMarketPrices = () => apiFetch('/market/prices');
export const fetchPriceHistory = () => apiFetch('/market/history');
export const fetchDeliveryZones = () => apiFetch('/delivery/zones');
export const fetchCustomerHolidays = () => apiFetch('/holidays/goals');

// Seller API
export const fetchSellerOrders = () => apiFetch('/orders/seller');
export const fetchSellerAnimals = () => apiFetch('/animals?seller=me&approvedOnly=false');

