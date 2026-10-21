import { renderNavbar } from './components/navbar.js';
import { renderLoginView, renderRegisterDonorView, renderRegisterAcceptorView, renderForgotPasswordView, renderResetPasswordConfirmView } from './pages/auth.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderDonorsPage } from './pages/donors.js';
import { renderInventoryPage } from './pages/inventory.js';
import { renderRequestsPage } from './pages/requests.js';
import { renderHistoryPage } from './pages/history.js';
import { renderProfilePage } from './pages/profile.js';
import { renderReportsPage } from './pages/reports.js';
import { api } from './services/api.js';

class App {
    constructor() {
        this.appEl = document.getElementById("app");
        this.currentUser = JSON.parse(localStorage.getItem("redNexusUser")) || null;
        this.currentPage = "dashboard";
        this.viewState = "app"; // "login", "register", "registerAcceptor", "forgotPassword", "resetPasswordConfirm", "app"
        this.mobileMenuOpen = false;

        const urlParams = new URLSearchParams(window.location.search);
        const queryToken = urlParams.get('token');
        const hashMatch = window.location.hash.match(/token=([^&]+)/);
        const resetToken = queryToken || (hashMatch ? hashMatch[1] : null);

        this.resetToken = resetToken;
        if (resetToken) {
            this.viewState = "resetPasswordConfirm";
        } else if (!this.currentUser) {
            this.viewState = "login";
        }
    }

    init() {
        window.addEventListener('hashchange', () => {
            const hashMatch = window.location.hash.match(/token=([^&]+)/);
            if (hashMatch) {
                this.resetToken = hashMatch[1];
                this.viewState = "resetPasswordConfirm";
                this.render();
            }
        });
        this.render();
    }

    async render() {
        if (this.viewState === "login") {
            renderLoginView(
                this.appEl,
                async (email, password) => {
                    const user = await api.login(email, password);
                    this.currentUser = user;
                    localStorage.setItem("redNexusUser", JSON.stringify(user));
                    this.viewState = "app";
                    this.currentPage = "dashboard";
                    this.render();
                },
                () => {
                    this.viewState = "register";
                    this.render();
                },
                () => {
                    this.viewState = "registerAcceptor";
                    this.render();
                },
                () => {
                    this.viewState = "forgotPassword";
                    this.render();
                }
            );
            return;
        }

        if (this.viewState === "forgotPassword") {
            renderForgotPasswordView(
                this.appEl,
                async (email) => {
                    return await api.requestPasswordReset(email);
                },
                () => {
                    this.viewState = "login";
                    this.render();
                }
            );
            return;
        }

        if (this.viewState === "resetPasswordConfirm") {
            renderResetPasswordConfirmView(
                this.appEl,
                this.resetToken,
                async ({ token, newPassword }) => {
                    return await api.confirmPasswordReset({ token, newPassword });
                },
                () => {
                    this.resetToken = null;
                    this.viewState = "login";
                    this.render();
                }
            );
            return;
        }

        if (this.viewState === "register") {
            renderRegisterDonorView(
                this.appEl,
                async (donorData) => {
                    const user = await api.registerDonor(donorData);
                    this.currentUser = user;
                    localStorage.setItem("redNexusUser", JSON.stringify(user));
                    this.viewState = "app";
                    this.currentPage = "dashboard";
                    this.render();
                },
                () => {
                    this.viewState = "login";
                    this.render();
                }
            );
            return;
        }

        if (this.viewState === "registerAcceptor") {
            renderRegisterAcceptorView(
                this.appEl,
                async (acceptorData) => {
                    const user = await api.registerAcceptor(acceptorData);
                    this.currentUser = user;
                    localStorage.setItem("redNexusUser", JSON.stringify(user));
                    this.viewState = "app";
                    this.currentPage = "requests";
                    this.render();
                },
                () => {
                    this.viewState = "login";
                    this.render();
                }
            );
            return;
        }

        // Main App Shell
        this.appEl.innerHTML = renderNavbar(this.currentPage, this.currentUser, this.mobileMenuOpen);
        this.attachShellListeners();
        await this.renderCurrentPage();
    }

    attachShellListeners() {
        document.querySelectorAll("[data-page]").forEach(button => {
            button.addEventListener("click", () => {
                this.currentPage = button.dataset.page;
                this.mobileMenuOpen = false;
                this.render();
            });
        });

        const logoutBtn = document.getElementById("logoutButton");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("redNexusUser");
                localStorage.removeItem("redNexusToken");
                this.currentUser = null;
                this.viewState = "login";
                this.render();
            });
        }

        const mobileBtn = document.getElementById("mobileMenuButton");
        if (mobileBtn) {
            mobileBtn.addEventListener("click", () => {
                this.mobileMenuOpen = !this.mobileMenuOpen;
                this.render();
            });
        }

        const mobileOverlay = document.getElementById("mobileOverlay");
        if (mobileOverlay) {
            mobileOverlay.addEventListener("click", () => {
                this.mobileMenuOpen = false;
                this.render();
            });
        }
    }

    async renderCurrentPage() {
        const container = document.getElementById("pageContent");
        if (!container) return;

        const navigateTo = (page) => {
            this.currentPage = page;
            this.render();
        };

        switch (this.currentPage) {
            case "dashboard":
                await renderDashboardPage(container, navigateTo);
                break;
            case "donors":
                await renderDonorsPage(container);
                break;
            case "inventory":
                await renderInventoryPage(container);
                break;
            case "requests":
                await renderRequestsPage(container, false);
                break;
            case "emergency":
                await renderRequestsPage(container, true);
                break;
            case "history":
                renderHistoryPage(container, this.currentUser);
                break;
            case "profile":
                renderProfilePage(container, this.currentUser);
                break;
            case "reports":
                await renderReportsPage(container);
                break;
            default:
                await renderDashboardPage(container, navigateTo);
                break;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    app.init();
});
