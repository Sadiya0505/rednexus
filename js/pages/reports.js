import { renderStatCard } from '../components/cards.js';
import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';

export async function renderReportsPage(container) {
    const [inventory, donors, requests] = await Promise.all([
        api.getInventory(),
        api.getDonors(),
        api.getRequests()
    ]);

    const totalUnits = Object.values(inventory).reduce((sum, v) => sum + v, 0);

    container.innerHTML = ` 
        <div class="page-body"> 
          <div class="page-title-row"> 
            <div> 
              <p class="eyebrow">INSIGHTS</p> 
              <h1>Reports</h1> 
              <p class="muted">A quick overview of your current blood-bank activity.</p> 
            </div> 
          </div> 
 
          <div class="stats-grid"> 
            ${renderStatCard("Total units", totalUnits, "Current inventory")} 
            ${renderStatCard("Donors", donors.length, "Registered")} 
            ${renderStatCard("Requests", requests.length, "Active")} 
            ${renderStatCard("Blood groups", BLOOD_GROUPS.length, "Monitored")} 
          </div> 
 
          <div class="impact-card"> 
            <div class="stat-icon">⌁</div> 
            <div> 
              <p class="eyebrow">REPORT STATUS</p> 
              <h2>Red Nexus reporting center is active</h2> 
              <p>Real-time analytics connected directly to the Express backend and database.</p> 
            </div> 
          </div> 
        </div> 
    `;
}
