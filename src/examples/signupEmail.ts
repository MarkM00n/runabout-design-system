// The one definition of "a plausible email" for the Vines & Vinyl sign-up,
// shared by the page (validates before sending) and the /api/subscribe
// Netlify Function (validates again server-side), so the two can't disagree.
// type=email alone lets "a@b" through, so this also wants a dot in the domain.
// 254 characters is the practical maximum length of an address (RFC 5321).
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const isPlausibleEmail = (email: string): boolean => email.length <= 254 && EMAIL_PATTERN.test(email);
