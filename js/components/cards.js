import { escapeHTML } from '../utils/helpers.js';

export function renderStatCard(label, value, note) {
    return `
        <div class="stat-card">
          <div class="stat-icon">♥</div>
          <div class="stat-label">${escapeHTML(label)}</div>
          <div class="stat-num">${escapeHTML(String(value ?? '—'))}</div>
          <small class="muted">${escapeHTML(note || '')}</small>
        </div>
    `;
}

export function renderBloodCard(group, units) {
    const n = Number(units) || 0;
    const status = n <= 3 ? 'Critical' : n <= 8 ? 'Low stock' : 'Available';
    const type = n <= 3 ? 'critical' : n <= 8 ? 'low' : 'good';

    return `
        <div class="blood-card">
          <div class="blood-card-top">
            <span class="blood-type">${escapeHTML(group)}</span>
            <span class="status-pill ${type}">${status}</span>
          </div>
          <strong>${n}<small> units</small></strong>
          <div class="stock-track">
            <span class="${type}" style="width:${Math.min(n * 4, 100)}%"></span>
          </div>
          <p>${n <= 3 ? 'Restock needed' : 'Ready for matching'}</p>
        </div>
    `;
}
