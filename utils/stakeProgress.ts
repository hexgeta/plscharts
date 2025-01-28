export function calculateStakeProgress(startDate: Date, endDate: Date): number {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // If stake hasn't started
  if (now < start) return 0
  // If stake has ended
  if (now > end) return 100
  
  const total = end.getTime() - start.getTime()
  const current = now.getTime() - start.getTime()
  
  return Math.min(100, Math.max(0, (current / total) * 100))
} 