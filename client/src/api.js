const API_BASE = '/api';

export async function loginUser(credentials) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return res.json();
}

export async function resetTenantPassword(data) {
  const res = await fetch(`${API_BASE}/auth/reset-tenant-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function adminResetTenantPassword(tenantId, newPassword = '123') {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword })
  });
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  return res.json();
}

export async function updateSettings(data) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchRooms() {
  const res = await fetch(`${API_BASE}/rooms`);
  return res.json();
}

export async function createRoom(data) {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updateRoom(id, data) {
  const res = await fetch(`${API_BASE}/rooms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteRoom(id) {
  const res = await fetch(`${API_BASE}/rooms/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function fetchTenants(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/tenants?${query}`);
  return res.json();
}

export async function saveTenant(formData, id = null) {
  const url = id ? `${API_BASE}/tenants/${id}` : `${API_BASE}/tenants`;
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    body: formData // multipart/form-data
  });
  return res.json();
}

export async function deleteTenant(id) {
  const res = await fetch(`${API_BASE}/tenants/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchInvoices(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/invoices?${query}`);
  return res.json();
}

export async function fetchInvoiceById(id) {
  const res = await fetch(`${API_BASE}/invoices/${id}`);
  return res.json();
}

export async function updateInvoice(id, data) {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function generateBatchInvoices(month) {
  const res = await fetch(`${API_BASE}/invoices/generate-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month })
  });
  return res.json();
}

export async function quickPayInvoice(id, data = {}) {
  const res = await fetch(`${API_BASE}/invoices/${id}/quick-pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchProofs(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/proofs?${query}`);
  return res.json();
}

export async function submitProof(formData) {
  const res = await fetch(`${API_BASE}/proofs`, {
    method: 'POST',
    body: formData // multipart/form-data
  });
  return res.json();
}

export async function reviewProof(id, action, reviewNotes = '') {
  const res = await fetch(`${API_BASE}/proofs/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reviewNotes })
  });
  return res.json();
}

export async function fetchExpenses(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/expenses?${query}`);
  return res.json();
}

export async function saveExpense(formData) {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    body: formData // multipart/form-data
  });
  return res.json();
}

export async function deleteExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchStatistics(month) {
  const res = await fetch(`${API_BASE}/statistics?month=${month}`);
  return res.json();
}

export async function fetchAuditLogs() {
  const res = await fetch(`${API_BASE}/audit-logs`);
  return res.json();
}

export async function fetchRequests(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/requests?${query}`);
  return res.json();
}

export async function submitRequest(data) {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updateRequestStatus(id, status) {
  const res = await fetch(`${API_BASE}/requests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
}

export async function fetchAnnouncements(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/announcements?${query}`);
  return res.json();
}

export async function saveAnnouncement(data, id = null) {
  const url = id ? `${API_BASE}/announcements/${id}` : `${API_BASE}/announcements`;
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteAnnouncement(id) {
  const res = await fetch(`${API_BASE}/announcements/${id}`, { method: 'DELETE' });
  return res.json();
}

export function formatVND(amount) {
  if (amount === undefined || amount === null) return '0 đ';
  return Number(amount).toLocaleString('vi-VN') + ' đ';
}

export function getVietQRUrl(bankName, bankAccount, bankOwner, amount, memo) {
  const cleanBank = (bankName || 'MBBANK').toUpperCase().trim();
  const cleanAcc = (bankAccount || '').trim();
  const cleanOwner = encodeURIComponent(bankOwner || '');
  const cleanMemo = encodeURIComponent(memo || 'TIEN TRO');
  const cleanAmount = Math.round(Number(amount) || 0);

  return `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-compact2.png?amount=${cleanAmount}&addInfo=${cleanMemo}&accountName=${cleanOwner}`;
}
