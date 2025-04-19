// Faculty codes
export const FACULTY_CODES = [
  'SITE',
  'BBA',
  'SPSE',
  'LAW',
  'PMP',
  'OTHER'
] as const;

export type FacultyCode = typeof FACULTY_CODES[number];

// Map faculty codes to display names
const FACULTY_NAMES: Record<FacultyCode, string> = {
  'SITE': 'School of IT & Engineering',
  'BBA': 'Business Administration',
  'SPSE': 'School of Public & Social Sciences',
  'LAW': 'School of Law',
  'PMP': 'Professional Management Programs',
  'OTHER': 'Other'
};

/**
 * Get the display name for a faculty code
 */
export function getFacultyName(code: string): string {
  return FACULTY_NAMES[code as FacultyCode] || code;
}

// Common status values for elections
export const ELECTION_STATUS = [
  'draft',
  'pending',
  'active',
  'completed',
  'cancelled'
] as const;

export type ElectionStatus = typeof ELECTION_STATUS[number];

// Position types
export const POSITION_TYPES = [
  'President',
  'Vice President',
  'Senator',
  'Club Leader',
  'Representative',
  'Other'
] as const;

export type PositionType = typeof POSITION_TYPES[number];

// Email validation regex for student/faculty emails
export const ADA_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@ada\.edu\.az$/;

// OTP expiry time in milliseconds (3 minutes)
export const OTP_EXPIRY_TIME = 3 * 60 * 1000;

// Max failed login attempts before lockout
export const MAX_LOGIN_ATTEMPTS = 5;

// Login lockout duration in milliseconds (15 minutes)
export const LOGIN_LOCKOUT_DURATION = 15 * 60 * 1000;