/**
 * Mask PII patterns (emails, phone numbers, API keys) before generating embeddings or storing memories
 */
export function maskPII(text: string): string {
  if (!text) return text;
  
  // 1. Mask Common API Key patterns FIRST (before phone numbers, so digits inside tokens are not confused with phones)
  let scrubbed = text.replace(
    /\b(?:sk-[a-zA-Z0-9_-]{16,}|ghp_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35}|[a-f0-9]{32,64})\b/g,
    '[REDACTED_API_KEY]'
  );

  // 2. Mask Email addresses
  scrubbed = scrubbed.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    '[REDACTED_EMAIL]'
  );

  // 3. Mask Phone numbers
  scrubbed = scrubbed.replace(
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '[REDACTED_PHONE]'
  );

  return scrubbed;
}
