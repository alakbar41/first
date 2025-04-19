// Faculty codes and names
export const FACULTY_CODES = ["SITE", "SB", "SPIA", "SESD"] as const;

// Faculty name mapping
export const FACULTY_ABBREVIATIONS = {
  "SITE": "School of IT and Engineering",
  "SB": "School of Business", 
  "SPIA": "School of Public and International Affairs", 
  "SESD": "School of Education and Social Development"
} as const;

// Array of full faculty names
export const FACULTIES = Object.values(FACULTY_ABBREVIATIONS) as readonly string[];

// Function to get faculty code from full name or vice versa
export function getFacultyCode(facultyName: string): string {
  // First check if it's already a code
  if (FACULTY_CODES.includes(facultyName as any)) {
    return facultyName;
  }
  
  // Convert from full name to code
  const entry = Object.entries(FACULTY_ABBREVIATIONS).find(([_, name]) => name === facultyName);
  return entry ? entry[0] : facultyName;
}

// Function to get faculty full name from code
export function getFacultyName(facultyCode: string): string {
  // First check if it's a code
  if (FACULTY_CODES.includes(facultyCode as any)) {
    return FACULTY_ABBREVIATIONS[facultyCode as keyof typeof FACULTY_ABBREVIATIONS];
  }
  
  // If it's already a full name, return it
  if (FACULTIES.includes(facultyCode)) {
    return facultyCode;
  }
  
  // If we can't find a match, return the original
  return facultyCode;
}

// Election status types
export const ELECTION_STATUS = ["upcoming", "active", "completed"] as const;

// Blockchain transaction types
export const BLOCKCHAIN_TX_TYPES = [
  "create_election", 
  "vote", 
  "start_election",
  "end_election"
] as const;