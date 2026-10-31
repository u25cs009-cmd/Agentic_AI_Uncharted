import { z } from 'zod';

export const MemoryTypeSchema = z.enum([
  'episodic',
  'semantic',
  'procedural',
  'constraint',
  'preference',
  'ephemeral'
]);

/**
 * Zod Schema for LLM Memory Extraction Output
 */
export const MemoryExtractionCandidateSchema = z.object({
  type: MemoryTypeSchema,
  content: z.string().min(1),
  attribute_key: z.string().optional(),
  entities: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  ttlHint: z.number().nullable().optional(),
  envHint: z.record(z.string(), z.any()).optional()
});

export const MemoryExtractionOutputSchema = z.object({
  candidates: z.array(MemoryExtractionCandidateSchema)
});

export type MemoryExtractionCandidate = z.infer<typeof MemoryExtractionCandidateSchema>;
export type MemoryExtractionOutput = z.infer<typeof MemoryExtractionOutputSchema>;

/**
 * Zod Schema for LLM Write Judge Output
 */
export const WriteJudgeOutputSchema = z.object({
  decision: z.enum(['ADD', 'UPDATE', 'SUPERSEDE', 'IGNORE', 'QUARANTINE', 'CONFLICT']),
  targetMemoryId: z.string().nullable().optional(),
  reason: z.string(),
  risk: z.enum(['safe', 'suspicious', 'malicious']),
  riskReason: z.string().nullable().optional()
});

export type WriteJudgeOutput = z.infer<typeof WriteJudgeOutputSchema>;

/**
 * Zod Schema for LLM Agent Answer Output
 */
export const AgentAnswerOutputSchema = z.object({
  diagnosis: z.string(),
  proposedFix: z.string(),
  citedMemoryIds: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([]),
  abstain: z.boolean(),
  abstainReason: z.string().nullable().optional()
});

export type AgentAnswerOutput = z.infer<typeof AgentAnswerOutputSchema>;

/**
 * Strips markdown code fences (e.g. ```json ... ```) from LLM text output.
 */
export function stripCodeFences(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Strip ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
  }
  return cleaned.trim();
}
