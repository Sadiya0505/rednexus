import { escapeHTML } from '../utils/helpers.js';
import { api } from '../services/api.js';

export async function renderProfilePage(container, currentUser) {
    // Show loading skeleton
    container.innerHTML = `
        <div class="page-body">
          <div class="page-title-row">
            <div>
              <p class="eyebrow">ACCOUNT SETTINGS</p>
              <h1>Your profile</h1>
              <p class="muted">Loading your information…</p>
            </div>
          </div>
          <div style="padding:40px;text-align:center;color:#94a3b8;">Loading…</div>
        </div>`;

    let profile = null;
    try {
        profile = await api.getProfile();
    } catch (e) {
        // Fallback to localStorage data
        profile = currentUser || {};
    }

    // Merge with localStorage as fallback for missing fields
    if (currentUser) {
        profile = { ...currentUser, ...profile };
    }

    const role = profile.role || 'Donor';
    const isBankManager = role === 'BankManager' || role === 'Bank';
    const isAdmin = role === 'Admin';

    const userName = escapeHTML(profile.name || 'User');
    const initial = userName.charAt(0).toUpperCase();

    const statusLabel = isBankManager
        ? (profile.bank_status === 'Approved' ? 'Approved Bank' : (profile.bank_status === 'Rejected' ? 'Rejected' : 'Pending Approval'))
        : (role === 'Admin' ? 'Administrator' : role === 'Acceptor' ? 'Active Acceptor' : 'Active Donor');

    const statusClass = (profile.bank_status === 'Approved' || role === 'Donor' || role === 'Admin') ? 'good' : 'pending';

    function field(label, value) {
        if (!value && value !== 0) return '';
        return `
        <div class="profile-field-item">
          <small>${escapeHTML(label)}</small>
          <strong>${escapeHTML(String(value))}</strong>
        </div>`;
    }

    function buildFields() {
        if (isBankManager) {
            return `
                ${field('Bank ID', profile.id)}
                ${field('Blood Bank Name', profile.name || profile.bank_name)}
                ${field('Manager / Contact', profile.manager_name)}
                ${field('Email', profile.email)}
                ${field('Phone', profile.phone)}
                ${field('Address', profile.address)}
                ${field('City', profile.city)}
                ${field('Registration Number', profile.reg_number)}
                ${field('Approval Status', profile.bank_status || profile.status)}
            `;
        }
        if (isAdmin) {
            return `
                ${field('Admin ID', profile.id)}
                ${field('Name', profile.name)}
                ${field('Email', profile.email)}
                ${field('Role', 'Administrator')}
            `;
        }
        // Donor / Acceptor
        return `
            ${field('User ID', profile.id)}
            ${field('Name', profile.name)}
            ${field('Email', profile.email)}
            ${field('Blood Group', profile.blood || profile.blood_group)}
            ${field('Mobile', profile.mobile)}
            ${field('City', profile.city)}
            ${field('Address / Location', profile.location || profile.address)}
            ${profile.role !== 'Acceptor' ? field('Last Donation', profile.last || profile.last_donation) : ''}
            ${profile.role === 'Acceptor' ? field('Hospital / Organization', profile.location) : ''}
            ${field('Status', profile.status || 'Active')}
        `;
    }

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
                <div class="profile-avatar">${initial}</div>
                <div>
                  <h2>${userName}</h2>
                  <p>${escapeHTML(profile.email || '')}</p>
                  <span class="status-pill ${statusClass}">${escapeHTML(statusLabel)}</span>
                </div>
              </div>

              <div class="profile-fields">
                ${buildFields()}
              </div>

              ${!isAdmin && !isBankManager ? `
              <div style="padding:24px 28px;border-top:1px solid var(--line);">
                <p class="eyebrow" style="margin-bottom:14px;">EDIT PROFILE</p>
                <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
                  <label style="font-size:12px;font-weight:700;color:#334155;">Mobile
                    <input id="editMobile" type="tel" value="${escapeHTML(profile.mobile || '')}" style="margin-top:4px;">
                  </label>
                  <label style="font-size:12px;font-weight:700;color:#334155;">City
                    <input id="editCity" value="${escapeHTML(profile.city || '')}" style="margin-top:4px;">
                  </label>
                  <label style="font-size:12px;font-weight:700;color:#334155;">Location / Address
                    <input id="editLocation" value="${escapeHTML(profile.location || '')}" style="margin-top:4px;">
                  </label>
                </div>
                ${role === 'Donor' ? `
                <label class="check-label" style="margin-top:12px;font-size:12px;">
                  <input type="checkbox" id="editShareContact" ${profile.share_contact ? 'checked' : ''}>
                  Allow others to see my contact number in the donor directory
                </label>` : ''}
                <div id="profileUpdateMsg" class="hidden" style="margin-top:10px;font-size:13px;"></div>
                <button class="primary-button" id="saveProfileBtn" style="margin-top:16px;">Save changes</button>
              </div>` : ''}
            </section>

            <aside class="profile-side">
              <div class="stat-icon">✓</div>
              <h3>${isBankManager ? 'Bank Status' : (role === 'Acceptor' ? 'Request Status' : 'Donation Eligibility')}</h3>
              <p class="muted">
                ${isBankManager
                    ? 'Your blood bank account status determines access to inventory management.'
                    : role === 'Acceptor'
                        ? 'Your acceptor profile is set up to issue active blood requests.'
                        : 'Your donor profile is ready for matching. Keep your health details updated.'}
              </p>

              <div class="eligibility-row">
                <span>Profile completeness</span>
                <strong>${profile.email && profile.mobile ? '100%' : '80%'}</strong>
              </div>
              <div class="stock-track">
                <span style="width:${profile.email && profile.mobile ? '100%' : '80%'}"></span>
              </div>
            </aside>
          </div>
        </div>
    `;

    // Save profile handler
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const updates = {};
            const mobile = document.getElementById('editMobile')?.value.trim();
            const city = document.getElementById('editCity')?.value.trim();
            const location = document.getElementById('editLocation')?.value.trim();
            const shareContact = document.getElementById('editShareContact');

            // Only send fields that have values
            if (mobile) updates.mobile = mobile;
            if (city) updates.city = city;
            if (location) updates.location = location;
            if (shareContact) updates.share_contact = shareContact.checked ? 1 : 0;

            const msgEl = document.getElementById('profileUpdateMsg');

            if (Object.keys(updates).length === 0) {
                if (msgEl) {
                    msgEl.textContent = 'No changes to save.';
                    msgEl.style.color = '#94a3b8';
                    msgEl.classList.remove('hidden');
                }
                return;
            }

            saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

            try {
                await api.updateProfile(updates);
                // Update localStorage user
                const stored = JSON.parse(localStorage.getItem('redNexusUser') || '{}');
                Object.assign(stored, updates);
                localStorage.setItem('redNexusUser', JSON.stringify(stored));

                if (msgEl) {
                    msgEl.textContent = '✅ Profile updated successfully.';
                    msgEl.style.color = '#16a34a';
                    msgEl.classList.remove('hidden');
                    setTimeout(() => msgEl.classList.add('hidden'), 4000);
                }
            } catch (e) {
                if (msgEl) {
                    msgEl.textContent = '❌ ' + (e.message || 'Update failed.');
                    msgEl.style.color = '#ef4444';
                    msgEl.classList.remove('hidden');
                }
            }
            saveBtn.disabled = false; saveBtn.textContent = 'Save changes';
        });
    }
}
