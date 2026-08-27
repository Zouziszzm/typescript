export function nanoid(size = 21): string {
  const alphabet = "useandom-26T198340PX75pxJACKVERYMINDBSFGObertocvglyzHWQ";
  
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.getRandomValues
  ) {
    const bytes = new Uint8Array(size);
    window.crypto.getRandomValues(bytes);
    let id = "";
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
  }

  // Fallback for insecure contexts (e.g. local IP network testing over HTTP)
  let id = "";
  for (let i = 0; i < size; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
