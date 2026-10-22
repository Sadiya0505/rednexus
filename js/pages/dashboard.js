import { renderStatCard, renderBloodCard } from '../components/cards.js';
import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';
import { escapeHTML } from '../utils/helpers.js';

export async function renderDashboardPage(container, navigateTo, currentUser) {
    const role = currentUser?.role || 'Donor';
    const canViewInventory = role === 'BankManager' || role === 'Bank' || role === 'Admin';

    // Inventory is bank-protected; fall back to empty object if not authorized
    let inventory = {};
    let donors = [];
    let requests = [];

    try {
        const results = await Promise.allSettled([
            canViewInventory ? api.getInventory() : Promise.resolve(null),
            api.getDonors(),
            api.getRequests()
        ]);

        if (results[0].status === 'fulfilled' && results[0].value) {
            inventory = results[0].value;
        }
        if (results[1].status === 'fulfilled') donors = results[1].value || [];
        if (results[2].status === 'fulfilled') requests = results[2].value || [];
    } catch (e) {}

    const totalUnits = Object.values(inventory).reduce((sum, v) => sum + Number(v), 0);
    const pendingRequests = requests.filter(r => r.status === 'Pending' || !r.status);
    const criticalRequests = pendingRequests.filter(r => r.level === 'Critical');

    container.innerHTML = `
        <div class="page-body">
          <section class="hero-strip">
            <div>
              <p class="eyebrow">LIVE NETWORK · UPDATED JUST NOW</p>
              <h1>Every unit counts.</h1>
              <p>Here's what's happening across the Red Nexus blood network today.</p>
            </div>
            <button class="emergency-button" id="dashboardEmergency">⚡ Emergency request</button>
          </section>

          <div class="stats-grid">
            ${renderStatCard('Total blood units', canViewInventory ? totalUnits : '—', canViewInventory ? 'Across all groups' : 'Bank access required')}
            ${renderStatCard('Registered donors', donors.length, '+12 this month')}
            ${renderStatCard('Blood groups', BLOOD_GROUPS.length, 'All monitored')}
            ${renderStatCard('Pending requests', pendingRequests.length, `${criticalRequests.length} critical`)}
          </div>

          ${canViewInventory ? `
          <div class="section-top">
            <div>
              <p class="eyebrow">LIVE INVENTORY</p>
              <h3>Blood stock levels</h3>
            </div>
            <button class="text-button" id="viewInventory">Manage inventory →</button>
          </div>
          <div class="blood-grid">
            ${BLOOD_GROUPS.map(group => renderBloodCard(group, inventory[group] || 0)).join('')}
          </div>` : `
          <div class="section-top" style="margin-top:28px;">
            <div>
              <p class="eyebrow">BLOOD INVENTORY</p>
              <h3>Inventory restricted to authorized blood banks</h3>
            </div>
          </div>
          <div style="padding:24px;background:#fff;border:1px solid var(--line);border-radius:12px;color:#94a3b8;font-size:13px;">
            🔒 Real-time inventory management is available to approved blood bank accounts only.
            ${role === 'Donor' || role === 'Acceptor' ? 'You can still view summary data from the donor directory and blood request pages.' : ''}
          </div>
          `}

          <div class="section-top" style="margin-top:42px;">
            <div>
              <p class="eyebrow">NEEDS ATTENTION</p>
              <h3>Emergency &amp; pending requests</h3>
            </div>
            <button class="text-button" id="viewEmergency">See all →</button>
          </div>

          ${pendingRequests.length
            ? pendingRequests.slice(0, 3).map(req => `
              <div class="request-banner">
                <div class="urgent-icon">${req.level === 'Critical' ? '⚡' : '⚠'}</div>
                <div class="request-banner-content">
                  <strong>${escapeHTML(req.patient)} needs ${escapeHTML(req.blood)} blood</strong>
                  <p>${escapeHTML(req.hospital)} &middot; ${escapeHTML(String(req.units))} units &middot; ${escapeHTML(req.level || 'Routine')} priority</p>
                </div>
                <span class="status-pill ${req.level === 'Critical' ? 'critical' : 'pending'}">${escapeHTML(req.level || 'Pending')}</span>
              </div>`).join('')
            : '<div class="empty-state">No pending emergency requests right now. ✅</div>'}
        </div>
    `;

    document.getElementById('dashboardEmergency').onclick = () => navigateTo('emergency');
    if (document.getElementById('viewInventory')) {
        document.getElementById('viewInventory').onclick = () => navigateTo('inventory');
    }
    document.getElementById('viewEmergency').onclick = () => navigateTo('emergency');
}
