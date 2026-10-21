import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';
import { escapeHTML } from '../utils/helpers.js';

export async function renderDonorsPage(container) {
    const donors = await api.getDonors();

    container.innerHTML = ` 
        <div class="page-body"> 
          <div class="page-title-row"> 
            <div> 
              <p class="eyebrow">PEOPLE & COMMUNITY</p> 
              <h1>Donor directory</h1> 
              <p class="muted">${donors.length} registered donors in your network</p> 
            </div> 
            <a href="http://localhost:3000/api/export/donors/csv" download="RedNexus_Donors.csv" class="outline-button"> 
              📥 Export CSV 
            </a>
          </div> 
 
          <div class="toolbar"> 
            <input id="donorSearch" placeholder="Search by name, ID or city"> 
            <select id="donorFilter"> 
              <option>All groups</option> 
              ${BLOOD_GROUPS.map(group => `<option>${group}</option>`).join("")} 
            </select> 
          </div> 
 
          <div class="table-wrap"> 
            <table> 
              <thead> 
                <tr> 
                  <th>Donor</th> 
                  <th>Blood group</th> 
                  <th>Mobile number</th> 
                  <th>City</th> 
                  <th>Last donation</th> 
                  <th>Status</th> 
                </tr> 
              </thead> 
              <tbody id="donorTable"></tbody> 
            </table> 
          </div> 
        </div> 
    `;

    const search = document.getElementById("donorSearch");
    const filter = document.getElementById("donorFilter");

    function updateTable() {
        const query = search.value.toLowerCase();
        const group = filter.value;

        const rows = donors.filter(donor => {
            const matchesSearch = `${donor.name} ${donor.id} ${donor.city}`
                .toLowerCase()
                .includes(query);
            const matchesGroup = group === "All groups" || donor.blood === group;
            return matchesSearch && matchesGroup;
        });

        document.getElementById("donorTable").innerHTML = rows.map(donor => ` 
            <tr> 
              <td> 
                <div class="donor-cell"> 
                  <div class="avatar">${escapeHTML(donor.name.charAt(0).toUpperCase())}</div> 
                  <div> 
                    <strong>${escapeHTML(donor.name)}</strong> 
                    <small>${escapeHTML(donor.id)}</small> 
                  </div> 
                </div> 
              </td> 
              <td><span class="blood-badge">${escapeHTML(donor.blood)}</span></td> 
              <td>${escapeHTML(donor.mobile || "Not added")}</td> 
              <td>${escapeHTML(donor.city || "Not added")}</td> 
              <td>${escapeHTML(donor.last || "Never")}</td> 
              <td><span class="status-pill good">${escapeHTML(donor.status || "Eligible")}</span></td> 
            </tr> 
        `).join("");
    }

    search.addEventListener("input", updateTable);
    filter.addEventListener("change", updateTable);
    updateTable();
}
