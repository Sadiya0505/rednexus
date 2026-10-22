import { renderLogo } from './logo.js';
import { escapeHTML } from '../utils/helpers.js';

export function renderNavbar(currentPage, currentUser, mobileMenuOpen) {
    const role = currentUser?.role || 'Donor';

    // Base nav items available to all authenticated users
    const navItems = [
        ['dashboard', '▦', 'Dashboard'],
        ['donors', '♙', 'Donor directory'],
        ['requests', '▤', 'Blood requests'],
        ['emergency', '⚡', 'Emergency'],
        ['history', '◷', 'History'],
        ['profile', '👤', 'My Profile'],
        ['reports', '⌁', 'Reports']
    ];

    // Inventory — only Blood Bank and Admin
    if (role === 'BankManager' || role === 'Bank' || role === 'Admin') {
        navItems.splice(2, 0, ['inventory', '▣', 'Blood inventory']);
    }

    // Role-specific dashboards
    if (role === 'Admin') navItems.push(['admin', '🛠', 'Admin Dashboard']);
    if (role === 'BankManager' || role === 'Bank') navItems.push(['bank', '🏥', 'Bank Dashboard']);

    const userName = currentUser ? escapeHTML(currentUser.name || 'User') : 'Guest';
    const initial = userName.charAt(0).toUpperCase();
    const roleBadge = { Admin: '🛠 Admin', BankManager: '🏥 Blood Bank', Donor: '🩸 Donor', Acceptor: '🏥 Acceptor' }[role] || role;

    return `
        <div class="app-shell">
          <div class="mobile-overlay ${mobileMenuOpen ? 'visible' : ''}" id="mobileOverlay"></div>

          <aside class="sidebar ${mobileMenuOpen ? 'mobile-open' : ''}" id="sidebar">
            ${renderLogo()}
            <p class="nav-caption">WORKSPACE</p>

            <nav>
              ${navItems.map(([id, icon, label]) => `
                <button class="${currentPage === id ? 'active' : ''}" data-page="${id}">
                  <span>${icon}</span>${escapeHTML(label)}
                </button>
              `).join('')}
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
                <h2>${currentPage === 'dashboard' ? 'Welcome, ' + userName : pageTitle(currentPage)}</h2>
              </div>

              <div class="top-actions">
                <span title="Notifications" style="cursor:pointer">🔔</span>
                <div class="user-chip" title="Click to view your profile" style="cursor:pointer;">
                  <div class="avatar">${initial}</div>
                  <div>
                    <span>${userName}</span>
                    <small style="display:block;font-size:9px;color:#94a3b8;font-weight:500;">${roleBadge}</small>
                  </div>
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
        donors: 'Donor Directory',
        inventory: 'Blood Inventory',
        requests: 'Blood Requests',
        emergency: 'Emergency Requests',
        history: 'Donation History',
        profile: 'Your Profile',
        reports: 'Reports & Insights',
        admin: 'Admin Dashboard',
        bank: 'Bank Dashboard'
    }[page] || 'Dashboard';
}
