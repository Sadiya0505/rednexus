import { renderStatCard, renderBloodCard } from '../components/cards.js';
import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';
import { escapeHTML } from '../utils/helpers.js';

export async function renderDashboardPage(container, navigateTo) {
    const [inventory, donors, requests] = await Promise.all([
        api.getInventory(),
        api.getDonors(),
        api.getRequests()
    ]);

    const totalUnits = Object.values(inventory).reduce((sum, v) => sum + v, 0);
    const pendingRequests = requests.filter(r => r.status === "Pending" || !r.status);

    container.innerHTML = ` 
        <div class="page-body"> 
          <section class="hero-strip"> 
            <div> 
              <p class="eyebrow">LIVE INVENTORY · UPDATED JUST NOW</p> 
              <h1>Every unit counts.</h1> 
              <p>Here’s what’s happening across your blood network today.</p> 
            </div> 
            <button class="emergency-button" id="dashboardEmergency"> 
              ⚡ Emergency request 
            </button> 
          </section> 
 
          <div class="stats-grid"> 
            ${renderStatCard("Total blood units", totalUnits, "Across all groups")} 
            ${renderStatCard("Registered donors", donors.length, "+12 this month")} 
            ${renderStatCard("Blood groups", BLOOD_GROUPS.length, "All monitored")} 
            ${renderStatCard("Pending requests", pendingRequests.length, "Needs review")} 
          </div> 
 
          <div class="section-top"> 
            <div> 
              <p class="eyebrow">LIVE INVENTORY</p> 
              <h3>Blood stock levels</h3> 
            </div> 
            <button class="text-button" id="viewInventory">View inventory →</button> 
          </div> 
 
          <div class="blood-grid"> 
            ${BLOOD_GROUPS.map(group => renderBloodCard(group, inventory[group] || 0)).join("")} 
          </div> 
 
          <div class="section-top" style="margin-top:42px"> 
            <div> 
              <p class="eyebrow">NEEDS ATTENTION</p> 
              <h3>Emergency requests</h3> 
            </div> 
            <button class="text-button" id="viewEmergency">See all →</button> 
          </div> 
 
          ${pendingRequests.length
            ? ` 
                <div class="request-banner"> 
                  <div class="urgent-icon">⚠</div> 
                  <div class="request-banner-content"> 
                    <strong>${escapeHTML(pendingRequests[0].patient)} needs ${escapeHTML(pendingRequests[0].blood)} blood</strong> 
                    <p>${escapeHTML(pendingRequests[0].hospital)} · ${escapeHTML(pendingRequests[0].units)} units required · ${escapeHTML(pendingRequests[0].level || 'Critical')} priority</p> 
                  </div> 
                  <span class="status-pill critical">Urgent</span> 
                </div> 
              `
            : `<div class="empty-state">No pending emergency requests right now.</div>`
          } 
        </div> 
    `;

    document.getElementById("dashboardEmergency").onclick = () => navigateTo("emergency");
    document.getElementById("viewInventory").onclick = () => navigateTo("inventory");
    document.getElementById("viewEmergency").onclick = () => navigateTo("emergency");
}
