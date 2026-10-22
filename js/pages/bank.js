import { api } from '../services/api.js';
import { escapeHTML } from '../utils/helpers.js';
import { BLOOD_GROUPS } from '../config/constants.js';

export async function renderBankDashboard(container, currentUser, navigateTo) {
    const bankStatus = currentUser?.bank_status || currentUser?.status || 'Pending';
    const isApproved = bankStatus === 'Approved';
    const bankName = escapeHTML(currentUser?.bank_name || currentUser?.name || 'Your Blood Bank');

    if (!isApproved) {
        container.innerHTML = `
            <div class="page-body">
              <div class="page-title-row">
                <div>
                  <p class="eyebrow">BLOOD BANK DASHBOARD</p>
                  <h1>${bankName}</h1>
                  <p class="muted">Your registration is currently <strong>${escapeHTML(bankStatus)}</strong>.</p>
                </div>
              </div>
              <div class="empty-state" style="padding:48px;">
                <div style="font-size:48px;margin-bottom:16px;">⏳</div>
                <h3>Pending Admin Approval</h3>
                <p>Your blood bank account is awaiting approval from a Red Nexus administrator.<br>
                   You will be able to manage inventory once approved.</p>
              </div>
            </div>`;
        return;
    }

    // Load inventory
    container.innerHTML = `<div class="page-body"><div style="padding:40px;text-align:center;color:#94a3b8;">Loading bank dashboard…</div></div>`;

    let inventory = {};
    let requests = [];
    try {
        [inventory, requests] = await Promise.all([
            api.getInventory(),
            api.getRequests()
        ]);
    } catch (e) {}

    if (!inventory) inventory = {};

    const totalUnits = Object.values(inventory).reduce((s, v) => s + Number(v), 0);
    const pendingReqs = requests.filter(r => r.status === 'Pending');

    let selectedGroup = 'A+';

    function draw() {
        container.innerHTML = `
        <div class="page-body">
          <div class="page-title-row">
            <div>
              <p class="eyebrow">BLOOD BANK DASHBOARD</p>
              <h1>${bankName}</h1>
              <p class="muted">Manage your blood inventory and view incoming requests.</p>
            </div>
            <a href="/api/export/inventory/csv" class="outline-button">📥 Export CSV</a>
          </div>

          <!-- Stats -->
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-num">${totalUnits}</div><div class="stat-label">Total Units</div></div>
            <div class="stat-card"><div class="stat-num">${pendingReqs.length}</div><div class="stat-label">Pending Requests</div></div>
            <div class="stat-card"><div class="stat-num">${BLOOD_GROUPS.length}</div><div class="stat-label">Blood Groups</div></div>
            <div class="stat-card"><div class="stat-num" style="color:#16a34a">${bankStatus}</div><div class="stat-label">Account Status</div></div>
          </div>

          <!-- Inventory Manager -->
          <div class="section-top" style="margin-top:36px;">
            <div><p class="eyebrow">STOCK CONTROL</p><h3>Blood Inventory</h3></div>
          </div>
          <div class="inventory-layout">
            <div class="inventory-list">
              ${BLOOD_GROUPS.map(group => `
                <button class="inventory-row ${selectedGroup === group ? 'selected' : ''}" data-group="${group}">
                  <span class="blood-badge">${escapeHTML(group)}</span>
                  <div class="inventory-row-info">
                    <strong>${group === 'Bombay' ? 'Bombay phenotype' : escapeHTML(group) + ' blood'}</strong>
                    <small>Tap to adjust</small>
                  </div>
                  <b>${inventory[group] || 0} units</b>
                </button>`).join('')}
            </div>

            <div class="inventory-control">
              <p class="eyebrow">SELECTED GROUP</p>
              <h2>${escapeHTML(selectedGroup)}</h2>
              <h1>${inventory[selectedGroup] || 0} units</h1>
              <p class="muted" style="color:#94a3b8;">Adjust available units</p>

              <div class="stepper">
                <button id="decreaseUnits">−</button>
                <input id="unitAmount" type="number" min="1" value="1">
                <button id="increaseUnits">+</button>
              </div>

              <div class="control-actions">
                <button class="primary-button" id="addUnits">＋ Add units</button>
                <button class="outline-button" id="removeUnits">Remove units</button>
              </div>
              <div id="invMsg" class="hidden" style="margin-top:12px;font-size:13px;font-weight:600;"></div>
            </div>
          </div>

          <!-- Pending Requests -->
          <div class="section-top" style="margin-top:36px;">
            <div><p class="eyebrow">INCOMING REQUESTS</p><h3>Pending Blood Requests</h3></div>
          </div>
          ${pendingReqs.length === 0
            ? '<div class="empty-state">No pending requests at this time.</div>'
            : `<div class="table-wrap">
                 <table class="data-table">
                   <thead><tr><th>Patient</th><th>Hospital</th><th>Blood</th><th>Units</th><th>Urgency</th><th>Date</th><th>Action</th></tr></thead>
                   <tbody>
                     ${pendingReqs.map(r => `
                     <tr>
                       <td>${escapeHTML(r.patient)}</td>
                       <td>${escapeHTML(r.hospital)}</td>
                       <td><span class="blood-badge">${escapeHTML(r.blood)}</span></td>
                       <td>${escapeHTML(String(r.units))}</td>
                       <td>${escapeHTML(r.level || 'Routine')}</td>
                       <td>${escapeHTML(r.date || '')}</td>
                       <td>
                         <button class="text-button fulfill-btn" data-id="${r.id}" style="color:#16a34a;">✓ Fulfill</button>
                       </td>
                     </tr>`).join('')}
                   </tbody>
                 </table>
               </div>`}
        </div>`;

        // Group selection
        document.querySelectorAll('[data-group]').forEach(btn => {
            btn.onclick = () => { selectedGroup = btn.dataset.group; draw(); };
        });

        document.getElementById('increaseUnits').onclick = () => {
            document.getElementById('unitAmount').stepUp();
        };
        document.getElementById('decreaseUnits').onclick = () => {
            const el = document.getElementById('unitAmount');
            if (Number(el.value) > 1) el.stepDown();
        };
        document.getElementById('addUnits').onclick = () => updateUnits(1);
        document.getElementById('removeUnits').onclick = () => updateUnits(-1);

        // Fulfill request buttons
        document.querySelectorAll('.fulfill-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true; btn.textContent = 'Processing…';
                try {
                    await api.updateRequestStatus(Number(btn.dataset.id), 'Fulfilled');
                    requests = await api.getRequests();
                    draw();
                } catch (e) {
                    btn.textContent = 'Error'; btn.disabled = false;
                }
            });
        });
    }

    async function updateUnits(direction) {
        const amount = Number(document.getElementById('unitAmount').value) || 1;
        const newVal = Math.max(0, (inventory[selectedGroup] || 0) + amount * direction);
        if (!Number.isInteger(newVal) || newVal < 0) return;

        const msgEl = document.getElementById('invMsg');
        try {
            inventory[selectedGroup] = newVal;
            await api.updateInventory(inventory);
            if (msgEl) {
                msgEl.textContent = `✅ ${selectedGroup} updated to ${newVal} units.`;
                msgEl.style.color = '#16a34a';
                msgEl.classList.remove('hidden');
                setTimeout(() => msgEl.classList.add('hidden'), 3000);
            }
            draw();
        } catch (e) {
            inventory[selectedGroup] = (inventory[selectedGroup] || 0) - amount * direction; // revert
            if (msgEl) {
                msgEl.textContent = '❌ ' + (e.message || 'Update failed.');
                msgEl.style.color = '#ef4444';
                msgEl.classList.remove('hidden');
            }
        }
    }

    draw();
}
