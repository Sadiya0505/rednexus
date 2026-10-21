import { escapeHTML } from '../utils/helpers.js';

export function renderProfilePage(container, currentUser) {
    const user = currentUser || {
        name: "Alex Morgan",
        email: "demo@rednexus.org",
        id: "RN-DEMO-001",
        blood: "O+",
        mobile: "9876543210",
        city: "San Francisco",
        location: "Red Nexus Central",
        last: "2025-12-12",
        role: "Donor"
    };

    container.innerHTML = ` 
        <div class="page-body"> 
          <div class="page-title-row"> 
            <div> 
              <p class="eyebrow">ACCOUNT SETTINGS</p> 
              <h1>Your profile</h1> 
              <p class="muted">Keep your details current so we can reach you when it matters.</p> 
            </div> 
          </div> 
 
          <div class="profile-layout"> 
            <section class="profile-card"> 
              <div class="profile-hero"> 
                <div class="profile-avatar">${escapeHTML(user.name.charAt(0).toUpperCase())}</div> 
                <div> 
                  <h2>${escapeHTML(user.name)}</h2> 
                  <p>${escapeHTML(user.email)}</p> 
                  <span class="status-pill good">${user.role === "Acceptor" ? "Active Acceptor" : "Active Donor"}</span> 
                </div> 
              </div> 
 
              <div class="profile-fields"> 
                ${profileField("User ID", user.id || "RN-DEMO-001")} 
                ${profileField("Blood group", user.blood || "O+")} 
                ${profileField("Mobile number", user.mobile || "Not added")} 
                ${profileField("City", user.city || "San Francisco")} 
                ${profileField("Preferred location", user.location || "Red Nexus Central")} 
                ${profileField("Last donation / Request", user.last || "2025-12-12")} 
              </div> 
            </section> 
 
            <aside class="profile-side"> 
              <div class="stat-icon">✓</div> 
              <h3>${user.role === "Acceptor" ? "Request Status" : "Donation eligibility"}</h3> 
              <p class="muted"> 
                ${user.role === "Acceptor" ? "Your acceptor profile is set up to issue active blood requests." : "Your donor profile is ready for matching. Keep your health details updated."} 
              </p> 
 
              <div class="eligibility-row"> 
                <span>Profile completeness</span> 
                <strong>100%</strong> 
              </div> 
 
              <div class="stock-track"> 
                <span style="width:100%"></span> 
              </div> 
            </aside> 
          </div> 
        </div> 
    `;
}

function profileField(label, value) {
    return ` 
        <div> 
          <small style="display:block;color:#94a3b8;font-size:10px;margin-bottom:7px">${escapeHTML(label)}</small> 
          <strong>${escapeHTML(value)}</strong> 
        </div> 
    `;
}
