import { renderNavbar } from './components/navbar.js';
import {
    renderLoginView,
    renderRegisterDonorView,
    renderRegisterAcceptorView,
    renderRegisterBankView,
    renderForgotPasswordView,
    renderResetPasswordConfirmView
} from './pages/auth.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderDonorsPage } from './pages/donors.js';
import { renderInventoryPage } from './pages/inventory.js';
import { renderRequestsPage } from './pages/requests.js';
import { renderHistoryPage } from './pages/history.js';
import { renderProfilePage } from './pages/profile.js';
import { renderReportsPage } from './pages/reports.js';
import { renderAdminDashboard } from './pages/admin.js';
import { renderBankDashboard } from './pages/bank.js';
import { api } from './services/api.js';

class App {
    constructor() {
        this.appEl = document.getElementById('app');
        this.currentUser = JSON.parse(localStorage.getItem('redNexusUser')) || null;
        this.currentPage = 'dashboard';
        this.mobileMenuOpen = false;

        // viewState: login | register | registerAcceptor | registerBank | forgotPassword | resetPasswordConfirm | app
        this.viewState = 'login';

        // Check reset token in URL — supports:
        //   /reset?token=xxx  (email link format)
        //   /?token=xxx       (legacy)
        //   #token=xxx        (old hash format)
        const urlParams = new URLSearchParams(window.location.search);
        const queryToken = urlParams.get('token');
        const hashMatch = window.location.hash.match(/token=([^&]+)/);
        this.resetToken = queryToken || (hashMatch ? hashMatch[1] : null);

        if (this.resetToken) {
            this.viewState = 'resetPasswordConfirm';
        } else if (this.currentUser) {
            this.viewState = 'app';
            // Default landing page by role
            const role = this.currentUser.role;
            if (role === 'Admin') this.currentPage = 'admin';
            else if (role === 'BankManager' || role === 'Bank') this.currentPage = 'bank';
            else this.currentPage = 'dashboard';
        }
    }

    init() {
        window.addEventListener('hashchange', () => {
            const hashMatch = window.location.hash.match(/token=([^&]+)/);
            if (hashMatch) {
                this.resetToken = hashMatch[1];
                this.viewState = 'resetPasswordConfirm';
                this.render();
            }
        });
        this.render();
    }

    async render() {
        // ── Auth views ──────────────────────────────────────────────────────
        if (this.viewState === 'login') {
            renderLoginView(
                this.appEl,
                async (email, password) => {
                    const user = await api.login(email, password);
                    this.currentUser = user;
                    this.viewState = 'app';
                    // Redirect based on role
                    const role = user.role;
                    if (role === 'Admin') this.currentPage = 'admin';
                    else if (role === 'BankManager' || role === 'Bank') this.currentPage = 'bank';
                    else this.currentPage = 'dashboard';
                    this.render();
                },
                () => { this.viewState = 'register'; this.render(); },
                () => { this.viewState = 'registerAcceptor'; this.render(); },
                () => { this.viewState = 'forgotPassword'; this.render(); },
                () => { this.viewState = 'registerBank'; this.render(); }
            );
            return;
        }

        if (this.viewState === 'register') {
            renderRegisterDonorView(
                this.appEl,
                async (donorData) => {
                    const user = await api.registerDonor(donorData);
                    this.currentUser = user;
                    this.viewState = 'app';
                    this.currentPage = 'dashboard';
                    this.render();
                },
                () => { this.viewState = 'login'; this.render(); }
            );
            return;
        }

        if (this.viewState === 'registerAcceptor') {
            renderRegisterAcceptorView(
                this.appEl,
                async (acceptorData) => {
                    const user = await api.registerAcceptor(acceptorData);
                    this.currentUser = user;
                    this.viewState = 'app';
                    this.currentPage = 'requests';
                    this.render();
                },
                () => { this.viewState = 'login'; this.render(); }
            );
            return;
        }

        if (this.viewState === 'registerBank') {
            renderRegisterBankView(
                this.appEl,
                async (bankData) => {
                    return await api.registerBank(bankData);
                },
                () => { this.viewState = 'login'; this.render(); }
            );
            return;
        }

        if (this.viewState === 'forgotPassword') {
            renderForgotPasswordView(
                this.appEl,
                async (email) => await api.requestPasswordReset(email),
                () => { this.viewState = 'login'; this.render(); }
            );
            return;
        }

        if (this.viewState === 'resetPasswordConfirm') {
            renderResetPasswordConfirmView(
                this.appEl,
                this.resetToken,
                async ({ token, newPassword }) => await api.confirmPasswordReset({ token, newPassword }),
                () => { this.resetToken = null; this.viewState = 'login'; this.render(); }
            );
            return;
        }

        // ── Main App Shell ─────────────────────────────────────────────────
        this.appEl.innerHTML = renderNavbar(this.currentPage, this.currentUser, this.mobileMenuOpen);
        this.attachShellListeners();
        await this.renderCurrentPage();
    }

    attachShellListeners() {
        // Nav buttons
        document.querySelectorAll('[data-page]').forEach(button => {
            button.addEventListener('click', () => {
                this.currentPage = button.dataset.page;
                this.mobileMenuOpen = false;
                this.render();
            });
        });

        // Profile icon click → go to profile page
        const userChip = document.querySelector('.user-chip');
        if (userChip) {
            userChip.style.cursor = 'pointer';
            userChip.addEventListener('click', () => {
                this.currentPage = 'profile';
                this.render();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('redNexusUser');
                localStorage.removeItem('redNexusToken');
                this.currentUser = null;
                this.viewState = 'login';
                this.render();
            });
        }

        // Mobile menu
        const mobileBtn = document.getElementById('mobileMenuButton');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                this.mobileMenuOpen = !this.mobileMenuOpen;
                this.render();
            });
        }

        const overlay = document.getElementById('mobileOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.mobileMenuOpen = false;
                this.render();
            });
        }
    }

    async renderCurrentPage() {
        const container = document.getElementById('pageContent');
        if (!container) return;

        const navigateTo = (page) => { this.currentPage = page; this.render(); };
        const role = this.currentUser?.role;

        switch (this.currentPage) {
            case 'dashboard':
                await renderDashboardPage(container, navigateTo, this.currentUser);
                break;

            case 'donors':
                await renderDonorsPage(container, this.currentUser);
                break;

            case 'inventory':
                // Only BankManager and Admin can access inventory
                if (role === 'BankManager' || role === 'Admin') {
                    await renderInventoryPage(container, this.currentUser);
                } else {
                    container.innerHTML = `<div class="page-body"><div class="empty-state">🔒 Inventory access is restricted to authorized Blood Bank accounts only.</div></div>`;
                }
                break;

            case 'requests':
                await renderRequestsPage(container, false, this.currentUser);
                break;

            case 'emergency':
                await renderRequestsPage(container, true, this.currentUser);
                break;

            case 'history':
                renderHistoryPage(container, this.currentUser);
                break;

            case 'profile':
                await renderProfilePage(container, this.currentUser);
                break;

            case 'reports':
                await renderReportsPage(container, this.currentUser);
                break;

            case 'admin':
                if (role === 'Admin') {
                    await renderAdminDashboard(container, this.currentUser);
                } else {
                    container.innerHTML = `<div class="page-body"><div class="empty-state">🔒 Access denied.</div></div>`;
                }
                break;

            case 'bank':
                if (role === 'BankManager' || role === 'Bank') {
                    await renderBankDashboard(container, this.currentUser, navigateTo);
                } else {
                    container.innerHTML = `<div class="page-body"><div class="empty-state">🔒 Access denied.</div></div>`;
                }
                break;

            default:
                await renderDashboardPage(container, navigateTo, this.currentUser);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
