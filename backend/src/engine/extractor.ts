/**
 * ANCHOR Candidate Fact Extractor & Entity Resolution Engine
 * Agent: ShaktAI
 * Extracts structured facts from unstructured natural language observations.
 */

import { CandidateFact, MemorySource, MemoryType, SourceKind } from './types.js';

// Official Trust Ladder defined in Implementation Plan Section 6 Module 4
export const TRUST_LADDER: Record<SourceKind, number> = {
  human_approved: 1.0,
  system_event: 0.85,
  user_stated: 0.8,
  agent_inferred: 0.5,
  unverified: 0.2,
};

export class CandidateFactExtractor {
  /**
   * Parse an incoming observation into a candidate fact with attribute_key and dependencies.
   */
  static extractCandidateFact(content: string, source: MemorySource): CandidateFact {
    const text = content.trim();
    const lower = text.toLowerCase();

    // Determine type
    let type: MemoryType = 'semantic';
    if (
      lower.includes('how to') ||
      lower.includes('fix') ||
      lower.includes('restart') ||
      lower.includes('command') ||
      lower.includes('step')
    ) {
      type = 'procedural';
    } else if (
      lower.includes('yesterday') ||
      lower.includes('today') ||
      lower.includes('prefer') ||
      lower.includes('noticed') ||
      lower.includes('alert')
    ) {
      type = 'episodic';
    }

    // Extract entities
    const entities = new Set<string>();
    const knownEntities = [
      'checkout-api',
      'pg-pool',
      'postgres',
      'mongodb',
      'mongodb-atlas',
      'redis',
      'database',
      'docker',
      'kubernetes',
      'terraform',
      'user',
      'auth-service',
      'payment-gateway',
    ];

    for (const ent of knownEntities) {
      if (lower.includes(ent)) {
        entities.add(ent);
      }
    }

    // Determine attribute_key & value heuristics
    let attribute_key = 'general.fact';
    let value = text;
    const depends_on: string[] = [];

    if (lower.includes('database is') || lower.includes('db is') || lower.includes('db engine') || lower.includes('database engine')) {
      attribute_key = 'infra.db.primary';
      if (lower.includes('mongodb')) value = 'MongoDB Atlas';
      else if (lower.includes('postgres')) value = 'PostgreSQL';
      else if (lower.includes('sqlite')) value = 'SQLite';
      else value = text;
      depends_on.push('database');
    } else if (lower.includes('timeout') || lower.includes('connection error') || lower.includes('pool')) {
      attribute_key = 'checkout-api.fix.db_timeout';
      depends_on.push('pg-pool');
    } else if (lower.includes('prefer') || lower.includes('dry-run') || lower.includes('formatting')) {
      attribute_key = 'user.pref.confirmation';
      value = text;
    } else if (entities.size > 0) {
      const primaryEntity = Array.from(entities)[0];
      attribute_key = `${primaryEntity}.configuration`;
      depends_on.push(primaryEntity);
    }

    // Trust lookup from official ladder
    const trust = TRUST_LADDER[source.kind] ?? 0.5;

    // Confidence determination
    let confidence = 0.85;
    if (source.kind === 'human_approved') confidence = 0.98;
    else if (source.kind === 'unverified') confidence = 0.3;

    return {
      type,
      content: text,
      entities: Array.from(entities),
      attribute_key,
      value,
      depends_on,
      source,
      trust,
      confidence,
    };
  }
}

