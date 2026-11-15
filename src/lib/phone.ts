/**
 * Accepts how Nigerians actually type numbers: "0803 123 4567", "+234 0803…"
 * and "+234 803…" all become +2348031234567. Other countries pass through.
 */
export function normalizePhone(raw: string) {
  let n = raw.replace(/[\s\-()]/g, "");
  if (/^0\d{10}$/.test(n)) n = "+234" + n.slice(1);
  if (n.startsWith("+2340")) n = "+234" + n.slice(5);
  return n;
}
