import { DEFAULT_INVENTORY, DEFAULT_DONORS, DEFAULT_REQUESTS } from '../config/constants.js';

const API_BASE_URL = '/api';   // relative – works regardless of port

function getToken() {
    return localStorage.getItem('redNexusToken') || null;
}

function authHeaders() {
    const t = getToken();
    return t
        ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` }
        : { 'Content-Type': 'application/json' };
}

function loadLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export const api = {

    // ── Auth ────────────────────────────────────────────────────────────────

    async login(email, password) {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Invalid email or password.');
        saveLocal('redNexusUser', data.user);
        if (data.token) localStorage.setItem('redNexusToken', data.token);
        return data.user;
    },

    async registerDonor(donorData) {
        const res = await fetch(`${API_BASE_URL}/auth/register-donor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(donorData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Registration failed.');
        saveLocal('redNexusUser', data.user);
        if (data.token) localStorage.setItem('redNexusToken', data.token);
        return data.user;
    },

    async registerAcceptor(acceptorData) {
        const res = await fetch(`${API_BASE_URL}/auth/register-acceptor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(acceptorData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Registration failed.');
        saveLocal('redNexusUser', data.user);
        if (data.token) localStorage.setItem('redNexusToken', data.token);
        return data.user;
    },

    async registerBank(bankData) {
        const res = await fetch(`${API_BASE_URL}/auth/register-bank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bankData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Bank registration failed.');
        return data;
    },

    async requestPasswordReset(email) {
        const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send reset link.');
        return data;
    },

    async confirmPasswordReset({ token, newPassword }) {
        const res = await fetch(`${API_BASE_URL}/auth/reset-password-confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to reset password.');
        return data;
    },

    async resetPassword(resetData) {
        const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(resetData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to reset password.');
        return data;
    },

    // ── Profile ─────────────────────────────────────────────────────────────

    async getProfile() {
        const res = await fetch(`${API_BASE_URL}/profile`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Could not load profile.');
        const data = await res.json();
        return data.profile;
    },

    async updateProfile(updates) {
        const res = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Update failed.');
        return data;
    },

    // ── Inventory ────────────────────────────────────────────────────────────

    async getInventory() {
        try {
            const res = await fetch(`${API_BASE_URL}/inventory`, { headers: authHeaders() });
            if (res.ok) return await res.json();
            if (res.status === 401 || res.status === 403) return null; // Not authorized
        } catch (e) {}
        return loadLocal('redNexusInventory', DEFAULT_INVENTORY);
    },

    async updateInventory(inventory) {
        const res = await fetch(`${API_BASE_URL}/inventory`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(inventory)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Inventory update failed.');
        saveLocal('redNexusInventory', inventory);
        return data;
    },

    // ── Donors ───────────────────────────────────────────────────────────────

    async getDonors(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.blood) params.set('blood', filters.blood);
            if (filters.city) params.set('city', filters.city);
            const url = `${API_BASE_URL}/donors${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                // Server returns array directly
                return Array.isArray(data) ? data : (data.donors || []);
            }
        } catch (e) {
            console.error('getDonors error:', e.message);
        }
        // Fallback: filter local data
        let local = loadLocal('redNexusDonors', DEFAULT_DONORS);
        if (filters.blood) local = local.filter(d => (d.blood || d.blood_group) === filters.blood);
        if (filters.city) local = local.filter(d => d.city && d.city.toLowerCase().includes(filters.city.toLowerCase()));
        return local;
    },

    // ── Requests ─────────────────────────────────────────────────────────────

    async getRequests() {
        try {
            const res = await fetch(`${API_BASE_URL}/requests`, { headers: authHeaders() });
            if (res.ok) return await res.json();
        } catch (e) {}
        return loadLocal('redNexusRequests', DEFAULT_REQUESTS);
    },

    async createRequest(requestData) {
        try {
            const res = await fetch(`${API_BASE_URL}/requests`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(requestData)
            });
            if (res.ok) return await res.json();
        } catch (e) {}
        const request = { id: Date.now(), ...requestData, status: 'Pending', date: new Date().toISOString().slice(0, 10) };
        const requests = loadLocal('redNexusRequests', DEFAULT_REQUESTS);
        saveLocal('redNexusRequests', [request, ...requests]);
        return request;
    },

    async updateRequestStatus(id, status) {
        try {
            await fetch(`${API_BASE_URL}/requests/${id}/status`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ status })
            });
        } catch (e) {}
        const requests = loadLocal('redNexusRequests', DEFAULT_REQUESTS);
        const updated = requests.map(r => r.id === id ? { ...r, status } : r);
        saveLocal('redNexusRequests', updated);
        return updated;
    },

    // ── Admin ────────────────────────────────────────────────────────────────

    async getAdminUsers() {
        const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
    },

    async getAdminBanks() {
        const res = await fetch(`${API_BASE_URL}/admin/banks`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
    },

    async approveBankStatus(bankId, status) {
        const res = await fetch(`${API_BASE_URL}/admin/banks/${bankId}/approve`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update bank status.');
        return data;
    },

    async updateUserStatus(userId, status) {
        const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update user status.');
        return data;
    }
};
