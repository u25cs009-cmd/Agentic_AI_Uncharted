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
   * Parse an incoming observation or multi-sentence message into a list of candidate facts.
   */
  static extractCandidateFacts(content: string, source: MemorySource): CandidateFact[] {
    const text = content.trim();
    if (!text) return [];

    // Split compound messages by sentence boundaries or newline breaks
    const rawSegments = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 3);
    const facts: CandidateFact[] = [];
    const seenKeys = new Set<string>();

    for (const seg of rawSegments) {
      const fact = this.extractSingleFact(seg, source);
      if (fact && fact.attribute_key !== 'general.fact') {
        const dedupeKey = `${fact.attribute_key}::${fact.value.toLowerCase().trim()}`;
        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          facts.push(fact);
        }
      }
    }

    // If no specific individual facts were extracted or only one sentence existed, run on full text
    if (facts.length === 0) {
      return [this.extractSingleFact(text, source)];
    }

    return facts;
  }

  /**
   * Parse an incoming observation into a single candidate fact with attribute_key and dependencies.
   */
  static extractCandidateFact(content: string, source: MemorySource): CandidateFact {
    const facts = this.extractCandidateFacts(content, source);
    return facts[0] || this.extractSingleFact(content, source);
  }

  private static extractSingleFact(content: string, source: MemorySource): CandidateFact {
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
      'vue',
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

    // Check if the segment is an interrogative question (questions are not facts to be stored)
    const isInterrogative = text.trim().endsWith('?') ||
      /^(what|who|which|how|where|when|why|can\s+you|do\s+you|tell\s+me)\b/i.test(text.trim());

    if (isInterrogative && !lower.startsWith('save:') && !lower.startsWith('remember:')) {
      return {
        type: 'semantic',
        content: text,
        entities: Array.from(entities),
        attribute_key: 'general.query',
        value: text,
        depends_on: [],
        source,
        trust: 0.5,
        confidence: 0.5
      };
    }

    // 0. User Identity: Name
    const nameMatch = text.match(/\bmy name is\s+([A-Za-z0-9_-]+)/i) ||
                      text.match(/\bcall me\s+([A-Za-z0-9_-]+)/i) ||
                      text.match(/\bi am\s+([A-Z][a-z]+)\b/);
    if (nameMatch && !['building', 'studying', 'using', 'working'].includes(nameMatch[1].toLowerCase())) {
      attribute_key = 'user.profile.name';
      value = nameMatch[1];
      entities.add('user');
      entities.add('profile');
    }
    // 0.1 User Profile: Occupation / Field of Study
    else if (lower.includes('computer science') || lower.includes('student') || lower.includes('studying')) {
      attribute_key = 'user.profile.occupation';
      if (lower.includes('computer science student')) {
        value = 'Computer Science Student';
      } else if (lower.includes('computer science')) {
        value = 'Computer Science';
      } else {
        value = text;
      }
      entities.add('user');
      entities.add('profile');
      entities.add('education');
    }
    // 1. Project Name
    else if (lower.includes('project is called') || lower.includes('project name is') || lower.includes('called anchor') || lower.includes('project called') || lower.includes('building a project called') || lower.includes('building anchor')) {
      attribute_key = 'project.name';
      const pMatch = text.match(/called\s+['"]?([A-Za-z0-9_\-]+)['"]?/i) || text.match(/name\s+is\s+['"]?([A-Za-z0-9_\-]+)['"]?/i) || text.match(/building\s+['"]?([A-Za-z0-9_\-]+)['"]?/i);
      value = pMatch ? pMatch[1] : (lower.includes('anchor') ? 'ANCHOR' : text);
      entities.add('project');
      entities.add('anchor');
      depends_on.push('project');
    }
    // 1.1 Project Goal
    else if (lower.includes('goal is') || lower.includes('main goal') || lower.includes('aim to build')) {
      attribute_key = 'project.goal';
      const goalMatch = text.match(/goal\s+(?:is\s+to|is)\s+([^.]+)/i);
      value = goalMatch ? goalMatch[1].trim() : text;
      entities.add('project');
      entities.add('goal');
      depends_on.push('project');
    }
    // 1.2 Project Planning / Deadline
    else if (lower.includes('deadline is') || lower.includes('project deadline')) {
      attribute_key = 'project.planning.deadline';
      const deadlineMatch = text.match(/deadline\s+is\s+([^,.]+)/i);
      value = deadlineMatch ? deadlineMatch[1].trim() : text;
      entities.add('project');
      entities.add('deadline');
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
    // 3. Project Architecture / Stack Update (e.g. Next.js or Vue superseding React)
    else if (lower.includes('switched to vue') || lower.includes('switched from react') || lower.includes('no longer use react') || lower.includes('switch to vue')) {
      attribute_key = 'project.architecture.frontend';
      value = 'Vue (switched away from React)';
      entities.add('project');
      entities.add('architecture');
      entities.add('vue');
      entities.add('frontend');
      depends_on.push('project');
    }
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
    else if (lower.includes('project uses') || lower.includes('anchor uses') || (lower.includes('uses') && (lower.includes('react') || lower.includes('node') || lower.includes('mongodb')))) {
      attribute_key = 'project.architecture.stack';
      value = text;
      entities.add('project');
      entities.add('architecture');
      depends_on.push('project');
    }
    // 5. User Feedback / Outcomes / Corrections
    else if (lower.includes('feedback') || lower.includes('outcome') || lower.includes('failed during') || lower.includes('failed under load') || lower.includes('correction:')) {
      attribute_key = 'user.feedback.technical';
      type = 'episodic';
      value = text;
      entities.add('feedback');
      entities.add('outcome');
      depends_on.push('project');
    }
    // 6. User Preferences
    else if (lower.includes('prefer') || lower.includes('step-by-step') || lower.includes('simple explanations') || lower.includes('formatting') || lower.includes('dry-run') || lower.includes('changed my preference') || lower.includes('detailed explanations')) {
      attribute_key = 'user.pref.response_style';
      type = 'episodic';
      if (lower.includes('very short answers')) {
        value = 'Very short answers in simple language';
      } else if (lower.includes('detailed explanations with examples') || lower.includes('detailed explanations')) {
        value = 'Detailed explanations with examples';
      } else if (lower.includes('simple') && lower.includes('practical examples')) {
        value = 'Simple explanations with practical examples';
      } else {
        value = text;
      }
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

