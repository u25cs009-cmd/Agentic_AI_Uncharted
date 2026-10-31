/**
 * ANCHOR Safety Screening & PII Masking Engine
 * Agent: ShaktAI
 * Protects against prompt injection attacks (P1–P4) and ensures privacy compliance.
 */

export interface SafetyCheckResult {
  isSafe: boolean;
  flag: 'injection' | 'exfiltration' | 'jailbreak' | 'none';
  reason?: string;
  matchedPattern?: string;
}

// Regex patterns detecting prompt injection, instruction overrides, and jailbreaks
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)/i,
  /disregard\s+(all\s+)?(previous|prior)\s+(instructions|directives)/i,
  /system\s+override\s*:/i,
  /new\s+system\s+(prompt|directive)\s*:/i,
  /you\s+are\s+now\s+(in\s+)?(dan\s+mode|unrestricted|god\s+mode)/i,
  /bypass\s+(all\s+)?(safety|guard|security)\s+(rules|protocols)/i,
  /forget\s+(all\s+)?(safety|governance|ethics)\s+(rules|guidelines)/i,
];

// Patterns detecting data exfiltration and credential theft attempts
const EXFILTRATION_PATTERNS = [
  /(send|post|transmit|leak|exfiltrate)\s+(all\s+)?(memories|passwords|keys|secrets|tokens)\s+to/i,
  /curl\s+(-[a-zA-Z]+\s+)*https?:\/\//i,
  /webhook\.site\/[a-f0-9-]+/i,
  /http:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/i,
  /output\s+(all\s+)?system\s+(credentials|environment\s+variables|api\s+keys)/i,
];

/**
 * Mask PII (emails, phone numbers, secret API keys) before generating embeddings or storing memories.
 */
export function maskPII(text: string): { maskedText: string; maskedCount: number } {
  let maskedText = text;
  let maskedCount = 0;

  // Mask Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  maskedText = maskedText.replace(emailRegex, () => {
    maskedCount++;
    return '[EMAIL_MASKED]';
  });

  // Mask Phone Numbers (International & US formats)
  const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  maskedText = maskedText.replace(phoneRegex, () => {
    maskedCount++;
    return '[PHONE_MASKED]';
  });

  // Mask API Keys (common patterns like sk-..., ghp_..., eyJ...)
  const apiKeyRegex = /\b(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{20,})\b/g;
  maskedText = maskedText.replace(apiKeyRegex, () => {
    maskedCount++;
    return '[API_KEY_MASKED]';
  });

  return { maskedText, maskedCount };
}

/**
 * Deterministic safety screening for prompt injections and malicious memory poisoning.
 */
export function screenInputSafety(text: string): SafetyCheckResult {
  const normalized = text.toLowerCase();

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isSafe: false,
        flag: 'injection',
        reason: 'Detected prompt injection / system instruction override signature.',
        matchedPattern: pattern.source,
      };
    }
  }

  for (const pattern of EXFILTRATION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isSafe: false,
        flag: 'exfiltration',
        reason: 'Detected unauthorized data exfiltration or credential leak attempt.',
        matchedPattern: pattern.source,
      };
    }
  }

  return {
    isSafe: true,
    flag: 'none',
  };
}

