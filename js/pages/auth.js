import { renderLogo } from '../components/logo.js';
import { BLOOD_GROUPS } from '../config/constants.js';
import { validatePhone, validatePassword } from '../utils/validation.js';

export function renderLoginView(app, onLoginSuccess, onNavigateRegister, onNavigateAcceptorRegister, onNavigateForgotPassword) {
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
              <p class="muted">Manage your donations and make an impact.</p> 
 
              <form id="loginForm"> 
                <label> 
                  Email or username 
                  <input id="loginEmail" type="text" required placeholder="you@example.com"> 
                </label> 
 
                <label> 
                  Password 
                  <input id="loginPassword" type="password" required placeholder="Enter your password"> 
                </label> 
 
                <div class="form-row"> 
                  <label class="check-label"> 
                    <input type="checkbox"> Remember me 
                  </label> 
                  <button type="button" class="text-button" id="forgotButton"> 
                    Forgot password? 
                  </button> 
                </div> 
 
                <div id="loginError" class="form-error hidden"></div> 
 
                <button class="primary-button full" type="submit"> 
                  Sign in → 
                </button> 
              </form> 
 
              <div class="divider"> 
                <span>New to Red Nexus?</span> 
              </div> 
 
              <div style="display: flex; gap: 10px; margin-top: 10px;"> 
                <button class="outline-button full" id="registerButton">Register as donor</button> 
                <button class="outline-button full" id="registerAcceptorButton">Register as acceptor</button> 
              </div> 
 
              <p class="demo-hint"> 
                Demo access · demo@rednexus.org · nexus123 
              </p> 
            </div> 
          </section> 
        </main> 
    `;

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();
        try {
            await onLoginSuccess(email, password);
        } catch (err) {
            showError("loginError", err.message || "Invalid credentials.");
        }
    });

    document.getElementById("registerButton").addEventListener("click", onNavigateRegister);
    document.getElementById("registerAcceptorButton").addEventListener("click", onNavigateAcceptorRegister);
    document.getElementById("forgotButton").addEventListener("click", () => {
        if (onNavigateForgotPassword) {
            onNavigateForgotPassword();
        } else {
            showError("loginError", "Password reset instructions have been sent to your coordinator.");
        }
    });
}

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
              <p class="muted"> 
                Your information helps our team make safe, timely matches. 
              </p> 
            </div> 
 
            <form class="registration-form" id="registrationForm"> 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>01</span> 
                  <div> 
                    <h3>Personal details</h3> 
                    <p>Tell us a little about yourself</p> 
                  </div> 
                </div> 
 
                <div class="form-grid"> 
                  <label>Full name *<input name="name" required></label> 
                  <label>Date of birth *<input name="dob" type="date" required></label> 
                  <label>Email address *<input name="email" type="email" required></label> 
                  <label>Mobile number * (10 digits)
                    <input name="mobile" type="tel" placeholder="10-digit number e.g. 9876543210" required>
                  </label> 
                  <label>Gender 
                    <select name="gender"> 
                      <option value="">Select gender</option> 
                      <option>Female</option> 
                      <option>Male</option> 
                      <option>Non-binary</option> 
                      <option>Prefer not to say</option> 
                    </select> 
                  </label> 
                  <label>Blood group * 
                    <select name="blood" required> 
                      <option value="">Select blood group</option> 
                      ${BLOOD_GROUPS.map(group => `<option>${group}</option>`).join("")} 
                    </select> 
                  </label> 
                  <label>Address<input name="address"></label> 
                  <label>City<input name="city"></label> 
                  <label>State<input name="state"></label> 
                  <label>PIN code<input name="pin"></label> 
                </div> 
              </section> 
 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>02</span> 
                  <div> 
                    <h3>Donor details</h3> 
                    <p>Your donation history and preferences</p> 
                  </div> 
                </div> 
 
                <div class="form-grid"> 
                  <label>Last donation date<input name="last" type="date"></label> 
                  <label>Previous donations<input name="previous" type="number" min="0"></label> 
                  <label>Preferred location<input name="location"></label> 
                </div> 
              </section> 
 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>03</span> 
                  <div> 
                    <h3>Health & eligibility</h3> 
                    <p>Help us keep every donation safe</p> 
                  </div> 
                </div> 
 
                <div class="form-grid"> 
                  <label>Weight in kg<input name="weight" type="number" min="30"></label> 
                  <label>Current illness<input name="illness"></label> 
                  <label>Medication<input name="medication"></label> 
                  <label>Emergency contact name<input name="emergencyName"></label> 
                  <label>Emergency contact number (10 digits)<input name="emergencyNumber" type="tel" placeholder="10-digit number"></label> 
                </div> 
 
                <label> 
                  Previous donation history 
                  <textarea name="history"></textarea> 
                </label> 
              </section> 
 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>04</span> 
                  <div> 
                    <h3>Secure your account</h3> 
                    <p>Set up your private donor access (Must contain Upper, Lower, Number & Special Char)</p> 
                  </div> 
                </div> 
 
                <div class="form-grid"> 
                  <label>Password *<input name="password" type="password" required></label> 
                  <label>Confirm password *<input name="confirm" type="password" required></label> 
                </div> 
 
                <label class="check-label"> 
                  <input type="checkbox" name="terms" required> 
                  I agree to the Red Nexus terms and privacy policy. 
                </label> 
              </section> 
 
              <div id="registerError" class="form-error hidden"></div> 
 
              <div class="form-actions"> 
                <button type="reset" class="text-button">Reset form</button> 
                <button type="submit" class="primary-button"> 
                  Complete registration → 
                </button> 
              </div> 
            </form> 
          </div> 
        </main> 
    `;

    document.getElementById("backLogin").addEventListener("click", onBackToLogin);
    document.getElementById("registrationForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const values = Object.fromEntries(form.entries());

        // Validate 10-digit mobile number
        if (!validatePhone(values.mobile)) {
            showError("registerError", "Mobile number must be exactly 10 digits (numbers 0-9 only).");
            return;
        }

        if (values.emergencyNumber && !validatePhone(values.emergencyNumber)) {
            showError("registerError", "Emergency contact number must be exactly 10 digits.");
            return;
        }

        // Validate password rules
        const pwdCheck = validatePassword(values.password);
        if (!pwdCheck.valid) {
            showError("registerError", pwdCheck.message);
            return;
        }

        if (values.password !== values.confirm) {
            showError("registerError", "Passwords do not match.");
            return;
        }

        if (!form.get("terms")) {
            showError("registerError", "You must accept the terms and privacy policy.");
            return;
        }

        try {
            await onRegisterSuccess(values);
        } catch (err) {
            showError("registerError", err.message || "Registration failed.");
        }
    });
}

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
              <p class="eyebrow">PATIENT & RECIPIENT PORTAL</p> 
              <h1>Register as an acceptor.<br><em>Get immediate care.</em></h1> 
              <p class="muted"> 
                Create an account to submit blood requests and track matching status. 
              </p> 
            </div> 
 
            <form class="registration-form" id="acceptorRegistrationForm"> 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>01</span> 
                  <div> 
                    <h3>Personal details</h3> 
                    <p>Tell us about the patient or guardian</p> 
                  </div> 
                </div> 
 
                <div class="form-grid"> 
                  <label>Full name *<input name="name" required></label> 
                  <label>Date of birth *<input name="dob" type="date" required></label> 
                  <label>Email address *<input name="email" type="email" required></label> 
                  <label>Mobile number * (10 digits)<input name="mobile" type="tel" placeholder="10-digit number e.g. 9876543210" required></label> 
                  <label>Gender 
                    <select name="gender"> 
                      <option value="">Select gender</option> 
                      <option>Female</option> 
                      <option>Male</option> 
                      <option>Non-binary</option> 
                      <option>Prefer not to say</option> 
                    </select> 
                  </label> 
                  <label>Required blood group * 
                    <select name="blood" required> 
                      <option value="">Select blood group</option> 
                      ${BLOOD_GROUPS.map(group => `<option>${group}</option>`).join("")} 
                    </select> 
                  </label> 
                  <label>Address<input name="address"></label> 
                  <label>City<input name="city"></label> 
                  <label>State<input name="state"></label> 
                  <label>PIN code<input name="pin"></label> 
                </div> 
              </section> 
 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>02</span> 
                  <div> 
                    <h3>Hospital & Medical details</h3> 
                    <p>Where the blood needs to be delivered</p> 
                  </div> 
                </div> 
 
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
 
                <label> 
                  Medical condition / Reason for request 
                  <textarea name="condition" placeholder="Describe the medical requirement..."></textarea> 
                </label> 
              </section> 
 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>03</span> 
                  <div> 
                    <h3>Secure your account</h3> 
                    <p>Set up your private access (Must contain Upper, Lower, Number & Special Char)</p> 
                  </div> 
                </div> 
 
                <div class="form-grid"> 
                  <label>Password *<input name="password" type="password" required></label> 
                  <label>Confirm password *<input name="confirm" type="password" required></label> 
                </div> 
 
                <label class="check-label"> 
                  <input type="checkbox" name="terms" required> 
                  I agree to the Red Nexus terms and privacy policy. 
                </label> 
              </section> 
 
              <div id="acceptorRegisterError" class="form-error hidden"></div> 
 
              <div class="form-actions"> 
                <button type="reset" class="text-button">Reset form</button> 
                <button type="submit" class="primary-button"> 
                  Complete acceptor registration → 
                </button> 
              </div> 
            </form> 
          </div> 
        </main> 
    `;

    document.getElementById("backLogin").addEventListener("click", onBackToLogin);
    document.getElementById("acceptorRegistrationForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const values = Object.fromEntries(form.entries());

        if (!validatePhone(values.mobile)) {
            showError("acceptorRegisterError", "Mobile number must be exactly 10 digits (numbers 0-9 only).");
            return;
        }

        const pwdCheck = validatePassword(values.password);
        if (!pwdCheck.valid) {
            showError("acceptorRegisterError", pwdCheck.message);
            return;
        }

        if (values.password !== values.confirm) {
            showError("acceptorRegisterError", "Passwords do not match.");
            return;
        }

        try {
            await onRegisterAcceptorSuccess(values);
        } catch (err) {
            showError("acceptorRegisterError", err.message || "Registration failed.");
        }
    });
}

function showError(id, message) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.classList.remove("hidden");
    }
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = "";
        el.classList.add("hidden");
    }
}

export function renderForgotPasswordView(app, onRequestReset, onBackToLogin) {
    app.innerHTML = ` 
        <main class="register-page"> 
          <header class="simple-header"> 
            <button class="outline-button" id="backLogin">← Back to Sign In</button> 
            ${renderLogo()} 
            <span class="muted">Account Recovery</span> 
          </header> 
 
          <div class="register-content" style="max-width: 620px;"> 
            <div class="register-intro"> 
              <p class="eyebrow">PASSWORD RESET VIA EMAIL</p> 
              <h1>Forgot password?<br><em>We'll email you a link.</em></h1> 
              <p class="muted"> 
                Enter your registered donor or acceptor email address. We will send you an email with a secure link attached to change your password.
              </p> 
            </div> 
 
            <form class="registration-form" id="forgotPasswordForm"> 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>01</span> 
                  <div> 
                    <h3>Account verification</h3> 
                    <p>Enter your registered email address or 10-digit mobile number</p> 
                  </div> 
                </div> 
 
                <div class="form-grid" style="grid-template-columns: 1fr;"> 
                  <label>Registered email or mobile number * 
                    <input id="resetEmail" name="email" type="text" required placeholder="e.g. your_email@gmail.com or 10-digit mobile number"> 
                  </label> 
                </div> 
              </section> 
 
              <div id="resetError" class="form-error hidden" style="margin: 20px 40px 0;"></div> 
              <div id="resetSuccess" class="form-success hidden" style="margin: 20px 40px 0;"></div> 
              <div id="devLinkContainer" class="hidden" style="margin: 15px 40px 0;"></div>
 
              <div class="form-actions"> 
                <button type="button" class="text-button" id="cancelReset">Cancel</button> 
                <button type="submit" class="primary-button" id="submitResetBtn"> 
                  Send reset link → 
                </button> 
              </div> 
            </form> 
          </div> 
        </main> 
    `;

    document.getElementById("backLogin").addEventListener("click", onBackToLogin);
    document.getElementById("cancelReset").addEventListener("click", onBackToLogin);

    document.getElementById("forgotPasswordForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("resetEmail").value.trim();

        hideError("resetError");
        hideError("resetSuccess");
        const devContainer = document.getElementById("devLinkContainer");
        if (devContainer) devContainer.classList.add("hidden");

        const submitBtn = document.getElementById("submitResetBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending email...";

        try {
            const res = await onRequestReset(email);
            const successEl = document.getElementById("resetSuccess");
            if (successEl) {
                successEl.textContent = res?.message || `A password reset link has been sent to ${email}. Please check your inbox!`;
                successEl.classList.remove("hidden");
            }

            if (res?.resetUrl && devContainer) {
                devContainer.innerHTML = `
                    <div style="padding: 14px 18px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 13px;">
                        <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Development Mode Preview:</strong>
                        <span style="color: #64748b;">An email was dispatched. You can also test the attached link immediately:</span><br>
                        <a href="${res.resetUrl}" style="color: #ef4444; font-weight: 600; text-decoration: underline; word-break: break-all; display: inline-block; margin-top: 8px;">
                            Click here to open Password Reset page →
                        </a>
                    </div>
                `;
                devContainer.classList.remove("hidden");
            }

            submitBtn.textContent = "Email sent ✓";
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Send reset link →";
            showError("resetError", err.message || "Unable to send reset email. Please verify your email address.");
        }
    });
}

export function renderResetPasswordConfirmView(app, token, onConfirmReset, onBackToLogin) {
    app.innerHTML = ` 
        <main class="register-page"> 
          <header class="simple-header"> 
            <button class="outline-button" id="backLogin">← Back to Sign In</button> 
            ${renderLogo()} 
            <span class="muted">Secure Password Change</span> 
          </header> 
 
          <div class="register-content" style="max-width: 620px;"> 
            <div class="register-intro"> 
              <p class="eyebrow">VERIFIED EMAIL LINK</p> 
              <h1>Choose a new password.<br><em>Regain instant access.</em></h1> 
              <p class="muted"> 
                Your email reset link has been verified. Enter your new password below to update your account.
              </p> 
            </div> 
 
            <form class="registration-form" id="confirmPasswordForm"> 
              <section class="form-section"> 
                <div class="section-heading"> 
                  <span>01</span> 
                  <div> 
                    <h3>New password</h3> 
                    <p>Must contain Upper, Lower, Number & Special character (minimum 8 characters)</p> 
                  </div> 
                </div> 
 
                <div class="form-grid"> 
                  <label>New password * 
                    <input id="newPassword" name="newPassword" type="password" required placeholder="Enter new password"> 
                  </label> 
                  <label>Confirm new password * 
                    <input id="confirmPassword" name="confirmPassword" type="password" required placeholder="Confirm new password"> 
                  </label> 
                </div> 
              </section> 
 
              <div id="confirmError" class="form-error hidden" style="margin: 20px 40px 0;"></div> 
              <div id="confirmSuccess" class="form-success hidden" style="margin: 20px 40px 0;"></div> 
 
              <div class="form-actions"> 
                <button type="button" class="text-button" id="cancelConfirm">Cancel</button> 
                <button type="submit" class="primary-button" id="submitConfirmBtn"> 
                  Update password & Sign In → 
                </button> 
              </div> 
            </form> 
          </div> 
        </main> 
    `;

    document.getElementById("backLogin").addEventListener("click", onBackToLogin);
    document.getElementById("cancelConfirm").addEventListener("click", onBackToLogin);

    document.getElementById("confirmPasswordForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        hideError("confirmError");
        hideError("confirmSuccess");

        const pwdCheck = validatePassword(newPassword);
        if (!pwdCheck.valid) {
            showError("confirmError", pwdCheck.message);
            return;
        }

        if (newPassword !== confirmPassword) {
            showError("confirmError", "Passwords do not match.");
            return;
        }

        const submitBtn = document.getElementById("submitConfirmBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Updating password...";

        try {
            await onConfirmReset({ token, newPassword });
            const successEl = document.getElementById("confirmSuccess");
            if (successEl) {
                successEl.textContent = "✅ Password updated successfully! Redirecting you to sign in...";
                successEl.classList.remove("hidden");
            }
            // Clean URL query and hash
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => {
                onBackToLogin();
            }, 1800);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Update password & Sign In →";
            showError("confirmError", err.message || "Failed to update password. Link may be invalid or expired.");
        }
    });
}
