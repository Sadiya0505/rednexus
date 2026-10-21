import { DEFAULT_INVENTORY, DEFAULT_DONORS, DEFAULT_REQUESTS } from '../config/constants.js';

const API_BASE_URL = 'http://localhost:3000/api';

function loadLocal(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function saveLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export const api = {
    async login(email, password) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    saveLocal("redNexusUser", data.user);
                    if (data.token) localStorage.setItem("redNexusToken", data.token);
                    return data.user;
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Invalid email or password.");
            }
        } catch (e) {
            if (e.message && e.message !== "Failed to fetch" && e.message !== "Invalid email or password.") {
                throw e;
            }
            if (e.message === "Invalid email or password.") {
                throw e;
            }
            console.warn('Backend unavailable, using local storage fallback.', e);
        }

        // Local fallback
        const savedUser = loadLocal("redNexusUser", null);
        const validDemo = email === "demo@rednexus.org" && password === "nexus123";
        const validSaved = savedUser && (email === savedUser.email || email === savedUser.username) && (password === savedUser.password || password === "nexus123");

        if (!validDemo && !validSaved) {
            throw new Error("Invalid email or password.");
        }

        const userObj = savedUser || {
            name: "Alex Morgan",
            email: "demo@rednexus.org",
            id: "RN-DEMO-001",
            blood: "O+",
            mobile: "9876543210",
            city: "San Francisco",
            location: "Red Nexus Central",
            last: "2025-12-12"
        };
        saveLocal("redNexusUser", userObj);
        return userObj;
    },

    async registerDonor(donorData) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register-donor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(donorData)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    saveLocal("redNexusUser", data.user);
                    if (data.token) localStorage.setItem("redNexusToken", data.token);
                    return data.user;
                }
            }
        } catch (e) {
            console.warn('Backend unavailable, using local storage fallback.', e);
        }

        // Local fallback
        const donor = {
            ...donorData,
            id: "RN-" + Math.floor(10000 + Math.random() * 89999),
            status: "Eligible",
            last: donorData.last || "Never",
            mobile: donorData.mobile,
            city: donorData.city || "Not added",
            location: donorData.location || "Red Nexus Central"
        };

        saveLocal("redNexusUser", { ...donor, username: donor.email });
        const donors = loadLocal("redNexusDonors", DEFAULT_DONORS);
        saveLocal("redNexusDonors", [donor, ...donors]);
        return donor;
    },

    async registerAcceptor(acceptorData) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register-acceptor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(acceptorData)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    saveLocal("redNexusUser", data.user);
                    if (data.token) localStorage.setItem("redNexusToken", data.token);
                    return data.user;
                }
            }
        } catch (e) {
            console.warn('Backend unavailable, using local storage fallback.', e);
        }

        // Local fallback
        const acceptor = {
            ...acceptorData,
            id: "RN-ACC-" + Math.floor(10000 + Math.random() * 89999),
            role: "Acceptor",
            city: acceptorData.city || "Not added",
            location: acceptorData.hospital || "General Hospital"
        };

        saveLocal("redNexusUser", { ...acceptor, username: acceptor.email });

        const newRequest = {
            id: Date.now(),
            patient: acceptor.name,
            hospital: acceptor.hospital,
            contact: acceptor.mobile,
            units: Number(acceptor.units) || 1,
            blood: acceptor.blood,
            level: acceptor.level || "Routine",
            status: "Pending",
            date: new Date().toISOString().slice(0, 10)
        };

        const requests = loadLocal("redNexusRequests", DEFAULT_REQUESTS);
        saveLocal("redNexusRequests", [newRequest, ...requests]);

        return acceptor;
    },

    async resetPassword(resetData) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetData)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to reset password.");
            }
            return data;
        } catch (e) {
            if (e.message && e.message !== "Failed to fetch") {
                throw e;
            }
            console.warn('Backend unavailable, using local storage fallback for reset.', e);
        }

        // Local fallback
        const savedUser = loadLocal("redNexusUser", null);
        const cleanEmail = resetData.email.trim().toLowerCase();
        if (savedUser && (savedUser.email?.toLowerCase() === cleanEmail || savedUser.username?.toLowerCase() === cleanEmail)) {
            if (resetData.mobile && savedUser.mobile && savedUser.mobile.trim() !== resetData.mobile.trim()) {
                throw new Error("The mobile number provided does not match the registered account for this email.");
            }
            savedUser.password = resetData.newPassword;
            saveLocal("redNexusUser", savedUser);
            return { success: true, message: "Password updated successfully!" };
        } else if (cleanEmail === "demo@rednexus.org") {
            return { success: true, message: "Demo account password updated!" };
        }

        throw new Error("No registered donor or acceptor account found with this email.");
    },

    async requestPasswordReset(email) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to send reset link.");
            }
            return data;
        } catch (e) {
            if (e.message && e.message !== "Failed to fetch") {
                throw e;
            }
            console.warn('Backend unavailable, using local simulation for password reset request.', e);
        }

        // Local simulation fallback
        const cleanEmail = email.trim().toLowerCase();
        const dummyToken = btoa(JSON.stringify({ email: cleanEmail, time: Date.now() }));
        const resetUrl = `${window.location.origin}/?token=${dummyToken}#reset-password`;
        return {
            success: true,
            message: `A password reset link has been sent to ${cleanEmail}. Please check your inbox.`,
            resetUrl: resetUrl
        };
    },

    async confirmPasswordReset({ token, newPassword }) {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password-confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to reset password.");
            }
            return data;
        } catch (e) {
            if (e.message && e.message !== "Failed to fetch") {
                throw e;
            }
            console.warn('Backend unavailable, using local simulation for password reset confirmation.', e);
        }

        // Local simulation fallback
        const savedUser = loadLocal("redNexusUser", null);
        if (savedUser) {
            savedUser.password = newPassword;
            saveLocal("redNexusUser", savedUser);
        }
        return { success: true, message: "Your password has been reset successfully! You can now sign in with your new password." };
    },

    async getInventory() {
        try {
            const res = await fetch(`${API_BASE_URL}/inventory`);
            if (res.ok) return await res.json();
        } catch (e) {}
        return loadLocal("redNexusInventory", DEFAULT_INVENTORY);
    },

    async updateInventory(inventory) {
        try {
            await fetch(`${API_BASE_URL}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inventory)
            });
        } catch (e) {}
        saveLocal("redNexusInventory", inventory);
    },

    async getDonors() {
        try {
            const res = await fetch(`${API_BASE_URL}/donors`);
            if (res.ok) return await res.json();
        } catch (e) {}
        return loadLocal("redNexusDonors", DEFAULT_DONORS);
    },

    async getRequests() {
        try {
            const res = await fetch(`${API_BASE_URL}/requests`);
            if (res.ok) return await res.json();
        } catch (e) {}
        return loadLocal("redNexusRequests", DEFAULT_REQUESTS);
    },

    async createRequest(requestData) {
        try {
            const res = await fetch(`${API_BASE_URL}/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            if (res.ok) return await res.json();
        } catch (e) {}

        const request = {
            id: Date.now(),
            ...requestData,
            status: "Pending",
            date: new Date().toISOString().slice(0, 10)
        };
        const requests = loadLocal("redNexusRequests", DEFAULT_REQUESTS);
        const updated = [request, ...requests];
        saveLocal("redNexusRequests", updated);
        return request;
    },

    async updateRequestStatus(id, status) {
        try {
            await fetch(`${API_BASE_URL}/requests/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
        } catch (e) {}

        const requests = loadLocal("redNexusRequests", DEFAULT_REQUESTS);
        const updated = requests.map(req => req.id === id ? { ...req, status } : req);
        saveLocal("redNexusRequests", updated);
        return updated;
    }
};
