import { api } from '../services/api.js';
import { escapeHTML } from '../utils/helpers.js';

export async function renderAdminDashboard(container, currentUser) {
    container.innerHTML = `
        <div class="page-body">
          <div class="page-title-row">
            <div>
              <p class="eyebrow">ADMINISTRATOR</p>
              <h1>Admin Dashboard</h1>
              <p class="muted">Manage users, blood banks, and platform settings.</p>
            </div>
          </div>
          <div style="padding:40px;text-align:center;color:#94a3b8;">Loading admin data…</div>
        </div>`;

    let users = [], banks = [], requests = [];
    try {
        [users, banks, requests] = await Promise.all([
            api.getAdminUsers(),
            api.getAdminBanks(),
            api.getRequests()
        ]);
    } catch (e) {
        container.innerHTML = `<div class="page-body"><div class="empty-state">❌ Failed to load admin data: ${escapeHTML(e.message)}</div></div>`;
        return;
    }

    const donors = users.filter(u => u.role === 'Donor');
    const acceptors = users.filter(u => u.role === 'Acceptor');
    const pendingBanks = banks.filter(b => b.status === 'Pending');

    function statusBadge(status) {
        const map = { Approved: 'good', Pending: 'pending', Rejected: 'critical', Active: 'good', Suspended: 'critical' };
        return `<span class="status-pill ${map[status] || ''}">${escapeHTML(status)}</span>`;
    }

    container.innerHTML = `
        <div class="page-body">
          <div class="page-title-row">
            <div>
              <p class="eyebrow">ADMINISTRATOR</p>
              <h1>Admin Dashboard</h1>
              <p class="muted">Manage users, blood banks, and platform data.</p>
            </div>
          </div>

          <!-- Stats -->
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-num">${users.length}</div><div class="stat-label">Total Users</div></div>
            <div class="stat-card"><div class="stat-num">${donors.length}</div><div class="stat-label">Donors</div></div>
            <div class="stat-card"><div class="stat-num">${banks.length}</div><div class="stat-label">Blood Banks</div></div>
            <div class="stat-card"><div class="stat-num" style="color:#ef4444">${pendingBanks.length}</div><div class="stat-label">Pending Approvals</div></div>
          </div>

          <!-- Blood Banks -->
          <div class="section-top" style="margin-top:36px;">
            <div><p class="eyebrow">BLOOD BANKS</p><h3>Registered Blood Banks</h3></div>
          </div>

          ${banks.length === 0 ? '<div class="empty-state">No blood banks registered yet.</div>' : `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Bank Name</th><th>Manager</th><th>Email</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${banks.map(b => `
                <tr data-bank-id="${escapeHTML(b.id)}">
                  <td><strong>${escapeHTML(b.name)}</strong></td>
                  <td>${escapeHTML(b.manager_name || '')}</td>
                  <td>${escapeHTML(b.email)}</td>
                  <td>${escapeHTML(b.city || '')}</td>
                  <td>${statusBadge(b.status)}</td>
                  <td>
                    ${b.status !== 'Approved' ? `<button class="approve-bank-btn text-button" data-id="${escapeHTML(b.id)}" data-action="Approved" style="color:#16a34a;">✓ Approve</button>` : ''}
                    ${b.status !== 'Rejected' ? `<button class="approve-bank-btn text-button" data-id="${escapeHTML(b.id)}" data-action="Rejected" style="color:#ef4444;">✗ Reject</button>` : ''}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}

          <!-- Users -->
          <div class="section-top" style="margin-top:36px;">
            <div><p class="eyebrow">REGISTERED USERS</p><h3>All Accounts</h3></div>
          </div>

          ${users.length === 0 ? '<div class="empty-state">No users found.</div>' : `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Blood Group</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${users.map(u => `
                <tr>
                  <td><code style="font-size:11px;">${escapeHTML(u.id)}</code></td>
                  <td>${escapeHTML(u.name)}</td>
                  <td>${escapeHTML(u.email)}</td>
                  <td><span class="status-pill">${escapeHTML(u.role)}</span></td>
                  <td>${escapeHTML(u.blood_group || '')}</td>
                  <td>${escapeHTML(u.city || '')}</td>
                  <td>${statusBadge(u.status || 'Active')}</td>
                  <td>
                    ${u.role !== 'Admin' ? `
                    <button class="toggle-user-btn text-button"
                            data-id="${escapeHTML(u.id)}"
                            data-status="${u.status === 'Suspended' ? 'Active' : 'Suspended'}"
                            style="color:${u.status === 'Suspended' ? '#16a34a' : '#ef4444'};">
                      ${u.status === 'Suspended' ? '🔓 Activate' : '🔒 Suspend'}
                    </button>` : ''}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}

          <!-- Requests -->
          <div class="section-top" style="margin-top:36px;">
            <div><p class="eyebrow">BLOOD REQUESTS</p><h3>All Requests (${requests.length})</h3></div>
          </div>

          ${requests.length === 0 ? '<div class="empty-state">No blood requests found.</div>' : `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Patient</th><th>Hospital</th><th>Blood</th><th>Units</th><th>Urgency</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${requests.map(r => `
                <tr>
                  <td>${escapeHTML(r.patient)}</td>
                  <td>${escapeHTML(r.hospital)}</td>
                  <td><span class="blood-badge">${escapeHTML(r.blood)}</span></td>
                  <td>${escapeHTML(String(r.units))}</td>
                  <td>${escapeHTML(r.level || 'Routine')}</td>
                  <td>${statusBadge(r.status)}</td>
                  <td>${escapeHTML(r.date || '')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}

          <div id="adminActionMsg" class="hidden" style="margin-top:16px;padding:12px;border-radius:8px;font-size:13px;font-weight:600;"></div>
        </div>
    `;

    // Bank approve/reject handlers
    document.querySelectorAll('.approve-bank-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const bankId = btn.dataset.id;
            const status = btn.dataset.action;
            btn.disabled = true; btn.textContent = 'Processing…';
            try {
                await api.approveBankStatus(bankId, status);
                showAdminMsg(`Bank status updated to "${status}".`, '#16a34a');
                await renderAdminDashboard(container, currentUser);
            } catch (e) {
                showAdminMsg(e.message || 'Failed to update bank status.', '#ef4444');
                btn.disabled = false;
            }
        });
    });

    // User suspend/activate handlers
    document.querySelectorAll('.toggle-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.id;
            const newStatus = btn.dataset.status;
            btn.disabled = true;
            try {
                await api.updateUserStatus(userId, newStatus);
                showAdminMsg(`User status updated to "${newStatus}".`, '#16a34a');
                await renderAdminDashboard(container, currentUser);
            } catch (e) {
                showAdminMsg(e.message || 'Failed.', '#ef4444');
                btn.disabled = false;
            }
        });
    });

    function showAdminMsg(msg, color) {
        const el = document.getElementById('adminActionMsg');
        if (el) {
            el.textContent = msg;
            el.style.color = color;
            el.style.background = color + '18';
            el.classList.remove('hidden');
            setTimeout(() => el.classList.add('hidden'), 4000);
        }
    }
}
