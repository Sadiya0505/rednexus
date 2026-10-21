/**
 * Validates strict 10-digit phone number (digits 0-9 only, exactly 10 digits).
 * @param {string} phone 
 * @returns {boolean}
 */
export function validatePhone(phone) {
    if (!phone) return false;
    const cleanPhone = String(phone).trim();
    // Exactly 10 digits without characters or spaces
    return /^[0-9]{10}$/.test(cleanPhone);
}

/**
 * Validates password strength:
 * - At least 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 digit (0-9)
 * - At least 1 special character (@$!%*?&#)
 * @param {string} password 
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
    if (!password) {
        return { valid: false, message: "Password is required." };
    }
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters long." };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one uppercase letter (A-Z)." };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one lowercase letter (a-z)." };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: "Password must contain at least one number (0-9)." };
    }
    if (!/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, message: "Password must contain at least one special character (e.g. @$!%*?&#)." };
    }
    return { valid: true, message: "Strong password." };
}
