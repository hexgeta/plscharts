// List of whitelisted Twitter handles (without @ symbol)
export const WHITELISTED_HANDLES: string[] = [
  '*' // Temporarily whitelist all handles
  // Add specific handles later like:
  // 'handle1',
  // 'handle2',
];

// Helper function to check if a handle is whitelisted
export const isHandleWhitelisted = (handle: string): boolean => {
  // If '*' is in the whitelist, allow all handles
  if (WHITELISTED_HANDLES.includes('*')) {
    return true;
  }
  
  // Convert handle to lowercase for case-insensitive comparison
  const normalizedHandle = handle.toLowerCase().replace('@', '');
  return WHITELISTED_HANDLES.map(h => h.toLowerCase()).includes(normalizedHandle);
}; 