/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format cooldown remaining time
 */
export function formatCooldownRemaining(cooldownUntil: string): string {
  const now = new Date();
  const until = new Date(cooldownUntil);
  const diffMs = until.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Ready to play';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${mins}m cooldown`;
  return `${mins}m cooldown`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Check if cooldown is active
 */
export function isCooldownActive(cooldownUntil: string | null | undefined): boolean {
  if (!cooldownUntil) return false;
  return new Date(cooldownUntil) > new Date();
}
