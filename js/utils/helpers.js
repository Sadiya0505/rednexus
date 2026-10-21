import { BLOOD_COMPATIBILITY } from '../config/constants.js';

/**
 * Escapes HTML characters to prevent XSS attacks.
 * @param {string} str 
 * @returns {string}
 */
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Checks if a donor blood group can donate to a recipient blood group.
 * @param {string} donorBlood 
 * @param {string} recipientBlood 
 * @returns {boolean}
 */
export function isBloodCompatible(donorBlood, recipientBlood) {
    const recipients = BLOOD_COMPATIBILITY[donorBlood] || [];
    return recipients.includes(recipientBlood);
}

/**
 * Returns compatible donor groups for a given recipient blood type.
 * @param {string} recipientBlood 
 * @returns {string[]}
 */
export function getCompatibleDonors(recipientBlood) {
    const compatible = [];
    for (const [donor, recipients] of Object.entries(BLOOD_COMPATIBILITY)) {
        if (recipients.includes(recipientBlood)) {
            compatible.push(donor);
        }
    }
    return compatible;
}

/**
 * Formats a date string nicely
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Never') return 'Never';
    try {
        const d = new Date(dateStr);
        return d.toISOString().split('T')[0];
    } catch {
        return dateStr;
    }
}
