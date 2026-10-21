import { BLOOD_GROUPS } from '../config/constants.js';
import { api } from '../services/api.js';
import { escapeHTML } from '../utils/helpers.js';

export async function renderInventoryPage(container) {
    let selectedGroup = "A+";
    let inventory = await api.getInventory();

    function draw() {
        container.innerHTML = ` 
            <div class="page-body"> 
              <div class="page-title-row"> 
                <div> 
                  <p class="eyebrow">STOCK CONTROL</p> 
                  <h1>Blood inventory</h1> 
                  <p class="muted">Track every unit across the Red Nexus network.</p> 
                </div> 
                <a href="http://localhost:3000/api/export/inventory/csv" download="RedNexus_Inventory.csv" class="outline-button"> 
                  📥 Export CSV 
                </a>
              </div> 
 
              <div class="inventory-layout"> 
                <div class="inventory-list"> 
                  ${BLOOD_GROUPS.map(group => ` 
                    <button class="inventory-row ${selectedGroup === group ? "selected" : ""}" data-group="${group}"> 
                      <span class="blood-badge">${escapeHTML(group)}</span> 
                      <div class="inventory-row-info"> 
                        <strong>${group === "Bombay" ? "Bombay phenotype" : escapeHTML(group) + " blood"}</strong> 
                        <small>Updated live</small> 
                      </div> 
                      <b>${inventory[group] || 0} units</b> 
                    </button> 
                  `).join("")} 
                </div> 
 
                <div class="inventory-control"> 
                  <p class="eyebrow">SELECTED GROUP</p> 
                  <h2>${escapeHTML(selectedGroup)}</h2> 
                  <h1>${inventory[selectedGroup] || 0} units</h1> 
                  <p class="muted" style="color:#94a3b8">Adjust available units</p> 
 
                  <div class="stepper"> 
                    <button id="decreaseUnits">−</button> 
                    <input id="unitAmount" type="number" min="1" value="1"> 
                    <button id="increaseUnits">+</button> 
                  </div> 
 
                  <div class="control-actions"> 
                    <button class="primary-button" id="addUnits">＋ Add units</button> 
                    <button class="outline-button" id="removeUnits">Remove units</button> 
                  </div> 
                </div> 
              </div> 
            </div> 
        `;

        document.querySelectorAll("[data-group]").forEach(button => {
            button.onclick = () => {
                selectedGroup = button.dataset.group;
                draw();
            };
        });

        document.getElementById("increaseUnits").onclick = () => {
            document.getElementById("unitAmount").stepUp();
        };

        document.getElementById("decreaseUnits").onclick = () => {
            const input = document.getElementById("unitAmount");
            if (Number(input.value) > 1) input.stepDown();
        };

        document.getElementById("addUnits").onclick = () => updateUnits(1);
        document.getElementById("removeUnits").onclick = () => updateUnits(-1);
    }

    async function updateUnits(direction) {
        const amount = Number(document.getElementById("unitAmount").value) || 1;
        inventory[selectedGroup] = Math.max(0, (inventory[selectedGroup] || 0) + amount * direction);
        await api.updateInventory(inventory);
        draw();
    }

    draw();
}
