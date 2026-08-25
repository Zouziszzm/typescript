export const GUEST_USER_ID_PREFIX = "guest_";

export function isGuestUserId(userId: string): boolean {
  return userId.startsWith(GUEST_USER_ID_PREFIX);
}

/** Skip DB persistence when any player in the match is a guest. */
export function shouldPersistMatch(playerUserIds: string[]): boolean {
  return !playerUserIds.some(isGuestUserId);
}
