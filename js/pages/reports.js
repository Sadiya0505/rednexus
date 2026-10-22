import { renderStatCard } from '../components/cards.js';
import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';

export async function renderReportsPage(container, currentUser) {
    const role = currentUser?.role || 'Donor';
    const canViewInventory = role === 'Admin' || role === 'BankManager' || role === 'Bank';

    let inventory = {};
    let donors = [];
    let requests = [];

    const results = await Promise.allSettled([
        canViewInventory ? api.getInventory() : Promise.resolve(null),
        api.getDonors(),
        api.getRequests()
    ]);

    if (results[0].status === 'fulfilled' && results[0].value) inventory = results[0].value;
    if (results[1].status === 'fulfilled') donors = results[1].value || [];
    if (results[2].status === 'fulfilled') requests = results[2].value || [];

    const totalUnits = Object.values(inventory).reduce((sum, v) => sum + Number(v), 0);
    const fulfilled = requests.filter(r => r.status === 'Fulfilled').length;
    const pending = requests.filter(r => r.status === 'Pending' || !r.status).length;
    const criticalStock = canViewInventory ? Object.values(inventory).filter(v => Number(v) <= 3).length : '—';

    // Blood group stats for donors
    const bloodGroupCounts = {};
    donors.forEach(d => {
        const bg = d.blood || d.blood_group || 'Unknown';
        bloodGroupCounts[bg] = (bloodGroupCounts[bg] || 0) + 1;
    });

    container.innerHTML = `
        <div class="page-body">
          <div class="page-title-row">
            <div>
              <p class="eyebrow">INSIGHTS</p>
              <h1>Reports &amp; Analytics</h1>
              <p class="muted">Live statistics from your Red Nexus blood network.</p>
            </div>
          </div>

          <div class="stats-grid">
            ${renderStatCard('Total Blood Units', canViewInventory ? totalUnits : '—', canViewInventory ? 'Current inventory' : 'Requires bank access')}
            ${renderStatCard('Registered Donors', donors.length, 'Active in network')}
            ${renderStatCard('Blood Requests', requests.length, `${fulfilled} fulfilled`)}
            ${renderStatCard('Critical Stock', criticalStock, canViewInventory ? 'Groups below 3 units' : 'Requires bank access')}
          </div>

          <div class="section-top" style="margin-top:36px;">
            <div><p class="eyebrow">DONOR DISTRIBUTION</p><h3>Donors by blood group</h3></div>
          </div>

          <div class="table-wrap" style="margin-bottom:28px;">
            <table class="data-table">
              <thead><tr><th>Blood Group</th><th>Donor Count</th><th>Share %</th><th>Stock Level</th></tr></thead>
              <tbody>
                ${BLOOD_GROUPS.map(bg => {
                    const count = bloodGroupCounts[bg] || 0;
                    const pct = donors.length ? ((count / donors.length) * 100).toFixed(1) : '0.0';
                    const stock = canViewInventory ? (inventory[bg] ?? '—') : '—';
                    const stockClass = canViewInventory && inventory[bg] !== undefined
                        ? (inventory[bg] <= 3 ? 'critical' : inventory[bg] <= 8 ? 'low' : 'good')
                        : '';
                    return `
                    <tr>
                      <td><span class="blood-badge">${bg}</span></td>
                      <td><strong>${count}</strong></td>
                      <td>${pct}%</td>
                      <td>${canViewInventory
                            ? `<span class="status-pill ${stockClass}">${stock} units</span>`
                            : '<span class="muted" style="font-size:11px;">Restricted</span>'}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="section-top">
            <div><p class="eyebrow">REQUEST ANALYTICS</p><h3>Request outcomes</h3></div>
          </div>

          <div class="stats-grid">
            ${renderStatCard('Pending', pending, 'Awaiting action')}
            ${renderStatCard('Fulfilled', fulfilled, 'Completed')}
            ${renderStatCard('Cancelled', requests.filter(r => r.status === 'Cancelled').length, 'Withdrawn')}
            ${renderStatCard('Total', requests.length, 'All time')}
          </div>

          <div class="impact-card" style="margin-top:24px;">
            <div class="stat-icon">⌁</div>
            <div>
              <p class="eyebrow">NETWORK STATUS</p>
              <h2>Red Nexus reporting center is live</h2>
              <p>Real-time analytics connected directly to the MySQL database and backend API.</p>
            </div>
          </div>
        </div>
    `;
}
