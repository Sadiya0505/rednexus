import { escapeHTML } from '../utils/helpers.js';

export function renderStatCard(label, value, note) {
    return ` 
        <div class="stat-card"> 
          <div class="stat-icon">♥</div> 
          <p>${escapeHTML(label)}</p> 
          <strong>${escapeHTML(value)}</strong> 
          <small class="muted">${escapeHTML(note)}</small> 
        </div> 
    `;
}

export function renderBloodCard(group, units) {
    const status = units <= 3 ? "Critical" : units <= 8 ? "Low stock" : "Available";
    const type = units <= 3 ? "critical" : units <= 8 ? "low" : "good";

    return ` 
        <div class="blood-card"> 
          <div class="blood-card-top"> 
            <span class="blood-type">${escapeHTML(group)}</span> 
            <span class="status-pill ${type}">${status}</span> 
          </div> 
          <strong>${units}<small> units</small></strong> 
          <div class="stock-track"> 
            <span class="${type}" style="width:${Math.min(units * 4, 100)}%"></span> 
          </div> 
          <p>${units <= 3 ? "Restock needed" : "Ready for matching"}</p> 
        </div> 
    `;
}
