import { escapeHTML } from '../utils/helpers.js';

export function renderHistoryPage(container, currentUser) {
    const blood = currentUser ? currentUser.blood || "O+" : "O+";

    const entries = [
        {
            date: currentUser?.last || "2025-12-12",
            location: currentUser?.location || "Red Nexus Central",
            blood,
            units: 1
        },
        {
            date: "2025-06-18",
            location: "St. Mary's Community Drive",
            blood,
            units: 1
        }
    ];

    container.innerHTML = ` 
        <div class="page-body"> 
          <div class="page-title-row"> 
            <div> 
              <p class="eyebrow">YOUR IMPACT</p> 
              <h1>Donation history</h1> 
              <p class="muted">A record of every donation you’ve made with Red Nexus.</p> 
            </div> 
            <div class="history-total"> 
              <strong>${entries.length}</strong> 
              <span>donations made</span> 
            </div> 
          </div> 
 
          <div class="impact-card"> 
            <div class="stat-icon">♥</div> 
            <div> 
              <p class="eyebrow">LIFE-SAVING CONTRIBUTION</p> 
              <h2>${entries.length} donations · up to ${entries.length * 3} lives impacted</h2> 
              <p>Thank you for showing up when your community needed you.</p> 
            </div> 
          </div> 
 
          <div class="table-wrap"> 
            <table> 
              <thead> 
                <tr> 
                  <th>Date</th> 
                  <th>Donation location</th> 
                  <th>Blood group</th> 
                  <th>Units</th> 
                  <th>Status</th> 
                </tr> 
              </thead> 
              <tbody> 
                ${entries.map(entry => ` 
                  <tr> 
                    <td>${escapeHTML(entry.date)}</td> 
                    <td>${escapeHTML(entry.location)}</td> 
                    <td><span class="blood-badge">${escapeHTML(entry.blood)}</span></td> 
                    <td>${entry.units} unit</td> 
                    <td><span class="status-pill good">Completed</span></td> 
                  </tr> 
                `).join("")} 
              </tbody> 
            </table> 
          </div> 
        </div> 
    `;
}
