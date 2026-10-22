import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';
import { escapeHTML } from '../utils/helpers.js';

export async function renderInventoryPage(container, currentUser) {
    const role = currentUser?.role;

    // Non-bank, non-admin: block access entirely
    if (role !== 'BankManager' && role !== 'Admin') {
        container.innerHTML = `
            <div class="page-body">
              <div class="empty-state" style="padding:60px;">
                🔒 Inventory access is restricted to authorized Blood Bank accounts only.
              </div>
            </div>`;
        return;
    }

    let selectedGroup = 'A+';
    let inventory = {};

    try {
        const data = await api.getInventory();
        if (data && typeof data === 'object') inventory = data;
    } catch (e) {}

    // BankManager: check approval
    if (role === 'BankManager') {
        const bankStatus = currentUser?.bank_status || currentUser?.status || 'Pending';
        if (bankStatus !== 'Approved') {
            container.innerHTML = `
                <div class="page-body">
                  <div class="empty-state" style="padding:60px;">
                    ⏳ Your blood bank account is pending admin approval. Inventory management will be available once approved.
                  </div>
                </div>`;
            return;
        }
    }

    function draw() {
        container.innerHTML = `
            <div class="page-body">
              <div class="page-title-row">
                <div>
                  <p class="eyebrow">STOCK CONTROL</p>
                  <h1>Blood inventory</h1>
                  <p class="muted">Track and manage every unit across your blood bank.</p>
                </div>
                <a href="/api/export/inventory/csv" class="outline-button">📥 Export CSV</a>
              </div>

              <div class="inventory-layout">
                <div class="inventory-list">
                  ${BLOOD_GROUPS.map(group => `
                    <button class="inventory-row ${selectedGroup === group ? 'selected' : ''}" data-group="${group}">
                      <span class="blood-badge">${escapeHTML(group)}</span>
                      <div class="inventory-row-info">
                        <strong>${group === 'Bombay' ? 'Bombay phenotype' : escapeHTML(group) + ' blood'}</strong>
                        <small>Updated live</small>
                      </div>
                      <b>${inventory[group] || 0} units</b>
                    </button>
                  `).join('')}
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

                  <div id="invFeedback" class="hidden" style="margin-top:14px;font-size:13px;font-weight:600;padding:10px;border-radius:8px;"></div>
                </div>
              </div>
            </div>
        `;

        document.querySelectorAll('[data-group]').forEach(btn => {
            btn.onclick = () => { selectedGroup = btn.dataset.group; draw(); };
        });
        document.getElementById('increaseUnits').onclick = () => document.getElementById('unitAmount').stepUp();
        document.getElementById('decreaseUnits').onclick = () => {
            const el = document.getElementById('unitAmount');
            if (Number(el.value) > 1) el.stepDown();
        };
        document.getElementById('addUnits').onclick = () => updateUnits(1);
        document.getElementById('removeUnits').onclick = () => updateUnits(-1);
    }

    async function updateUnits(direction) {
        const amount = Number(document.getElementById('unitAmount').value) || 1;
        const newVal = Math.max(0, (inventory[selectedGroup] || 0) + amount * direction);
        const fb = document.getElementById('invFeedback');

        try {
            inventory[selectedGroup] = newVal;
            await api.updateInventory(inventory);
            if (fb) {
                fb.textContent = `✅ ${selectedGroup} updated to ${newVal} units.`;
                fb.style.background = '#f0fdf4'; fb.style.color = '#16a34a';
                fb.classList.remove('hidden');
                setTimeout(() => fb.classList.add('hidden'), 3000);
            }
            draw();
        } catch (e) {
            inventory[selectedGroup] = (inventory[selectedGroup] || 0) - amount * direction;
            if (fb) {
                fb.textContent = '❌ ' + (e.message || 'Update failed. You may need to be an approved blood bank.');
                fb.style.background = '#fef2f2'; fb.style.color = '#ef4444';
                fb.classList.remove('hidden');
            }
        }
    }

    draw();
}
