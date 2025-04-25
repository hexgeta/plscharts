// List of whitelisted email addresses
export const WHITELISTED_EMAILS: string[] = 
  process.env.WHITELISTED_EMAILS 
    ? process.env.WHITELISTED_EMAILS.split(',').map(email => email.trim())
    : [];

// Helper function to check if an email is whitelisted
export const isEmailWhitelisted = (email: string): boolean => {
  // Convert email to lowercase for case-insensitive comparison
  const normalizedEmail = email.toLowerCase();
  return WHITELISTED_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail);
}; 