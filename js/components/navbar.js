import { renderLogo } from './logo.js';
import { escapeHTML } from '../utils/helpers.js';

export function renderNavbar(currentPage, currentUser, mobileMenuOpen) {
    const navItems = [
        ["dashboard", "▦", "Dashboard"],
        ["donors", "♙", "Donor list"],
        ["inventory", "▣", "Blood inventory"],
        ["requests", "▤", "Blood requests"],
        ["emergency", "⚡", "Emergency requests"],
        ["history", "◷", "Donation history"],
        ["profile", "♙", "Profile"],
        ["reports", "⌁", "Reports"]
    ];

    const userName = currentUser ? escapeHTML(currentUser.name || "Alex Morgan") : "Guest";
    const initial = userName.charAt(0).toUpperCase();

    return ` 
        <div class="app-shell"> 
          <div class="mobile-overlay ${mobileMenuOpen ? "visible" : ""}" id="mobileOverlay"></div> 
 
          <aside class="sidebar ${mobileMenuOpen ? "mobile-open" : ""}" id="sidebar"> 
            ${renderLogo()} 
            <p class="nav-caption">WORKSPACE</p> 
 
            <nav> 
              ${navItems.map(([id, icon, label]) => ` 
                <button class="${currentPage === id ? "active" : ""}" data-page="${id}"> 
                  <span>${icon}</span>${label} 
                </button> 
              `).join("")} 
            </nav> 
 
            <div class="sidebar-bottom"> 
              <button id="logoutButton">⇥ Log out</button> 
            </div> 
          </aside> 
 
          <main class="main-content"> 
            <header class="topbar"> 
              <button class="mobile-menu" id="mobileMenuButton">☰</button> 
 
              <div> 
                <p class="breadcrumb">RED NEXUS / ${escapeHTML(currentPage.toUpperCase())}</p> 
                <h2>${currentPage === "dashboard" ? "Welcome, " : ""}${currentPage === "dashboard" ? userName : pageTitle(currentPage)}</h2> 
              </div> 
 
              <div class="top-actions"> 
                <span title="Notifications" style="cursor:pointer">🔔</span> 
                <div class="user-chip"> 
                  <div class="avatar">${initial}</div> 
                  <span>${userName}</span> 
                </div> 
              </div> 
            </header> 
 
            <div id="pageContent"></div> 
          </main> 
        </div> 
    `;
}

function pageTitle(page) {
    return {
        donors: "Donor Directory",
        inventory: "Blood Inventory",
        requests: "Blood Requests",
        emergency: "Emergency Requests",
        history: "Donation History",
        profile: "Your Profile",
        reports: "Reports & Insights"
    }[page] || "Dashboard";
}
