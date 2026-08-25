export type GuestProfile = {
  id: string;
  name: string;
};

const GUEST_STORAGE_KEY = "kw_guest";

/** Works on HTTP LAN IPs where crypto.randomUUID is unavailable (non-secure context). */
function createGuestId(): string {
  const cryptoApi =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (typeof cryptoApi?.randomUUID === "function") {
    return `guest_${cryptoApi.randomUUID()}`;
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `guest_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getGuestProfile(): GuestProfile {
  if (typeof window === "undefined") {
    return { id: "guest_pending", name: "Guest" };
  }

  const raw = localStorage.getItem(GUEST_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GuestProfile;
      if (parsed.id && parsed.name) return parsed;
    } catch {
      // fall through
    }
  }

  const profile: GuestProfile = {
    id: createGuestId(),
    name: `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
  };
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}
