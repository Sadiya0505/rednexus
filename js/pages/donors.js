import { api } from '../services/api.js';
import { escapeHTML } from '../utils/helpers.js';
import { BLOOD_GROUPS } from '../config/constants.js';

export async function renderDonorsPage(container, currentUser) {
    let filterBlood = '';
    let filterCity = '';

    async function load() {
        container.innerHTML = `<div class="page-body"><div style="padding:40px;text-align:center;color:#94a3b8;">Loading donors…</div></div>`;
        let donors = [];
        try {
            const filters = {};
            if (filterBlood) filters.blood = filterBlood;
            if (filterCity) filters.city = filterCity;
            donors = await api.getDonors(filters);
        } catch (e) {
            donors = [];
        }

        const role = currentUser?.role;

        container.innerHTML = `
            <div class="page-body">
              <div class="page-title-row">
                <div>
                  <p class="eyebrow">DONOR NETWORK</p>
                  <h1>Donor directory</h1>
                  <p class="muted">Browse registered donors. Contact info shown only when donor has consented.</p>
                </div>
                ${role === 'Admin' || role === 'BankManager'
                    ? `<a href="/api/export/donors/csv" class="outline-button">📥 Export CSV</a>`
                    : ''}
              </div>

              <!-- Filters -->
              <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
                <label style="font-size:12px;font-weight:700;color:#334155;flex:1;min-width:150px;">
                  Filter by blood group
                  <select id="bloodFilter" style="margin-top:4px;">
                    <option value="">All groups</option>
                    ${BLOOD_GROUPS.map(g => `<option value="${g}" ${filterBlood === g ? 'selected' : ''}>${g}</option>`).join('')}
                  </select>
                </label>
                <label style="font-size:12px;font-weight:700;color:#334155;flex:1;min-width:150px;">
                  Filter by city
                  <input id="cityFilter" placeholder="e.g. Mumbai" value="${escapeHTML(filterCity)}"
                         style="margin-top:4px;">
                </label>
                <div style="display:flex;align-items:flex-end;gap:8px;">
                  <button class="primary-button" id="applyFilter" style="height:38px;">Filter</button>
                  <button class="outline-button" id="clearFilter" style="height:38px;">Clear</button>
                </div>
              </div>

              ${donors.length === 0
                ? '<div class="empty-state">No donors found matching your filters.</div>'
                : `<div class="donors-grid">
                    ${donors.map(d => {
                        const name = escapeHTML(d.name);
                        const blood = escapeHTML(d.blood || d.blood_group || '');
                        const city = escapeHTML(d.city || '');
                        const last = escapeHTML(d.last || d.last_donation || 'N/A');
                        const status = escapeHTML(d.status || 'Eligible');
                        const statusClass = status === 'Eligible' ? 'good' : status === 'Due soon' ? 'pending' : '';
                        const initial = name.charAt(0).toUpperCase();

                        return `
                        <div class="donor-card">
                          <div class="donor-card-top">
                            <div class="donor-avatar">${initial}</div>
                            <div>
                              <strong>${name}</strong>
                              <p class="muted" style="margin:2px 0 0;">${city}</p>
                            </div>
                            <span class="blood-badge" style="margin-left:auto;">${blood}</span>
                          </div>
                          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                            <span class="status-pill ${statusClass}">${status}</span>
                            <span style="font-size:11px;color:#94a3b8;">Last: ${last}</span>
                          </div>
                          ${d.share_contact && d.mobile
                            ? `<div style="margin-top:10px;font-size:12px;color:#475569;">📞 ${escapeHTML(d.mobile)}</div>`
                            : (role === 'Admin' || role === 'BankManager') && d.mobile
                                ? `<div style="margin-top:10px;font-size:12px;color:#475569;">📞 ${escapeHTML(d.mobile)}</div>`
                                : `<div style="margin-top:10px;font-size:11px;color:#94a3b8;font-style:italic;">Contact info private</div>`}
                        </div>`;
                    }).join('')}
                  </div>`}
            </div>`;

        document.getElementById('applyFilter')?.addEventListener('click', () => {
            filterBlood = document.getElementById('bloodFilter').value;
            filterCity = document.getElementById('cityFilter').value.trim();
            load();
        });
        document.getElementById('clearFilter')?.addEventListener('click', () => {
            filterBlood = ''; filterCity = '';
            load();
        });
    }

    await load();
}
