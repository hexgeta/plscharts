// List of whitelisted email addresses
const whitelistEnv = process.env.NEXT_PUBLIC_WHITELISTED_EMAILS || process.env.WHITELISTED_EMAILS;

export const WHITELISTED_EMAILS: string[] = 
  whitelistEnv
    ? whitelistEnv.split(',').map(email => email.trim())
    : [];

// Helper function to check if an email is whitelisted
export const isEmailWhitelisted = (email: string): boolean => {
  if (!email) return false;
  // Convert email to lowercase for case-insensitive comparison
  const normalizedEmail = email.toLowerCase();
  return WHITELISTED_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail);
}; 