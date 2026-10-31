/**
 * ANCHOR Candidate Fact Extractor & Entity Resolution Engine
 * Agent: XYRO101
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
      'anchor',
      'react',
      'next.js',
      'nextjs',
      'node.js',
      'nodejs',
      'express',
      'frontend',
      'backend',
      'jwt',
      'session',
      'step-by-step',
      'user-preference',
      'project',
      'feedback',
      'outcome'
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

    // 1. Project Name
    if (lower.includes('project is called') || lower.includes('project name is') || lower.includes('called anchor') || lower.includes('project called')) {
      attribute_key = 'project.name';
      const nameMatch = text.match(/called\s+['"]?([A-Za-z0-9_\-]+)['"]?/i) || text.match(/name\s+is\s+['"]?([A-Za-z0-9_\-]+)['"]?/i);
      value = nameMatch ? nameMatch[1] : (lower.includes('anchor') ? 'ANCHOR' : text);
      entities.add('project');
      entities.add('anchor');
      depends_on.push('project');
    }
    // 2. Project Progress / Completed Components
    else if ((lower.includes('completed') || lower.includes('finished')) && (lower.includes('frontend') || lower.includes('backend') || lower.includes('react') || lower.includes('node'))) {
      attribute_key = 'project.progress.components';
      type = 'procedural';
      value = text;
      entities.add('project');
      entities.add('progress');
      entities.add('frontend');
      entities.add('backend');
      depends_on.push('project');
    }
    // 3. Project Architecture / Stack Update (e.g. Next.js superseding React)
    else if (lower.includes('next.js instead of react') || (lower.includes('now uses next.js') && lower.includes('frontend')) || lower.includes('updated to next.js')) {
      attribute_key = 'project.architecture.stack';
      value = text;
      entities.add('project');
      entities.add('architecture');
      entities.add('next.js');
      entities.add('frontend');
      depends_on.push('project');
    }
    // 4. Project Architecture / General Stack
    else if (lower.includes('project uses') || (lower.includes('uses') && (lower.includes('react') || lower.includes('node') || lower.includes('mongodb')))) {
      attribute_key = 'project.architecture.stack';
      value = text;
      entities.add('project');
      entities.add('architecture');
      depends_on.push('project');
    }
    // 5. User Feedback / Outcomes / Corrections
    else if (lower.includes('feedback') || lower.includes('outcome') || lower.includes('failed during') || lower.includes('failed under load') || lower.includes('correction')) {
      attribute_key = 'user.feedback.technical';
      type = 'episodic';
      value = text;
      entities.add('feedback');
      entities.add('outcome');
      depends_on.push('project');
    }
    // 6. User Preferences
    else if (lower.includes('prefer') || lower.includes('step-by-step') || lower.includes('simple explanations') || lower.includes('formatting') || lower.includes('dry-run')) {
      attribute_key = 'user.pref.response_style';
      type = 'episodic';
      value = text;
      entities.add('user-preference');
      entities.add('response-style');
    }
    // 7. Database Configuration
    else if (lower.includes('database is') || lower.includes('db is') || lower.includes('db engine') || lower.includes('database engine')) {
      attribute_key = 'infra.db.primary';
      if (lower.includes('mongodb')) value = 'MongoDB Atlas';
      else if (lower.includes('postgres')) value = 'PostgreSQL';
      else if (lower.includes('sqlite')) value = 'SQLite';
      else value = text;
      depends_on.push('database');
    }
    // 8. Operational Fixes
    else if (lower.includes('timeout') || lower.includes('connection error') || lower.includes('pool')) {
      attribute_key = 'checkout-api.fix.db_timeout';
      depends_on.push('pg-pool');
    }
    // 9. Entity-derived fallback
    else if (entities.size > 0) {
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

