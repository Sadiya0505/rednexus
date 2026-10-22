import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';
import { escapeHTML, getCompatibleDonors } from '../utils/helpers.js';
import { validatePhone } from '../utils/validation.js';

export async function renderRequestsPage(container, emergency = false, currentUser) {
    const role = currentUser?.role || 'Donor';
    const canManage = role === 'Admin' || role === 'BankManager' || role === 'Bank';

    let requests = [];
    try {
        requests = await api.getRequests();
    } catch (e) { requests = []; }

    const filteredRequests = emergency
        ? requests.filter(r => r.level === 'Critical' || r.level === 'High')
        : requests;

    function render() {
        container.innerHTML = `
            <div class="page-body">
              <div class="page-title-row">
                <div>
                  <p class="eyebrow">${emergency ? 'PRIORITY CARE' : 'MATCHING CENTER'}</p>
                  <h1>${emergency ? 'Emergency requests' : 'Blood requests'}</h1>
                  <p class="muted">
                    ${emergency
                        ? 'High-priority cases for immediate action.'
                        : 'Create and manage requests from partner hospitals.'}
                  </p>
                </div>
              </div>

              <div class="request-layout">
                <div>
                  <div style="margin-bottom:16px;">
                    <h2 style="display:inline-block;margin:0 10px 0 0;">${filteredRequests.length}</h2>
                    <span class="muted">total requests</span>
                  </div>

                  ${filteredRequests.length === 0
                    ? '<div class="empty-state">No requests found.</div>'
                    : filteredRequests.map(request => {
                        const compatibleDonors = getCompatibleDonors(request.blood);
                        const statusClass = request.status === 'Fulfilled'
                            ? 'fulfilled' : request.status === 'Cancelled'
                            ? 'cancelled' : 'critical';
                        return `
                        <div class="request-item">
                          <div class="urgent-icon">${request.level === 'Critical' ? '⚡' : '⚠'}</div>
                          <div class="request-item-main">
                            <strong>${escapeHTML(request.patient)}</strong>
                            <p>
                              ${escapeHTML(request.hospital)} &middot; ${escapeHTML(String(request.units))} units &middot;
                              <span class="blood-badge">${escapeHTML(request.blood)}</span>
                            </p>
                            <p style="margin-top:6px;">
                              <span class="compat-badge">Compatible: ${compatibleDonors.join(', ')}</span>
                            </p>
                            ${canManage && (request.status === 'Pending' || !request.status) ? `
                              <div class="request-actions">
                                <button class="action-btn-sm fulfill" data-action="fulfill" data-id="${request.id}"
                                        data-blood="${escapeHTML(request.blood)}" data-units="${request.units}">✓ Fulfill</button>
                                <button class="action-btn-sm cancel" data-action="cancel" data-id="${request.id}">✕ Cancel</button>
                              </div>
                            ` : ''}
                          </div>
                          <span class="status-pill ${statusClass}">${escapeHTML(request.status || 'Pending')}</span>
                        </div>`;
                      }).join('')}
                </div>

                <div class="form-panel">
                  <p class="eyebrow">NEW REQUEST</p>
                  <h3>${emergency ? 'Request blood urgently' : 'Start a blood request'}</h3>

                  <form id="requestForm">
                    <label>Patient name<input name="patient" required></label>
                    <label>Hospital name<input name="hospital" required></label>
                    <label>Contact number (10 digits)
                      <input name="contact" type="tel" placeholder="10-digit number" required>
                    </label>
                    <label>Blood group
                      <select name="blood">
                        ${BLOOD_GROUPS.map(g => `<option>${g}</option>`).join('')}
                      </select>
                    </label>
                    <label>Required units
                      <input name="units" type="number" min="1" value="1" required>
                    </label>
                    <label>${emergency ? 'Emergency level' : 'Priority'}
                      <select name="level">
                        <option ${emergency ? 'selected' : ''}>Critical</option>
                        <option ${!emergency ? 'selected' : ''}>High</option>
                        <option>Routine</option>
                      </select>
                    </label>
                    <div id="requestError" class="form-error hidden"></div>
                    <button class="primary-button" type="submit" style="margin-top:8px;">
                      ${emergency ? '⚡ Submit emergency request' : 'Submit blood request'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
        `;

        // Fulfill / Cancel actions — only for managers
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.onclick = async () => {
                const action = btn.dataset.action;
                const id = Number(btn.dataset.id);
                const newStatus = action === 'fulfill' ? 'Fulfilled' : 'Cancelled';
                btn.disabled = true;

                try {
                    // Auto-decrement inventory on fulfill (best-effort — bank must be approved)
                    if (action === 'fulfill' && (role === 'BankManager' || role === 'Bank')) {
                        try {
                            const inv = await api.getInventory();
                            if (inv && inv[btn.dataset.blood] !== undefined) {
                                inv[btn.dataset.blood] = Math.max(0, (inv[btn.dataset.blood] || 0) - (Number(btn.dataset.units) || 1));
                                await api.updateInventory(inv);
                            }
                        } catch (_) {}
                    }
                    await api.updateRequestStatus(id, newStatus);
                    await renderRequestsPage(container, emergency, currentUser);
                } catch (e) {
                    btn.disabled = false;
                    btn.textContent = '⚠ Error';
                }
            };
        });

        document.getElementById('requestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = new FormData(e.target);
            const values = Object.fromEntries(form.entries());
            const errEl = document.getElementById('requestError');

            if (!validatePhone(values.contact)) {
                errEl.textContent = 'Contact number must be exactly 10 digits.';
                errEl.classList.remove('hidden');
                return;
            }
            errEl.classList.add('hidden');

            const btn = e.target.querySelector('[type=submit]');
            btn.disabled = true; btn.textContent = 'Submitting…';

            try {
                await api.createRequest({
                    patient: values.patient,
                    hospital: values.hospital,
                    contact: values.contact,
                    blood: values.blood,
                    units: Number(values.units) || 1,
                    level: values.level
                });
                await renderRequestsPage(container, emergency, currentUser);
            } catch (err) {
                errEl.textContent = err.message || 'Failed to submit request.';
                errEl.classList.remove('hidden');
                btn.disabled = false;
                btn.textContent = emergency ? '⚡ Submit emergency request' : 'Submit blood request';
            }
        });
    }

    render();
}
