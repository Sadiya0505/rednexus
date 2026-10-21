import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';
import { escapeHTML, getCompatibleDonors } from '../utils/helpers.js';
import { validatePhone } from '../utils/validation.js';

export async function renderRequestsPage(container, emergency = false) {
    const requests = await api.getRequests();
    const filteredRequests = emergency
        ? requests.filter(r => r.level === "Critical" || emergency)
        : requests;

    function render() {
        container.innerHTML = ` 
            <div class="page-body"> 
              <div class="page-title-row"> 
                <div> 
                  <p class="eyebrow">${emergency ? "PRIORITY CARE" : "MATCHING CENTER"}</p> 
                  <h1>${emergency ? "Emergency requests" : "Blood requests"}</h1> 
                  <p class="muted"> 
                    ${emergency
                        ? "High-priority cases appear here for immediate action."
                        : "Create and manage requests from partner hospitals."} 
                  </p> 
                </div> 
              </div> 
 
              <div class="request-layout"> 
                <div> 
                  <div class="request-count" style="margin-bottom:16px"> 
                    <h2 style="display:inline-block;margin:0 10px 0 0">${filteredRequests.length}</h2> 
                    <span class="muted">total requests</span> 
                  </div> 
 
                  ${filteredRequests.map(request => {
                    const compatibleDonors = getCompatibleDonors(request.blood);
                    const statusClass = request.status === "Fulfilled" ? "fulfilled" : request.status === "Cancelled" ? "cancelled" : "critical";
                    const statusText = request.status || "Pending";

                    return ` 
                    <div class="request-item"> 
                      <div class="urgent-icon">${request.level === "Critical" ? "⚡" : "⚠"}</div> 
                      <div class="request-item-main"> 
                        <strong>${escapeHTML(request.patient)}</strong> 
                        <p> 
                          ${escapeHTML(request.hospital)} · ${escapeHTML(request.units)} units · 
                          <span class="blood-badge">${escapeHTML(request.blood)}</span> 
                        </p> 
                        <p style="margin-top:6px"> 
                          <span class="compat-badge">Compatible Donors: ${compatibleDonors.join(", ")}</span> 
                        </p> 
                        ${request.status === "Pending" || !request.status ? `
                          <div class="request-actions"> 
                            <button class="action-btn-sm fulfill" data-action="fulfill" data-id="${request.id}">✓ Fulfill Request</button> 
                            <button class="action-btn-sm cancel" data-action="cancel" data-id="${request.id}">✕ Cancel</button> 
                          </div> 
                        ` : ''}
                      </div> 
                      <span class="status-pill ${statusClass}">${escapeHTML(statusText)}</span> 
                    </div> 
                  `;
                  }).join("")} 
                </div> 
 
                <div class="form-panel"> 
                  <p class="eyebrow">NEW REQUEST</p> 
                  <h3>${emergency ? "Request blood urgently" : "Start a blood request"}</h3> 
 
                  <form class="request-form" id="requestForm"> 
                    <label>Patient name<input name="patient" required></label> 
                    <label>Hospital name<input name="hospital" required></label> 
                    <label>Contact number (10 digits)<input name="contact" type="tel" placeholder="10-digit number" required></label> 
 
                    <label>Blood group 
                      <select name="blood"> 
                        ${BLOOD_GROUPS.map(group => `<option>${group}</option>`).join("")} 
                      </select> 
                    </label> 
 
                    <label>Required units<input name="units" type="number" min="1" value="1" required></label> 
 
                    <label>${emergency ? "Emergency level" : "Priority"} 
                      <select name="level"> 
                        <option ${emergency ? "selected" : ""}>Critical</option> 
                        <option ${!emergency ? "selected" : ""}>High</option> 
                        <option>Routine</option> 
                      </select> 
                    </label> 
 
                    <div id="requestError" class="form-error hidden"></div> 
 
                    <button class="primary-button" type="submit"> 
                      ${emergency ? "⚡ Submit emergency request" : "Submit blood request"} 
                    </button> 
                  </form> 
                </div> 
              </div> 
            </div> 
        `;

        // Event listeners for Fulfill / Cancel actions
        document.querySelectorAll("[data-action]").forEach(btn => {
            btn.onclick = async () => {
                const action = btn.dataset.action;
                const id = Number(btn.dataset.id);
                const newStatus = action === "fulfill" ? "Fulfilled" : "Cancelled";

                if (action === "fulfill") {
                    // Auto-decrement units from inventory if fulfilled
                    const req = filteredRequests.find(r => r.id === id);
                    if (req) {
                        const inv = await api.getInventory();
                        inv[req.blood] = Math.max(0, (inv[req.blood] || 0) - (Number(req.units) || 1));
                        await api.updateInventory(inv);
                    }
                }

                await api.updateRequestStatus(id, newStatus);
                renderRequestsPage(container, emergency);
            };
        });

        document.getElementById("requestForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const form = new FormData(e.target);
            const values = Object.fromEntries(form.entries());

            if (!validatePhone(values.contact)) {
                const errorEl = document.getElementById("requestError");
                errorEl.textContent = "Contact number must be exactly 10 digits.";
                errorEl.classList.remove("hidden");
                return;
            }

            await api.createRequest({
                patient: values.patient,
                hospital: values.hospital,
                contact: values.contact,
                blood: values.blood,
                units: Number(values.units) || 1,
                level: values.level
            });

            renderRequestsPage(container, emergency);
        });
    }

    render();
}
