import { renderLogo } from '../components/logo.js';
import { BLOOD_GROUPS } from '../config/constants.js';
import { validatePhone, validatePassword } from '../utils/validation.js';

// ── Shared helpers ───────────────────────────────────────────────────────────
function showError(id, message) {
    const el = document.getElementById(id);
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
}
function hideError(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
}
function showSuccess(id, message) {
    const el = document.getElementById(id);
    if (el) { el.textContent = message; el.classList.remove('hidden'); }
}

// Password show/hide toggle – call after innerHTML is set
function attachPasswordToggles(containerEl) {
    (containerEl || document).querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.textContent = show ? '🙈' : '👁';
            btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        });
    });
}

function pwField(id, label, required = true, placeholder = '') {
    return `
    <label>${label}${required ? ' *' : ''}
        <div class="pw-wrap">
            <input id="${id}" name="${id}" type="password" ${required ? 'required' : ''}
                   placeholder="${placeholder}" autocomplete="new-password">
            <button type="button" class="pw-toggle" data-target="${id}"
                    aria-label="Show password">👁</button>
        </div>
    </label>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════════════════════
export function renderLoginView(app, onLoginSuccess, onNavigateRegister, onNavigateAcceptorRegister, onNavigateForgotPassword, onNavigateBankRegister) {
    app.innerHTML = `
        <main class="auth-page">
          <section class="auth-visual">
            ${renderLogo(true)}
            <div class="visual-copy">
              <p class="eyebrow">CARE IN EVERY DROP</p>
              <h1>Be the reason<br><em>someone</em> lives.</h1>
              <p>
                Red Nexus connects generous donors with the people and communities
                who need them most.
              </p>
              <div class="impact-line">
                <span><strong>2,847</strong>active donors</span>
                <span><strong>98%</strong>match rate</span>
              </div>
            </div>
          </section>

          <section class="auth-panel">
            <div class="auth-box">
              <p class="eyebrow">WELCOME BACK</p>
              <h2>Sign in to your portal</h2>
              <p class="muted">Donors, Acceptors, Blood Banks &amp; Admins.</p>

              <form id="loginForm">
                <label>
                  Email address
                  <input id="loginEmail" type="email" required placeholder="you@example.com" autocomplete="username">
                </label>

                <label>
                  Password
                  <div class="pw-wrap">
                    <input id="loginPassword" type="password" required placeholder="Enter your password" autocomplete="current-password">
                    <button type="button" class="pw-toggle" data-target="loginPassword" aria-label="Show password">👁</button>
                  </div>
                </label>

                <div class="form-row">
                  <label class="check-label">
                    <input type="checkbox"> Remember me
                  </label>
                  <button type="button" class="text-button" id="forgotButton">Forgot password?</button>
                </div>

                <div id="loginError" class="form-error hidden"></div>

                <button class="primary-button full" type="submit">Sign in →</button>
              </form>

              <div class="divider"><span>New to Red Nexus?</span></div>

              <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
                <button class="outline-button full" id="registerButton">Register as Donor</button>
                <button class="outline-button full" id="registerAcceptorButton">Register as Acceptor</button>
              </div>
              <div style="margin-top:8px;">
                <button class="outline-button full" id="registerBankButton"
                        style="border-color:#ef4444;color:#ef4444;">
                  🏥 Register a Blood Bank
                </button>
              </div>

              <p class="demo-hint">Demo · demo@rednexus.org · nexus123</p>
            </div>
          </section>
        </main>
    `;

    attachPasswordToggles();

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError('loginError');
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true; btn.textContent = 'Signing in...';
        try {
            await onLoginSuccess(email, password);
        } catch (err) {
            showError('loginError', err.message || 'Invalid credentials.');
            btn.disabled = false; btn.textContent = 'Sign in →';
        }
    });

    document.getElementById('registerButton').addEventListener('click', onNavigateRegister);
    document.getElementById('registerAcceptorButton').addEventListener('click', onNavigateAcceptorRegister);
    document.getElementById('registerBankButton').addEventListener('click', () => {
        if (onNavigateBankRegister) onNavigateBankRegister();
    });
    document.getElementById('forgotButton').addEventListener('click', () => {
        if (onNavigateForgotPassword) onNavigateForgotPassword();
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  DONOR REGISTRATION
// ════════════════════════════════════════════════════════════════════════════
export function renderRegisterDonorView(app, onRegisterSuccess, onBackToLogin) {
    app.innerHTML = `
        <main class="register-page">
          <header class="simple-header">
            <button class="outline-button" id="backLogin">← Back</button>
            ${renderLogo()}
            <span class="muted">Secure donor registration</span>
          </header>

          <div class="register-content">
            <div class="register-intro">
              <p class="eyebrow">JOIN THE NEXUS</p>
              <h1>Become a donor.<br><em>Save a life.</em></h1>
              <p class="muted">Your information helps our team make safe, timely matches.</p>
            </div>

            <form class="registration-form" id="registrationForm">
              <section class="form-section">
                <div class="section-heading"><span>01</span><div><h3>Personal details</h3><p>Tell us a little about yourself</p></div></div>
                <div class="form-grid">
                  <label>Full name *<input name="name" required></label>
                  <label>Date of birth *<input name="dob" type="date" required></label>
                  <label>Email address *<input name="email" type="email" required autocomplete="email"></label>
                  <label>Mobile number * (10 digits)
                    <input name="mobile" type="tel" placeholder="e.g. 9876543210" required>
                  </label>
                  <label>Gender
                    <select name="gender">
                      <option value="">Select gender</option>
                      <option>Female</option><option>Male</option>
                      <option>Non-binary</option><option>Prefer not to say</option>
                    </select>
                  </label>
                  <label>Blood group *
                    <select name="blood" required>
                      <option value="">Select blood group</option>
                      ${BLOOD_GROUPS.map(g => `<option>${g}</option>`).join('')}
                    </select>
                  </label>
                  <label>Address<input name="address"></label>
                  <label>City<input name="city"></label>
                  <label>State<input name="state"></label>
                  <label>PIN code<input name="pin"></label>
                </div>
              </section>

              <section class="form-section">
                <div class="section-heading"><span>02</span><div><h3>Donor details</h3><p>Donation history and preferences</p></div></div>
                <div class="form-grid">
                  <label>Last donation date<input name="last" type="date"></label>
                  <label>Previous donations<input name="previous" type="number" min="0"></label>
                  <label>Preferred location<input name="location"></label>
                </div>
                <label class="check-label" style="margin-top:12px;">
                  <input type="checkbox" name="share_contact" value="1">
                  Allow other users to see my contact number in the donor directory
                </label>
              </section>

              <section class="form-section">
                <div class="section-heading"><span>03</span><div><h3>Health &amp; eligibility</h3><p>Help us keep every donation safe</p></div></div>
                <div class="form-grid">
                  <label>Weight in kg<input name="weight" type="number" min="30"></label>
                  <label>Current illness<input name="illness"></label>
                  <label>Medication<input name="medication"></label>
                  <label>Emergency contact name<input name="emergencyName"></label>
                  <label>Emergency contact (10 digits)<input name="emergencyNumber" type="tel" placeholder="10-digit number"></label>
                </div>
                <label>Previous donation history<textarea name="history"></textarea></label>
              </section>

              <section class="form-section">
                <div class="section-heading"><span>04</span><div><h3>Secure your account</h3><p>Must contain Upper, Lower, Number &amp; Special character</p></div></div>
                <div class="form-grid">
                  ${pwField('donorPassword', 'Password')}
                  ${pwField('donorConfirm', 'Confirm password')}
                </div>
                <label class="check-label" style="margin-top:10px;">
                  <input type="checkbox" name="terms" required>
                  I agree to the Red Nexus terms and privacy policy.
                </label>
              </section>

              <div id="registerError" class="form-error hidden"></div>

              <div class="form-actions">
                <button type="reset" class="text-button">Reset form</button>
                <button type="submit" class="primary-button">Complete registration →</button>
              </div>
            </form>
          </div>
        </main>
    `;

    attachPasswordToggles();
    document.getElementById('backLogin').addEventListener('click', onBackToLogin);

    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const values = Object.fromEntries(form.entries());
        values.share_contact = form.get('share_contact') === '1' ? 1 : 0;
        values.password = document.getElementById('donorPassword').value;
        values.confirm  = document.getElementById('donorConfirm').value;

        if (!validatePhone(values.mobile)) {
            showError('registerError', 'Mobile number must be exactly 10 digits.'); return;
        }
        if (values.emergencyNumber && !validatePhone(values.emergencyNumber)) {
            showError('registerError', 'Emergency contact must be exactly 10 digits.'); return;
        }
        const pwdCheck = validatePassword(values.password);
        if (!pwdCheck.valid) { showError('registerError', pwdCheck.message); return; }
        if (values.password !== values.confirm) { showError('registerError', 'Passwords do not match.'); return; }
        if (!form.get('terms')) { showError('registerError', 'You must accept the terms.'); return; }

        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true; btn.textContent = 'Registering...';
        try {
            await onRegisterSuccess(values);
        } catch (err) {
            showError('registerError', err.message || 'Registration failed.');
            btn.disabled = false; btn.textContent = 'Complete registration →';
        }
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  ACCEPTOR REGISTRATION
// ════════════════════════════════════════════════════════════════════════════
export function renderRegisterAcceptorView(app, onRegisterAcceptorSuccess, onBackToLogin) {
    app.innerHTML = `
        <main class="register-page">
          <header class="simple-header">
            <button class="outline-button" id="backLogin">← Back</button>
            ${renderLogo()}
            <span class="muted">Patient / Acceptor registration</span>
          </header>

          <div class="register-content">
            <div class="register-intro">
              <p class="eyebrow">PATIENT &amp; RECIPIENT PORTAL</p>
              <h1>Register as an acceptor.<br><em>Get immediate care.</em></h1>
              <p class="muted">Create an account to submit blood requests and track matching status.</p>
            </div>

            <form class="registration-form" id="acceptorRegistrationForm">
              <section class="form-section">
                <div class="section-heading"><span>01</span><div><h3>Personal details</h3><p>Tell us about the patient or guardian</p></div></div>
                <div class="form-grid">
                  <label>Full name *<input name="name" required></label>
                  <label>Date of birth *<input name="dob" type="date" required></label>
                  <label>Email address *<input name="email" type="email" required autocomplete="email"></label>
                  <label>Mobile number * (10 digits)<input name="mobile" type="tel" placeholder="e.g. 9876543210" required></label>
                  <label>Gender
                    <select name="gender">
                      <option value="">Select gender</option>
                      <option>Female</option><option>Male</option>
                      <option>Non-binary</option><option>Prefer not to say</option>
                    </select>
                  </label>
                  <label>Required blood group *
                    <select name="blood" required>
                      <option value="">Select blood group</option>
                      ${BLOOD_GROUPS.map(g => `<option>${g}</option>`).join('')}
                    </select>
                  </label>
                  <label>Address<input name="address"></label>
                  <label>City<input name="city"></label>
                  <label>State<input name="state"></label>
                  <label>PIN code<input name="pin"></label>
                </div>
              </section>

              <section class="form-section">
                <div class="section-heading"><span>02</span><div><h3>Hospital &amp; Medical details</h3><p>Where the blood needs to be delivered</p></div></div>
                <div class="form-grid">
                  <label>Hospital name *<input name="hospital" required></label>
                  <label>Attending doctor name<input name="doctor"></label>
                  <label>Required units *<input name="units" type="number" min="1" value="1" required></label>
                  <label>Urgency level
                    <select name="level">
                      <option>Routine</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </label>
                </div>
                <label>Medical condition / Reason
                  <textarea name="condition" placeholder="Describe the medical requirement..."></textarea>
                </label>
              </section>

              <section class="form-section">
                <div class="section-heading"><span>03</span><div><h3>Secure your account</h3><p>Must contain Upper, Lower, Number &amp; Special character</p></div></div>
                <div class="form-grid">
                  ${pwField('acceptorPassword', 'Password')}
                  ${pwField('acceptorConfirm', 'Confirm password')}
                </div>
                <label class="check-label" style="margin-top:10px;">
                  <input type="checkbox" name="terms" required>
                  I agree to the Red Nexus terms and privacy policy.
                </label>
              </section>

              <div id="acceptorRegisterError" class="form-error hidden"></div>

              <div class="form-actions">
                <button type="reset" class="text-button">Reset form</button>
                <button type="submit" class="primary-button">Complete acceptor registration →</button>
              </div>
            </form>
          </div>
        </main>
    `;

    attachPasswordToggles();
    document.getElementById('backLogin').addEventListener('click', onBackToLogin);

    document.getElementById('acceptorRegistrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const values = Object.fromEntries(form.entries());
        values.password = document.getElementById('acceptorPassword').value;
        values.confirm  = document.getElementById('acceptorConfirm').value;

        if (!validatePhone(values.mobile)) {
            showError('acceptorRegisterError', 'Mobile number must be exactly 10 digits.'); return;
        }
        const pwdCheck = validatePassword(values.password);
        if (!pwdCheck.valid) { showError('acceptorRegisterError', pwdCheck.message); return; }
        if (values.password !== values.confirm) { showError('acceptorRegisterError', 'Passwords do not match.'); return; }
        if (!form.get('terms')) { showError('acceptorRegisterError', 'You must accept the terms.'); return; }

        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true; btn.textContent = 'Registering...';
        try {
            await onRegisterAcceptorSuccess(values);
        } catch (err) {
            showError('acceptorRegisterError', err.message || 'Registration failed.');
            btn.disabled = false; btn.textContent = 'Complete acceptor registration →';
        }
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  BLOOD BANK REGISTRATION
// ════════════════════════════════════════════════════════════════════════════
export function renderRegisterBankView(app, onRegisterBankSuccess, onBackToLogin) {
    app.innerHTML = `
        <main class="register-page">
          <header class="simple-header">
            <button class="outline-button" id="backLogin">← Back</button>
            ${renderLogo()}
            <span class="muted">Blood Bank Registration</span>
          </header>

          <div class="register-content">
            <div class="register-intro">
              <p class="eyebrow">BLOOD BANK PORTAL</p>
              <h1>Register your<br><em>Blood Bank.</em></h1>
              <p class="muted">
                Create a blood bank account. After admin approval you can manage your inventory and respond to requests.
              </p>
            </div>

            <form class="registration-form" id="bankRegistrationForm">
              <section class="form-section">
                <div class="section-heading"><span>01</span><div><h3>Blood bank details</h3><p>Official blood bank information</p></div></div>
                <div class="form-grid">
                  <label>Blood bank name *<input name="name" required placeholder="e.g. City Blood Center"></label>
                  <label>Registration / License number<input name="reg_number" placeholder="Optional"></label>
                  <label>Address<input name="address"></label>
                  <label>City<input name="city"></label>
                </div>
              </section>

              <section class="form-section">
                <div class="section-heading"><span>02</span><div><h3>Authorized contact person</h3><p>Person responsible for this account</p></div></div>
                <div class="form-grid">
                  <label>Contact person name *<input name="manager_name" required placeholder="Full name"></label>
                  <label>Official email address *<input name="email" type="email" required autocomplete="email"></label>
                  <label>Phone number * (10 digits)<input name="phone" type="tel" placeholder="10-digit number" required></label>
                </div>
              </section>

              <section class="form-section">
                <div class="section-heading"><span>03</span><div><h3>Secure your account</h3><p>Must contain Upper, Lower, Number &amp; Special character</p></div></div>
                <div class="form-grid">
                  ${pwField('bankPassword', 'Password')}
                  ${pwField('bankConfirm', 'Confirm password')}
                </div>
                <label class="check-label" style="margin-top:10px;">
                  <input type="checkbox" name="terms" required>
                  I agree to the Red Nexus terms and conditions for blood banks.
                </label>
              </section>

              <div id="bankRegisterError" class="form-error hidden"></div>
              <div id="bankRegisterSuccess" class="form-success hidden"></div>

              <div class="form-actions">
                <button type="reset" class="text-button">Reset form</button>
                <button type="submit" class="primary-button" id="bankSubmitBtn">Submit for approval →</button>
              </div>
            </form>
          </div>
        </main>
    `;

    attachPasswordToggles();
    document.getElementById('backLogin').addEventListener('click', onBackToLogin);

    document.getElementById('bankRegistrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError('bankRegisterError');
        const form = new FormData(e.target);
        const values = Object.fromEntries(form.entries());
        values.password = document.getElementById('bankPassword').value;
        values.confirm  = document.getElementById('bankConfirm').value;

        if (!validatePhone(values.phone)) {
            showError('bankRegisterError', 'Phone number must be exactly 10 digits.'); return;
        }
        const pwdCheck = validatePassword(values.password);
        if (!pwdCheck.valid) { showError('bankRegisterError', pwdCheck.message); return; }
        if (values.password !== values.confirm) { showError('bankRegisterError', 'Passwords do not match.'); return; }
        if (!form.get('terms')) { showError('bankRegisterError', 'You must accept the terms.'); return; }

        const btn = document.getElementById('bankSubmitBtn');
        btn.disabled = true; btn.textContent = 'Submitting...';
        try {
            await onRegisterBankSuccess(values);
            showSuccess('bankRegisterSuccess',
                '✅ Your blood bank registration has been submitted! An admin will review and approve your account. You can login once approved.'
            );
            btn.textContent = 'Submitted ✓';
        } catch (err) {
            showError('bankRegisterError', err.message || 'Registration failed.');
            btn.disabled = false; btn.textContent = 'Submit for approval →';
        }
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  FORGOT PASSWORD
// ════════════════════════════════════════════════════════════════════════════
export function renderForgotPasswordView(app, onRequestReset, onBackToLogin) {
    app.innerHTML = `
        <main class="register-page">
          <header class="simple-header">
            <button class="outline-button" id="backLogin">← Back to Sign In</button>
            ${renderLogo()}
            <span class="muted">Account Recovery</span>
          </header>

          <div class="register-content" style="max-width:620px;">
            <div class="register-intro">
              <p class="eyebrow">PASSWORD RESET VIA EMAIL</p>
              <h1>Forgot password?<br><em>We'll email you a link.</em></h1>
              <p class="muted">
                Enter your registered email address. A secure one-time reset link will be sent to your inbox.
              </p>
            </div>

            <form class="registration-form" id="forgotPasswordForm">
              <section class="form-section">
                <div class="section-heading"><span>01</span><div><h3>Account verification</h3><p>Enter your registered email address</p></div></div>
                <div class="form-grid" style="grid-template-columns:1fr;">
                  <label>Registered email *
                    <input id="resetEmail" name="email" type="email" required placeholder="you@example.com" autocomplete="email">
                  </label>
                </div>
              </section>

              <div id="resetError" class="form-error hidden" style="margin:20px 40px 0;"></div>
              <div id="resetSuccess" class="form-success hidden" style="margin:20px 40px 0;"></div>

              <div class="form-actions">
                <button type="button" class="text-button" id="cancelReset">Cancel</button>
                <button type="submit" class="primary-button" id="submitResetBtn">Send reset link →</button>
              </div>
            </form>
          </div>
        </main>
    `;

    document.getElementById('backLogin').addEventListener('click', onBackToLogin);
    document.getElementById('cancelReset').addEventListener('click', onBackToLogin);

    document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value.trim();
        hideError('resetError'); hideError('resetSuccess');

        const btn = document.getElementById('submitResetBtn');
        btn.disabled = true; btn.textContent = 'Sending…';

        try {
            const res = await onRequestReset(email);
            showSuccess('resetSuccess', res?.message || `Reset link sent to ${email}. Check your inbox.`);
            btn.textContent = 'Email sent ✓';
        } catch (err) {
            btn.disabled = false; btn.textContent = 'Send reset link →';
            showError('resetError', err.message || 'Unable to send reset email. Please check your email address.');
        }
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  RESET PASSWORD CONFIRM
// ════════════════════════════════════════════════════════════════════════════
export function renderResetPasswordConfirmView(app, token, onConfirmReset, onBackToLogin) {
    app.innerHTML = `
        <main class="register-page">
          <header class="simple-header">
            <button class="outline-button" id="backLogin">← Back to Sign In</button>
            ${renderLogo()}
            <span class="muted">Secure Password Change</span>
          </header>

          <div class="register-content" style="max-width:620px;">
            <div class="register-intro">
              <p class="eyebrow">VERIFIED EMAIL LINK</p>
              <h1>Choose a new password.<br><em>Regain instant access.</em></h1>
              <p class="muted">Enter and confirm your new password below.</p>
            </div>

            <form class="registration-form" id="confirmPasswordForm">
              <section class="form-section">
                <div class="section-heading"><span>01</span><div><h3>New password</h3><p>Minimum 8 characters with Upper, Lower, Number &amp; Special character</p></div></div>
                <div class="form-grid">
                  ${pwField('newPassword', 'New password', true, 'Enter new password')}
                  ${pwField('confirmPassword', 'Confirm new password', true, 'Confirm new password')}
                </div>
              </section>

              <div id="confirmError" class="form-error hidden" style="margin:20px 40px 0;"></div>
              <div id="confirmSuccess" class="form-success hidden" style="margin:20px 40px 0;"></div>

              <div class="form-actions">
                <button type="button" class="text-button" id="cancelConfirm">Cancel</button>
                <button type="submit" class="primary-button" id="submitConfirmBtn">Update password &amp; Sign In →</button>
              </div>
            </form>
          </div>
        </main>
    `;

    attachPasswordToggles();
    document.getElementById('backLogin').addEventListener('click', onBackToLogin);
    document.getElementById('cancelConfirm').addEventListener('click', onBackToLogin);

    document.getElementById('confirmPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        hideError('confirmError'); hideError('confirmSuccess');

        const pwdCheck = validatePassword(newPassword);
        if (!pwdCheck.valid) { showError('confirmError', pwdCheck.message); return; }
        if (newPassword !== confirmPassword) { showError('confirmError', 'Passwords do not match.'); return; }

        const btn = document.getElementById('submitConfirmBtn');
        btn.disabled = true; btn.textContent = 'Updating…';

        try {
            await onConfirmReset({ token, newPassword });
            showSuccess('confirmSuccess', '✅ Password updated! Redirecting you to sign in…');
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => onBackToLogin(), 1800);
        } catch (err) {
            btn.disabled = false; btn.textContent = 'Update password & Sign In →';
            showError('confirmError', err.message || 'Failed to update password. Link may be invalid or expired.');
        }
    });
}
