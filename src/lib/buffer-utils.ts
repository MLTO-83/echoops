/**
 * Buffer utility functions that work in both Node.js and browser environments
 */

/**
 * Creates a base64 encoded string from input data
 * Works in both Node.js and browser environments
 */
export function encodeToBase64(data: string): string {
  // In browsers, use the built-in btoa function
  if (typeof window !== "undefined" && window.btoa) {
    return window.btoa(unescape(encodeURIComponent(data)));
  }
  // In Node.js environments
  else if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  }
  // Fallback implementation if neither is available
  else {
    const b64chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let result = "";

    for (let i = 0; i < data.length; i += 3) {
      const c1 = data.charCodeAt(i);
      const c2 = i + 1 < data.length ? data.charCodeAt(i + 1) : 0;
      const c3 = i + 2 < data.length ? data.charCodeAt(i + 2) : 0;

      const e1 = c1 >> 2;
      const e2 = ((c1 & 3) << 4) | (c2 >> 4);
      const e3 = ((c2 & 15) << 2) | (c3 >> 6);
      const e4 = c3 & 63;

      result +=
        b64chars.charAt(e1) +
        b64chars.charAt(e2) +
        (i + 1 < data.length ? b64chars.charAt(e3) : "=") +
        (i + 2 < data.length ? b64chars.charAt(e4) : "=");
    }

    return result;
  }
}
