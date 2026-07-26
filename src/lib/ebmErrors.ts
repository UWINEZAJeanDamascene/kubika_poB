const RRA_ERROR_HINTS: Record<string, string> = {
  "881": "Purchase confirmation is mandatory before fiscalizing this sale.",
  "882": "Invalid purchase order code (prcOrdCd).",
  "883": "Purchase order code already used on another fiscal sale.",
  "884": "Customer TIN is invalid according to RRA.",
};

export function formatRraErrorMessage(code?: string | null, message?: string | null): string {
  const normalizedCode = String(code || "").trim();
  const hint = normalizedCode ? RRA_ERROR_HINTS[normalizedCode] : null;
  if (hint && message) return `[${normalizedCode}] ${hint} — ${message}`;
  if (hint) return `[${normalizedCode}] ${hint}`;
  if (normalizedCode && message) return `[${normalizedCode}] ${message}`;
  return message || hint || "Unknown RRA error";
}
