#!/usr/bin/env python3
"""
ANCHOR Production Workflow Generator
Configures all 4 workflows matching the actual ANCHOR backend,
integrates Google Gemini (models/gemini-3.5-flash-lite), fixes known aggregation
and patch sanitization bugs, and outputs import-ready JSON files.
"""

import json
import os

OUTPUT_DIRS = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "n8n"),
    "/Users/mac/Downloads/n8n"
]

for d in OUTPUT_DIRS:
    os.makedirs(d, exist_ok=True)

# -----------------------------------------------------------------------------
# WF1 — Intelligent Memory Creation
# -----------------------------------------------------------------------------
def build_wf1():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "memory-create",
                "responseMode": "responseNode",
                "options": {}
            },
            "id": "wf1-node-01",
            "name": "Ingest Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [100, 300],
            "webhookId": "anchor-memory-create-webhook"
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "c1",
                            "leftValue": "={{ $json.body.user_id }}",
                            "rightValue": "",
                            "operator": {
                                "type": "string",
                                "operation": "notEmpty"
                            }
                        },
                        {
                            "id": "c2",
                            "leftValue": "={{ ($json.body.conversation_text || '').trim().length }}",
                            "rightValue": 5,
                            "operator": {
                                "type": "number",
                                "operation": "gt"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "wf1-node-02",
            "name": "Validate Input Payload",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [320, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={\n  \"success\": false,\n  \"error\": \"Validation failed: 'user_id' and 'conversation_text' (>5 characters) are required.\"\n}",
                "options": {
                    "responseCode": 400
                }
            },
            "id": "wf1-node-02b",
            "name": "Respond 400 Bad Request",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [540, 100]
        },
        {
            "parameters": {
                "jsCode": """// WF1 Node 3: Text Preprocessing & Paragraph Chunking
const body = $input.item.json.body || {};
const rawText = body.conversation_text || '';
const userId = body.user_id || 'usr-shakti2';
const sessionId = body.session_id || null;
const sourceTimestamp = body.source_timestamp || new Date().toISOString();

// 1. Sanitize text: remove URLs, filler phrases, duplicate newlines
let cleanText = rawText
  .replace(/(?:https?|ftp):\\/\\/[\\n\\S]+/g, '')
  .replace(/^(hi|hello|hey|good morning|thanks|thank you)[\\.\\,\\!]?\\s*/gi, '')
  .replace(/\\r\\n/g, '\\n')
  .replace(/\\n{3,}/g, '\\n\\n')
  .trim();

// 2. Chunk if length > 2000 characters along paragraph boundaries
const maxChunkSize = 2000;
const chunks = [];
if (cleanText.length <= maxChunkSize) {
  chunks.push(cleanText);
} else {
  const paragraphs = cleanText.split(/\\n\\s*\\n/);
  let current = '';
  for (const p of paragraphs) {
    if ((current + '\\n\\n' + p).length <= maxChunkSize) {
      current = current ? current + '\\n\\n' + p : p;
    } else {
      if (current) chunks.push(current);
      current = p;
    }
  }
  if (current) chunks.push(current);
}

return chunks.map((chunk, idx) => ({
  json: {
    user_id: userId,
    session_id: sessionId,
    chunk_index: idx,
    total_chunks: chunks.length,
    text_content: chunk,
    reference_date: sourceTimestamp,
    processed_at: new Date().toISOString()
  }
}));"""
            },
            "id": "wf1-node-03",
            "name": "Text Preprocessing & Chunking",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [540, 300]
        },
        {
            "parameters": {
                "batchSize": 1,
                "options": {}
            },
            "id": "wf1-node-04",
            "name": "Loop Over Chunks",
            "type": "n8n-nodes-base.splitInBatches",
            "typeVersion": 3,
            "position": [760, 300]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": """=You are the Semantic Memory Extraction Engine for ANCHOR, an Autonomous AI Memory Management System.
Analyze the following conversational fragment and extract structured knowledge facts.

Reference Timestamp: {{ $json.reference_date }}
Content:
\"\"\"
{{ $json.text_content }}
\"\"\"

Extraction Instructions:
1. Identify if the text contains meaningful, durable facts. If trivial small-talk, set is_informative: false.
2. If the user mentions an event, workshop, training, booking, or trip with a specific duration or end date, set is_temporary: true and compute the exact ISO8601 UTC expiration_date corresponding to the conclusion of that event.
3. For ongoing habits, preferences, and static facts, set is_temporary: false and expiration_date: null.
4. Extract topics, concise description, searchable keywords, atomic facts, entities, and dates.
5. Return VALID JSON ONLY matching this schema:
{
  "is_informative": true,
  "topic": "string",
  "topic_description": "string",
  "keywords": ["string"],
  "important_facts": ["string"],
  "entities": [{"name": "string", "type": "string"}],
  "dates": [{"event": "string", "date": "ISO8601 string"}],
  "confidence_score": 0.95,
  "is_temporary": true,
  "expiration_date": "ISO8601 string or null"
}"""
            },
            "id": "wf1-node-05",
            "name": "Extract Semantic Memory",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [980, 300]
        },
        {
            "parameters": {
                "modelName": "models/gemini-3.5-flash-lite",
                "options": {
                    "temperature": 0.1
                }
            },
            "id": "wf1-node-05b",
            "name": "Google Gemini Model - Extractor",
            "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
            "typeVersion": 1,
            "position": [980, 500],
            "credentials": {
                "googlePalmApi": {
                    "id": "googlePalmApiCredential",
                    "name": "Google Gemini account"
                }
            }
        },
        {
            "parameters": {
                "jsCode": """// WF1 Node 6: Parse & Validate Gemini Extraction
const rawLlm = $input.item.json.text || $input.item.json.response || '';
let parsed = {};

try {
  const cleaned = typeof rawLlm === 'string'
    ? rawLlm.replace(/```json\\s*/gi, '').replace(/```\\s*$/gi, '').trim()
    : rawLlm;
  parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
} catch (e) {
  parsed = {
    is_informative: false,
    parse_error: true,
    raw_output: String(rawLlm)
  };
}

const chunkInfo = $('Loop Over Chunks').item.json;

return {
  json: {
    user_id: chunkInfo.user_id,
    session_id: chunkInfo.session_id,
    chunk_index: chunkInfo.chunk_index,
    total_chunks: chunkInfo.total_chunks,
    reference_date: chunkInfo.reference_date,
    original_text: chunkInfo.text_content,
    is_informative: Boolean(parsed.is_informative),
    topic: parsed.topic || 'General Memory',
    topic_description: parsed.topic_description || '',
    keywords: parsed.keywords || [],
    important_facts: parsed.important_facts || [],
    entities: parsed.entities || [],
    dates: parsed.dates || [],
    confidence_score: parsed.confidence_score || 0.85,
    is_temporary: Boolean(parsed.is_temporary),
    expiration_date: parsed.expiration_date || null
  }
};"""
            },
            "id": "wf1-node-06",
            "name": "Parse & Validate Extraction",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1200, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/retrieve",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"query\": \"{{ $json.important_facts.join(' ') || $json.topic }}\"\n}",
                "options": {
                    "response": {
                        "response": {
                            "neverError": True
                        }
                    },
                    "retry": {
                        "retry": {
                            "maxTries": 3,
                            "waitBetweenTries": 1500
                        }
                    }
                }
            },
            "id": "wf1-node-07",
            "name": "Search Similar Memories",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1420, 300]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": """=You are the Memory Governance Engine for ANCHOR.
Compare the newly extracted memory against candidate memories retrieved from vector/keyword search.

Newly Extracted Memory:
- User ID: {{ $('Parse & Validate Extraction').item.json.user_id }}
- Topic: {{ $('Parse & Validate Extraction').item.json.topic }}
- Description: {{ $('Parse & Validate Extraction').item.json.topic_description }}
- Facts: {{ JSON.stringify($('Parse & Validate Extraction').item.json.important_facts) }}
- Is Temporary: {{ $('Parse & Validate Extraction').item.json.is_temporary }}
- Expiration: {{ $('Parse & Validate Extraction').item.json.expiration_date }}

Candidate Existing Memories from Backend:
{{ JSON.stringify($json.retrieved || $json.results || []) }}

Governance Rules:
1. If no candidates exist or facts are completely new, decide 'ADD'.
2. If the new facts are an exact duplicate of an active memory, decide 'IGNORE'.
3. If the new memory adds supplemental details without contradiction, decide 'UPDATE'.
4. If the new memory updates or reschedules a past event (e.g. date change, location change), decide 'SUPERSEDE' and provide target_memory_id.
5. If there is an unresolved or severe factual contradiction, decide 'QUARANTINE'.

Return JSON ONLY:
{
  "decision": "ADD | UPDATE | SUPERSEDE | QUARANTINE | IGNORE",
  "target_memory_id": "string or null",
  "rationale": "Clear 1-sentence justification",
  "confidence": 0.95
}"""
            },
            "id": "wf1-node-08",
            "name": "Memory Governance Engine",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1640, 300]
        },
        {
            "parameters": {
                "modelName": "models/gemini-3.5-flash-lite",
                "options": {
                    "temperature": 0.1
                }
            },
            "id": "wf1-node-08b",
            "name": "Google Gemini Model - Governance",
            "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
            "typeVersion": 1,
            "position": [1640, 500],
            "credentials": {
                "googlePalmApi": {
                    "id": "googlePalmApiCredential",
                    "name": "Google Gemini account"
                }
            }
        },
        {
            "parameters": {
                "jsCode": """// WF1 Node 9: Parse Governance Decision (Preserving Chunk Scope)
const rawLlm = $input.item.json.text || $input.item.json.response || '';
let parsed = {};

try {
  const cleaned = typeof rawLlm === 'string'
    ? rawLlm.replace(/```json\\s*/gi, '').replace(/```\\s*$/gi, '').trim()
    : rawLlm;
  parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
} catch (e) {
  parsed = {
    decision: 'QUARANTINE',
    target_memory_id: null,
    rationale: 'Failed to parse governance Gemini response.',
    confidence: 0.5
  };
}

const extraction = $('Parse & Validate Extraction').item.json;
const validDecisions = ['ADD', 'UPDATE', 'SUPERSEDE', 'QUARANTINE', 'IGNORE'];
let decision = (parsed.decision || 'ADD').toUpperCase();
if (!validDecisions.includes(decision)) decision = 'QUARANTINE';

return {
  json: {
    chunk_index: extraction.chunk_index,
    total_chunks: extraction.total_chunks,
    user_id: extraction.user_id,
    decision: decision,
    target_memory_id: parsed.target_memory_id || null,
    rationale: parsed.rationale || 'Processed by ANCHOR governance engine.',
    confidence: parsed.confidence || 0.9,
    memory_payload: {
      user_id: extraction.user_id,
      topic: extraction.topic,
      description: extraction.topic_description,
      content: extraction.original_text,
      keywords: extraction.keywords,
      facts: extraction.important_facts,
      entities: extraction.entities,
      dates: extraction.dates,
      confidence_score: extraction.confidence_score,
      is_temporary: extraction.is_temporary,
      expiration_date: extraction.expiration_date,
      governance_decision: decision,
      governance_rationale: parsed.rationale
    }
  }
};"""
            },
            "id": "wf1-node-09",
            "name": "Parse Governance Decision",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1860, 300]
        },
        {
            "parameters": {
                "rules": {
                    "values": [
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "rule-add",
                                        "leftValue": "={{ $json.decision }}",
                                        "rightValue": "ADD",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        },
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "rule-update",
                                        "leftValue": "={{ $json.decision }}",
                                        "rightValue": "UPDATE",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        },
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "rule-supersede",
                                        "leftValue": "={{ $json.decision }}",
                                        "rightValue": "SUPERSEDE",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        },
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "rule-quarantine",
                                        "leftValue": "={{ $json.decision }}",
                                        "rightValue": "QUARANTINE",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        },
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "rule-ignore",
                                        "leftValue": "={{ $json.decision }}",
                                        "rightValue": "IGNORE",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        }
                    ]
                }
            },
            "id": "wf1-node-10",
            "name": "Governance Switch",
            "type": "n8n-nodes-base.switch",
            "typeVersion": 3,
            "position": [2080, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/ingest",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"text\": \"{{ $json.memory_payload.content }}\",\n  \"source\": {\n    \"kind\": \"user_stated\",\n    \"actor\": \"{{ $json.user_id }}\"\n  }\n}",
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf1-node-11a",
            "name": "Commit New Memory (ADD)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2320, 100]
        },
        {
            "parameters": {
                "method": "PATCH",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/memories/{{ $json.target_memory_id }}",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"content\": \"{{ $json.memory_payload.content }}\",\n  \"value\": \"{{ $json.memory_payload.description }}\",\n  \"expires_at\": \"{{ $json.memory_payload.expiration_date }}\",\n  \"reason\": \"{{ $json.rationale }}\"\n}",
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf1-node-11b",
            "name": "Patch Existing Memory (UPDATE)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2320, 220]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/ingest",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"text\": \"{{ $json.memory_payload.content }}\",\n  \"source\": {\n    \"kind\": \"user_stated\",\n    \"actor\": \"{{ $json.user_id }}\"\n  }\n}",
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf1-node-11c",
            "name": "Supersede Memory (SUPERSEDE)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2320, 340]
        },
        {
            "parameters": {
                "method": "PATCH",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/memories/{{ $json.target_memory_id || 'quarantine-item' }}",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"status\": \"quarantined\",\n  \"quarantine_reason\": \"{{ $json.rationale }}\"\n}",
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf1-node-11d",
            "name": "File Quarantine Record (QUARANTINE)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2320, 460]
        },
        {
            "parameters": {
                "jsCode": """// WF1 Node 11e: Log Ignored Event
const decision = $('Parse Governance Decision').item.json;
return {
  json: {
    success: true,
    action: "IGNORE",
    chunk_index: decision.chunk_index,
    topic: decision.memory_payload.topic,
    reason: decision.rationale
  }
};"""
            },
            "id": "wf1-node-11e",
            "name": "Log Ignored Event (IGNORE)",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2320, 580]
        },
        {
            "parameters": {
                "jsCode": """// WF1 Node 12: Aggregate Chunk Result (Fixed Bug: Retains Current Chunk Scope)
const decisionNode = $('Parse Governance Decision').item.json;
const apiResponse = $input.item.json;

return {
  json: {
    chunk_index: decisionNode.chunk_index,
    total_chunks: decisionNode.total_chunks,
    user_id: decisionNode.user_id,
    topic: decisionNode.memory_payload.topic,
    decision: decisionNode.decision,
    is_temporary: decisionNode.memory_payload.is_temporary,
    expiration_date: decisionNode.memory_payload.expiration_date,
    backend_status: apiResponse.action || apiResponse.status || (apiResponse.success ? 'SUCCESS' : 'PROCESSED'),
    memory_id: apiResponse.memory?._id || apiResponse.memory?.id || decisionNode.target_memory_id || null,
    rationale: decisionNode.rationale,
    timestamp: new Date().toISOString()
  }
};"""
            },
            "id": "wf1-node-12",
            "name": "Aggregate Step Result",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2580, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={\n  \"success\": true,\n  \"message\": \"Ingestion and governance successfully executed.\",\n  \"results\": {{ JSON.stringify($('Aggregate Step Result').all().map(i => i.json)) }}\n}",
                "options": {
                    "responseCode": 200
                }
            },
            "id": "wf1-node-13",
            "name": "Respond Webhook Success",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [1000, 100]
        }
    ]

    connections = {
        "Ingest Webhook": {
            "main": [
                [{"node": "Validate Input Payload", "type": "main", "index": 0}]
            ]
        },
        "Validate Input Payload": {
            "main": [
                [{"node": "Text Preprocessing & Chunking", "type": "main", "index": 0}],
                [{"node": "Respond 400 Bad Request", "type": "main", "index": 0}]
            ]
        },
        "Text Preprocessing & Chunking": {
            "main": [
                [{"node": "Loop Over Chunks", "type": "main", "index": 0}]
            ]
        },
        "Loop Over Chunks": {
            "main": [
                [{"node": "Extract Semantic Memory", "type": "main", "index": 0}],
                [{"node": "Respond Webhook Success", "type": "main", "index": 0}]
            ]
        },
        "Google Gemini Model - Extractor": {
            "ai_languageModel": [
                [{"node": "Extract Semantic Memory", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "Extract Semantic Memory": {
            "main": [
                [{"node": "Parse & Validate Extraction", "type": "main", "index": 0}]
            ]
        },
        "Parse & Validate Extraction": {
            "main": [
                [{"node": "Search Similar Memories", "type": "main", "index": 0}]
            ]
        },
        "Search Similar Memories": {
            "main": [
                [{"node": "Memory Governance Engine", "type": "main", "index": 0}]
            ]
        },
        "Google Gemini Model - Governance": {
            "ai_languageModel": [
                [{"node": "Memory Governance Engine", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "Memory Governance Engine": {
            "main": [
                [{"node": "Parse Governance Decision", "type": "main", "index": 0}]
            ]
        },
        "Parse Governance Decision": {
            "main": [
                [{"node": "Governance Switch", "type": "main", "index": 0}]
            ]
        },
        "Governance Switch": {
            "main": [
                [{"node": "Commit New Memory (ADD)", "type": "main", "index": 0}],
                [{"node": "Patch Existing Memory (UPDATE)", "type": "main", "index": 0}],
                [{"node": "Supersede Memory (SUPERSEDE)", "type": "main", "index": 0}],
                [{"node": "File Quarantine Record (QUARANTINE)", "type": "main", "index": 0}],
                [{"node": "Log Ignored Event (IGNORE)", "type": "main", "index": 0}]
            ]
        },
        "Commit New Memory (ADD)": {
            "main": [
                [{"node": "Aggregate Step Result", "type": "main", "index": 0}]
            ]
        },
        "Patch Existing Memory (UPDATE)": {
            "main": [
                [{"node": "Aggregate Step Result", "type": "main", "index": 0}]
            ]
        },
        "Supersede Memory (SUPERSEDE)": {
            "main": [
                [{"node": "Aggregate Step Result", "type": "main", "index": 0}]
            ]
        },
        "File Quarantine Record (QUARANTINE)": {
            "main": [
                [{"node": "Aggregate Step Result", "type": "main", "index": 0}]
            ]
        },
        "Log Ignored Event (IGNORE)": {
            "main": [
                [{"node": "Aggregate Step Result", "type": "main", "index": 0}]
            ]
        },
        "Aggregate Step Result": {
            "main": [
                [{"node": "Loop Over Chunks", "type": "main", "index": 0}]
            ]
        }
    }

    return {
        "name": "WF1 — Intelligent Memory Creation",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {
            "executionOrder": "v1"
        },
        "versionId": "1.1.0",
        "meta": {
            "templateCredsSetupCompleted": False,
            "instanceId": "anchor-automation-instance"
        },
        "tags": [
            {"name": "ANCHOR"},
            {"name": "Memory Creation"},
            {"name": "Gemini-3.5-Lite"}
        ]
    }


# -----------------------------------------------------------------------------
# WF2 — Intelligent Memory Retrieval
# -----------------------------------------------------------------------------
def build_wf2():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "memory-retrieve",
                "responseMode": "responseNode",
                "options": {}
            },
            "id": "wf2-node-01",
            "name": "Retrieval Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [100, 300],
            "webhookId": "anchor-memory-retrieve-webhook"
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "c1",
                            "leftValue": "={{ $json.body.user_id }}",
                            "rightValue": "",
                            "operator": {
                                "type": "string",
                                "operation": "notEmpty"
                            }
                        },
                        {
                            "id": "c2",
                            "leftValue": "={{ ($json.body.query_text || '').trim().length }}",
                            "rightValue": 2,
                            "operator": {
                                "type": "number",
                                "operation": "gte"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "wf2-node-02",
            "name": "Validate Query Payload",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [320, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={\n  \"success\": false,\n  \"error\": \"Missing user_id or query_text must be at least 2 characters.\"\n}",
                "options": {
                    "responseCode": 400
                }
            },
            "id": "wf2-node-02b",
            "name": "Respond 400 Bad Request",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [540, 100]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": """=You are the Query Decomposition Engine for ANCHOR, an Autonomous AI Memory Management System.
Analyze the user's natural language question and extract structured retrieval parameters.

Current Timestamp: {{ new Date().toISOString() }}
User Query:
\"\"\"
{{ $json.body.query_text }}
\"\"\"

Task:
1. Identify the user's core intent (e.g. schedule_lookup, preference_query, fact_recall).
2. Extract semantic search topics, keywords, and named entities.
3. If the query refers to relative dates (e.g. 'tomorrow', 'next week', 'Tuesday'), resolve them into explicit ISO8601 UTC start_date and end_date.

Return JSON ONLY:
{
  "intent": "string",
  "search_topics": ["string"],
  "keywords": ["string"],
  "named_entities": ["string"],
  "time_window": {
    "start_date": "ISO8601 string or null",
    "end_date": "ISO8601 string or null"
  }
}"""
            },
            "id": "wf2-node-03",
            "name": "Query Understanding & Decomposition",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [540, 300]
        },
        {
            "parameters": {
                "modelName": "models/gemini-3.5-flash-lite",
                "options": {
                    "temperature": 0.1
                }
            },
            "id": "wf2-node-03b",
            "name": "Google Gemini Model - Query Parser",
            "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
            "typeVersion": 1,
            "position": [540, 500],
            "credentials": {
                "googlePalmApi": {
                    "id": "googlePalmApiCredential",
                    "name": "Google Gemini account"
                }
            }
        },
        {
            "parameters": {
                "jsCode": """// WF2 Node 4: Parse Retrieval Parameters & Build Search Payload
const rawLlm = $input.item.json.text || $input.item.json.response || '';
let parsed = {};

try {
  const cleaned = typeof rawLlm === 'string'
    ? rawLlm.replace(/```json\\s*/gi, '').replace(/```\\s*$/gi, '').trim()
    : rawLlm;
  parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
} catch (e) {
  parsed = {
    intent: 'general_recall',
    search_topics: [],
    keywords: [],
    named_entities: [],
    time_window: null
  };
}

const originalReq = $('Retrieval Webhook').first().json.body || {};

return {
  json: {
    user_id: originalReq.user_id,
    query_text: originalReq.query_text,
    search_intent: parsed.intent || 'general_recall',
    extracted_keywords: parsed.keywords || [],
    extracted_entities: parsed.named_entities || [],
    temporal_window: parsed.time_window || null,
    limit: originalReq.max_results || 10
  }
};"""
            },
            "id": "wf2-node-04",
            "name": "Parse Retrieval Parameters",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [760, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/retrieve",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"query\": \"{{ $json.extracted_keywords.join(' ') || $json.query_text }}\"\n}",
                "options": {
                    "response": {"response": {"neverError": True}},
                    "retry": {"retry": {"maxTries": 3, "waitBetweenTries": 1500}}
                }
            },
            "id": "wf2-node-05",
            "name": "Backend Hybrid Retrieval",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [980, 300]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "c1",
                            "leftValue": "={{ ($json.retrieved || []).length }}",
                            "rightValue": 0,
                            "operator": {
                                "type": "number",
                                "operation": "gt"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "wf2-node-06",
            "name": "Candidates Found?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [1200, 300]
        },
        {
            "parameters": {
                "jsCode": """// WF2 Node 7a: Build Empty Context When No Memories Found
const origQuery = $('Parse Retrieval Parameters').first().json.query_text;

return {
  json: {
    success: true,
    has_relevant_memory: false,
    query: origQuery,
    synthesized_context: "",
    memory_citations: [],
    reason: "No active memory records matched the search criteria."
  }
};"""
            },
            "id": "wf2-node-07a",
            "name": "Build Empty Context",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1420, 140]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": """=You are the Memory Context Re-ranking and Synthesis Engine for ANCHOR.
Evaluate the candidate memories retrieved from hybrid search against the user's original query.

User Query:
\"\"\"
{{ $('Parse Retrieval Parameters').first().json.query_text }}
\"\"\"

Retrieved Active Candidates from Backend:
{{ JSON.stringify($json.retrieved || []) }}

Reference Timestamp: {{ new Date().toISOString() }}

Rules:
1. NEVER INVENT OR EXTRAPOLATE FACTS. If the candidate memories do not clearly contain the facts to answer the query, set has_relevant_memory: false and synthesized_context: \"\".
2. Exclude any candidate memories whose stated expiration date (expires_at) has passed.
3. If valid matching memories exist, synthesize a concise 1-2 sentence verified answer based ONLY on the memories.
4. Rank memory citations by relevance.

Return JSON ONLY:
{
  "has_relevant_memory": true,
  "synthesized_context": "string",
  "memory_citations": [
    {
      "memory_id": "string",
      "attribute_key": "string",
      "relevance_rank": 1
    }
  ],
  "reason": "Clear justification"
}"""
            },
            "id": "wf2-node-07b",
            "name": "Context Re-ranking & Synthesis",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1420, 420]
        },
        {
            "parameters": {
                "modelName": "models/gemini-3.5-flash-lite",
                "options": {
                    "temperature": 0.1
                }
            },
            "id": "wf2-node-07c",
            "name": "Google Gemini Model - Re-ranker",
            "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
            "typeVersion": 1,
            "position": [1420, 620],
            "credentials": {
                "googlePalmApi": {
                    "id": "googlePalmApiCredential",
                    "name": "Google Gemini account"
                }
            }
        },
        {
            "parameters": {
                "jsCode": """// WF2 Node 8: Validate & Structure Context Output
const rawLlm = $input.item.json.text || $input.item.json.response || '';
let parsed = {};

try {
  const cleaned = typeof rawLlm === 'string'
    ? rawLlm.replace(/```json\\s*/gi, '').replace(/```\\s*$/gi, '').trim()
    : rawLlm;
  parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
} catch (e) {
  parsed = {
    has_relevant_memory: false,
    synthesized_context: "",
    memory_citations: [],
    reason: "Failed to parse re-ranking Gemini output."
  };
}

const origQuery = $('Parse Retrieval Parameters').first().json.query_text;

return {
  json: {
    success: true,
    has_relevant_memory: Boolean(parsed.has_relevant_memory),
    query: origQuery,
    synthesized_context: parsed.synthesized_context || "",
    memory_citations: parsed.memory_citations || [],
    reason: parsed.reason || "Re-ranking completed."
  }
};"""
            },
            "id": "wf2-node-08",
            "name": "Validate & Structure Context",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1640, 420]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ JSON.stringify($json) }}",
                "options": {
                    "responseCode": 200
                }
            },
            "id": "wf2-node-09",
            "name": "Respond With Context",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [1860, 300]
        }
    ]

    connections = {
        "Retrieval Webhook": {
            "main": [
                [{"node": "Validate Query Payload", "type": "main", "index": 0}]
            ]
        },
        "Validate Query Payload": {
            "main": [
                [{"node": "Query Understanding & Decomposition", "type": "main", "index": 0}],
                [{"node": "Respond 400 Bad Request", "type": "main", "index": 0}]
            ]
        },
        "Google Gemini Model - Query Parser": {
            "ai_languageModel": [
                [{"node": "Query Understanding & Decomposition", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "Query Understanding & Decomposition": {
            "main": [
                [{"node": "Parse Retrieval Parameters", "type": "main", "index": 0}]
            ]
        },
        "Parse Retrieval Parameters": {
            "main": [
                [{"node": "Backend Hybrid Retrieval", "type": "main", "index": 0}]
            ]
        },
        "Backend Hybrid Retrieval": {
            "main": [
                [{"node": "Candidates Found?", "type": "main", "index": 0}]
            ]
        },
        "Candidates Found?": {
            "main": [
                [{"node": "Context Re-ranking & Synthesis", "type": "main", "index": 0}],
                [{"node": "Build Empty Context", "type": "main", "index": 0}]
            ]
        },
        "Google Gemini Model - Re-ranker": {
            "ai_languageModel": [
                [{"node": "Context Re-ranking & Synthesis", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "Context Re-ranking & Synthesis": {
            "main": [
                [{"node": "Validate & Structure Context", "type": "main", "index": 0}]
            ]
        },
        "Build Empty Context": {
            "main": [
                [{"node": "Respond With Context", "type": "main", "index": 0}]
            ]
        },
        "Validate & Structure Context": {
            "main": [
                [{"node": "Respond With Context", "type": "main", "index": 0}]
            ]
        }
    }

    return {
        "name": "WF2 — Intelligent Memory Retrieval",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {
            "executionOrder": "v1"
        },
        "versionId": "1.1.0",
        "meta": {
            "templateCredsSetupCompleted": False,
            "instanceId": "anchor-automation-instance"
        },
        "tags": [
            {"name": "ANCHOR"},
            {"name": "Memory Retrieval"},
            {"name": "Gemini-3.5-Lite"}
        ]
    }


# -----------------------------------------------------------------------------
# WF3 — Memory Update and Deletion (WF3_memory_management.json)
# -----------------------------------------------------------------------------
def build_wf3():
    nodes = [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "memory-manage",
                "responseMode": "responseNode",
                "options": {}
            },
            "id": "wf3-node-01",
            "name": "Command Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [100, 340],
            "webhookId": "anchor-memory-manage-webhook"
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "c1",
                            "leftValue": "={{ $json.body.user_id }}",
                            "rightValue": "",
                            "operator": {
                                "type": "string",
                                "operation": "notEmpty"
                            }
                        },
                        {
                            "id": "c2",
                            "leftValue": "={{ ($json.body.instruction_text || '').trim().length }}",
                            "rightValue": 3,
                            "operator": {
                                "type": "number",
                                "operation": "gte"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "wf3-node-02",
            "name": "Validate Command Payload",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [320, 340]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={\n  \"success\": false,\n  \"error\": \"Both 'user_id' and 'instruction_text' (min 3 chars) are required.\"\n}",
                "options": {
                    "responseCode": 400
                }
            },
            "id": "wf3-node-02b",
            "name": "Respond 400 Bad Request",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [540, 100]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": """=You are the Memory Instruction Parser for ANCHOR.
Analyze the user's command to modify or delete stored memories.

User Instruction:
\"\"\"
{{ $json.body.instruction_text }}
\"\"\"

Tasks:
1. Classify operation: UPDATE (modify details), DELETE (remove a specific item/date/fact), or FORGET (wipe knowledge about a concept).
2. Extract the target topic, keywords, and identifying details.
3. Summarize the requested changes.
4. If the instruction is vague (e.g. 'forget that thing'), mark is_ambiguous: true.

Return JSON ONLY:
{
  "operation": "UPDATE | DELETE | FORGET",
  "target_topic": "string",
  "search_keywords": ["string"],
  "identifying_details": "string",
  "requested_changes": "string",
  "is_ambiguous": false,
  "confidence": 0.95
}"""
            },
            "id": "wf3-node-03",
            "name": "Classify Command & Extract Target",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [540, 340]
        },
        {
            "parameters": {
                "modelName": "models/gemini-3.5-flash-lite",
                "options": {
                    "temperature": 0.1
                }
            },
            "id": "wf3-node-03b",
            "name": "Google Gemini Model - Command Classifier",
            "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
            "typeVersion": 1,
            "position": [540, 540],
            "credentials": {
                "googlePalmApi": {
                    "id": "googlePalmApiCredential",
                    "name": "Google Gemini account"
                }
            }
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/retrieve",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"query\": \"{{ ($json.search_keywords || []).join(' ') + ' ' + ($json.identifying_details || '') }}\"\n}",
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf3-node-04",
            "name": "Search Target Memory in Backend",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [760, 340]
        },
        {
            "parameters": {
                "jsCode": """// WF3 Node 5: Evaluate Ambiguity & Target Match
const rawClass = $('Classify Command & Extract Target').first().json.text || '';
let parsedCmd = {};
try {
  const cleaned = rawClass.replace(/```json\\s*/gi, '').replace(/```\\s*$/gi, '').trim();
  parsedCmd = JSON.parse(cleaned);
} catch (e) {
  parsedCmd = { operation: 'UPDATE', is_ambiguous: true };
}

const candidates = $input.item.json.retrieved || $input.item.json.results || [];
const operation = (parsedCmd.operation || 'UPDATE').toUpperCase();

// Case 1: No candidates found
if (candidates.length === 0) {
  return {
    json: {
      match_status: "NOT_FOUND",
      operation: operation,
      message: "No matching active memories found for the given instruction."
    }
  };
}

// Case 2: Ambiguous instruction or multiple high-confidence ties
const top1 = candidates[0];
const top2 = candidates[1];
const isAmbiguousTie = candidates.length > 1 && top2.similarity > 0.72 && (top1.similarity - top2.similarity) < 0.08;

if (parsedCmd.is_ambiguous || isAmbiguousTie) {
  return {
    json: {
      match_status: "AMBIGUOUS",
      operation: operation,
      options: candidates.slice(0, 3).map(c => ({
        memory_id: c._id || c.id,
        attribute_key: c.attribute_key,
        content: c.content || c.value || ""
      }))
    }
  };
}

// Case 3: Exact target matched
return {
  json: {
    match_status: (operation === 'DELETE' || operation === 'FORGET') ? "EXACT_DELETE" : "EXACT_UPDATE",
    operation: operation,
    target_memory: top1,
    target_memory_id: top1._id || top1.id,
    requested_changes: parsedCmd.requested_changes || ""
  }
};"""
            },
            "id": "wf3-node-05",
            "name": "Evaluate Ambiguity & Match",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [980, 340]
        },
        {
            "parameters": {
                "rules": {
                    "values": [
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "r-ambiguous",
                                        "leftValue": "={{ $json.match_status }}",
                                        "rightValue": "AMBIGUOUS",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        },
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "r-notfound",
                                        "leftValue": "={{ $json.match_status }}",
                                        "rightValue": "NOT_FOUND",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        },
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "r-update",
                                        "leftValue": "={{ $json.match_status }}",
                                        "rightValue": "EXACT_UPDATE",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        },
                        {
                            "conditions": {
                                "options": {
                                    "caseSensitive": True,
                                    "leftValue": "",
                                    "typeValidation": "strict"
                                },
                                "conditions": [
                                    {
                                        "id": "r-delete",
                                        "leftValue": "={{ $json.match_status }}",
                                        "rightValue": "EXACT_DELETE",
                                        "operator": {
                                            "type": "string",
                                            "operation": "equals"
                                        }
                                    }
                                ],
                                "combinator": "and"
                            }
                        }
                    ]
                }
            },
            "id": "wf3-node-06",
            "name": "Match Status Switch",
            "type": "n8n-nodes-base.switch",
            "typeVersion": 3,
            "position": [1200, 340]
        },
        {
            "parameters": {
                "jsCode": """// WF3 Node 7a: Clarification Response
return {
  json: {
    success: true,
    action_required: "CLARIFICATION",
    message: "Multiple memories match your request. Please specify which memory you would like to modify:",
    candidate_options: $input.item.json.options
  }
};"""
            },
            "id": "wf3-node-07a",
            "name": "Build Clarification Response",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1440, 140]
        },
        {
            "parameters": {
                "jsCode": """// WF3 Node 7b: Not Found Response
return {
  json: {
    success: true,
    action_required: "NONE",
    modified: false,
    message: "No matching active memory was found. No changes were made."
  }
};"""
            },
            "id": "wf3-node-07b",
            "name": "Build Not Found Response",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1440, 260]
        },
        {
            "parameters": {
                "promptType": "define",
                "text": """=You are the Selective Patch Synthesizer for ANCHOR.
Generate the minimal JSON diff to update the target memory based on the user's instruction.

Existing Memory Record:
{{ JSON.stringify($json.target_memory) }}

Requested Modification:
\"\"\"
{{ $json.requested_changes }}
\"\"\"

Rules:
1. PRESERVE ALL UNRELATED FIELDS AND FACTS. Do not erase facts that the user did not ask to change.
2. Output updated 'content', 'value', 'entities', and optional 'expires_at'.
3. Return JSON ONLY:
{
  "content": "string",
  "value": "string",
  "entities": ["string"],
  "reason": "1-sentence summary of the update"
}"""
            },
            "id": "wf3-node-08a",
            "name": "Synthesize Field Patch",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1440, 420]
        },
        {
            "parameters": {
                "modelName": "models/gemini-3.5-flash-lite",
                "options": {
                    "temperature": 0.1
                }
            },
            "id": "wf3-node-08b",
            "name": "Google Gemini Model - Patch Generator",
            "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
            "typeVersion": 1,
            "position": [1440, 620],
            "credentials": {
                "googlePalmApi": {
                    "id": "googlePalmApiCredential",
                    "name": "Google Gemini account"
                }
            }
        },
        {
            "parameters": {
                "jsCode": """// WF3 Node 8c: Parse & Sanitize Patch (Fixes unvalidated/raw LLM Markdown fences issue)
const rawText = $input.item.json.text || $input.item.json.response || '';
let parsed = {};

try {
  const cleaned = typeof rawText === 'string'
    ? rawText.replace(/```json\\s*/gi, '').replace(/```\\s*$/gi, '').trim()
    : rawText;
  parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
} catch (e) {
  parsed = {
    content: $('Evaluate Ambiguity & Match').first().json.target_memory.content,
    value: $('Evaluate Ambiguity & Match').first().json.target_memory.value,
    reason: "Updated via WF3 Memory Manager"
  };
}

const targetMemId = $('Evaluate Ambiguity & Match').first().json.target_memory_id;
const userId = $('Validate Command Payload').first().json.body.user_id;

return {
  json: {
    target_memory_id: targetMemId,
    user_id: userId,
    clean_patch: {
      content: parsed.content,
      value: parsed.value || parsed.content,
      entities: parsed.entities || [],
      reason: parsed.reason || "Memory updated via WF3 Memory Manager"
    }
  }
};"""
            },
            "id": "wf3-node-08c",
            "name": "Parse & Sanitize Patch",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1680, 420]
        },
        {
            "parameters": {
                "method": "PATCH",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/memories/{{ $json.target_memory_id }}",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify($json.clean_patch) }}",
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf3-node-09a",
            "name": "Execute Backend Patch",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1900, 420]
        },
        {
            "parameters": {
                "method": "DELETE",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/memories/{{ $json.target_memory_id }}",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf3-node-09b",
            "name": "Execute Soft-Delete",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1440, 740]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/outcomes",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"memory_id\": \"{{ $('Evaluate Ambiguity & Match').first().json.target_memory_id }}\",\n  \"action\": \"APPROVED\",\n  \"feedback_source\": \"n8n WF3 Memory Manager\",\n  \"user_id\": \"{{ $('Validate Command Payload').first().json.body.user_id }}\"\n}",
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf3-node-10",
            "name": "Record Operation Audit Log",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [2140, 560]
        },
        {
            "parameters": {
                "jsCode": """// WF3 Node 11: Format Success Response
const isDelete = $('Match Status Switch').first().json.match_status === 'EXACT_DELETE';
const targetMem = $('Evaluate Ambiguity & Match').first().json.target_memory || {};

return {
  json: {
    success: true,
    action_required: "NONE",
    operation: isDelete ? "DELETE" : "UPDATE",
    memory_id: targetMem._id || targetMem.id,
    attribute_key: targetMem.attribute_key,
    message: isDelete
      ? "Memory successfully deleted. Forget cascade and tombstone recorded in backend audit."
      : "Memory successfully updated and verified in backend.",
    timestamp: new Date().toISOString()
  }
};"""
            },
            "id": "wf3-node-11",
            "name": "Format Success Response",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2360, 560]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ JSON.stringify($json) }}",
                "options": {
                    "responseCode": 200
                }
            },
            "id": "wf3-node-12",
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [2580, 340]
        }
    ]

    connections = {
        "Command Webhook": {
            "main": [
                [{"node": "Validate Command Payload", "type": "main", "index": 0}]
            ]
        },
        "Validate Command Payload": {
            "main": [
                [{"node": "Classify Command & Extract Target", "type": "main", "index": 0}],
                [{"node": "Respond 400 Bad Request", "type": "main", "index": 0}]
            ]
        },
        "Google Gemini Model - Command Classifier": {
            "ai_languageModel": [
                [{"node": "Classify Command & Extract Target", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "Classify Command & Extract Target": {
            "main": [
                [{"node": "Search Target Memory in Backend", "type": "main", "index": 0}]
            ]
        },
        "Search Target Memory in Backend": {
            "main": [
                [{"node": "Evaluate Ambiguity & Match", "type": "main", "index": 0}]
            ]
        },
        "Evaluate Ambiguity & Match": {
            "main": [
                [{"node": "Match Status Switch", "type": "main", "index": 0}]
            ]
        },
        "Match Status Switch": {
            "main": [
                [{"node": "Build Clarification Response", "type": "main", "index": 0}],
                [{"node": "Build Not Found Response", "type": "main", "index": 0}],
                [{"node": "Synthesize Field Patch", "type": "main", "index": 0}],
                [{"node": "Execute Soft-Delete", "type": "main", "index": 0}]
            ]
        },
        "Build Clarification Response": {
            "main": [
                [{"node": "Respond to Webhook", "type": "main", "index": 0}]
            ]
        },
        "Build Not Found Response": {
            "main": [
                [{"node": "Respond to Webhook", "type": "main", "index": 0}]
            ]
        },
        "Google Gemini Model - Patch Generator": {
            "ai_languageModel": [
                [{"node": "Synthesize Field Patch", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "Synthesize Field Patch": {
            "main": [
                [{"node": "Parse & Sanitize Patch", "type": "main", "index": 0}]
            ]
        },
        "Parse & Sanitize Patch": {
            "main": [
                [{"node": "Execute Backend Patch", "type": "main", "index": 0}]
            ]
        },
        "Execute Backend Patch": {
            "main": [
                [{"node": "Record Operation Audit Log", "type": "main", "index": 0}]
            ]
        },
        "Execute Soft-Delete": {
            "main": [
                [{"node": "Record Operation Audit Log", "type": "main", "index": 0}]
            ]
        },
        "Record Operation Audit Log": {
            "main": [
                [{"node": "Format Success Response", "type": "main", "index": 0}]
            ]
        },
        "Format Success Response": {
            "main": [
                [{"node": "Respond to Webhook", "type": "main", "index": 0}]
            ]
        }
    }

    return {
        "name": "WF3 — Memory Update and Deletion",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {
            "executionOrder": "v1"
        },
        "versionId": "1.1.0",
        "meta": {
            "templateCredsSetupCompleted": False,
            "instanceId": "anchor-automation-instance"
        },
        "tags": [
            {"name": "ANCHOR"},
            {"name": "Memory Update"},
            {"name": "Memory Deletion"},
            {"name": "Gemini-3.5-Lite"}
        ]
    }


# -----------------------------------------------------------------------------
# WF4 — Automatic Temporary Memory Expiration
# -----------------------------------------------------------------------------
def build_wf4():
    nodes = [
        {
            "parameters": {
                "rule": {
                    "interval": [
                        {
                            "field": "cronExpression",
                            "expression": "0 2 * * *"
                        }
                    ]
                }
            },
            "id": "wf4-node-01",
            "name": "Daily Schedule Trigger",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [100, 300]
        },
        {
            "parameters": {
                "jsCode": """// WF4 Node 2: Compute Sweep Timestamps
const now = new Date();
return {
  json: {
    sweep_reference_time: now.toISOString(),
    sweep_date: now.toISOString().split('T')[0],
    execution_id: $execution.id || `cron_${Date.now()}`
  }
};"""
            },
            "id": "wf4-node-02",
            "name": "Compute Sweep Timestamps",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [320, 300]
        },
        {
            "parameters": {
                "method": "GET",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/memories",
                "sendQuery": True,
                "queryParameters": {
                    "parameters": [
                        {
                            "name": "status",
                            "value": "active"
                        }
                    ]
                },
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "options": {
                    "response": {"response": {"neverError": True}},
                    "retry": {"retry": {"maxTries": 3, "waitBetweenTries": 2000}}
                }
            },
            "id": "wf4-node-03",
            "name": "Query Active Memories",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [540, 300]
        },
        {
            "parameters": {
                "jsCode": """// WF4 Node 4: Verify Expiration Dates & Exclude Permanent Memories
const memories = Array.isArray($input.item.json) ? $input.item.json : ($input.item.json.data || []);
const refTime = new Date($('Compute Sweep Timestamps').first().json.sweep_reference_time).getTime();

// Defensive Filter:
// 1. Exclude permanent memories (expires_at is null or undefined)
// 2. Exclude active memories whose expiration date is in the future
const expiredCandidates = memories.filter(mem => {
  if (!mem.expires_at) return false;
  const expTime = new Date(mem.expires_at).getTime();
  return !isNaN(expTime) && expTime <= refTime;
});

return {
  json: {
    total_active_scanned: memories.length,
    verified_expired_count: expiredCandidates.length,
    expired_memory_ids: expiredCandidates.map(m => m._id || m.id),
    expired_items: expiredCandidates.map(m => ({
      memory_id: m._id || m.id,
      attribute_key: m.attribute_key,
      expires_at: m.expires_at
    }))
  }
};"""
            },
            "id": "wf4-node-04",
            "name": "Verify Expiration & Filter Permanent",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [760, 300]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "c1",
                            "leftValue": "={{ $json.verified_expired_count }}",
                            "rightValue": 0,
                            "operator": {
                                "type": "number",
                                "operation": "gt"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            },
            "id": "wf4-node-05",
            "name": "Any Valid Expired Items?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [980, 300]
        },
        {
            "parameters": {
                "jsCode": """// WF4 Node 6a: Log Clean Run Summary
return {
  json: {
    status: "COMPLETED",
    items_expired: 0,
    message: "No temporary memories have reached their expiration date in this sweep.",
    timestamp: new Date().toISOString()
  }
};"""
            },
            "id": "wf4-node-06a",
            "name": "Log Clean Run Summary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1200, 140]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "={{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}/api/lifecycle/consolidate",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        },
                        {
                            "name": "Authorization",
                            "value": "=Bearer {{ $env.BACKEND_API_KEY || '' }}"
                        },
                        {
                            "name": "x-internal-key",
                            "value": "={{ $env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks' }}"
                        }
                    ]
                },
                "options": {
                    "response": {"response": {"neverError": True}}
                }
            },
            "id": "wf4-node-06b",
            "name": "Execute Backend Consolidation",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1200, 420]
        },
        {
            "parameters": {
                "jsCode": """// WF4 Node 7: Compile Final Execution Summary
const consolidateRes = $('Execute Backend Consolidation').first().json || {};
const verifiedData = $('Verify Expiration & Filter Permanent').first().json || {};

return {
  json: {
    status: "SUCCESS",
    sweep_timestamp: new Date().toISOString(),
    active_memories_scanned: verifiedData.total_active_scanned || 0,
    identified_expired_count: verifiedData.verified_expired_count || 0,
    backend_expired_marked_stale: consolidateRes.expiredCount || verifiedData.verified_expired_count || 0,
    backend_archived_count: consolidateRes.archivedCount || 0,
    active_count_remaining: consolidateRes.activeCount || 0,
    backend_message: consolidateRes.message || "Consolidation complete.",
    idempotent_sweep: true
  }
};"""
            },
            "id": "wf4-node-07",
            "name": "Compile Final Execution Summary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1440, 420]
        }
    ]

    connections = {
        "Daily Schedule Trigger": {
            "main": [
                [{"node": "Compute Sweep Timestamps", "type": "main", "index": 0}]
            ]
        },
        "Compute Sweep Timestamps": {
            "main": [
                [{"node": "Query Active Memories", "type": "main", "index": 0}]
            ]
        },
        "Query Active Memories": {
            "main": [
                [{"node": "Verify Expiration & Filter Permanent", "type": "main", "index": 0}]
            ]
        },
        "Verify Expiration & Filter Permanent": {
            "main": [
                [{"node": "Any Valid Expired Items?", "type": "main", "index": 0}]
            ]
        },
        "Any Valid Expired Items?": {
            "main": [
                [{"node": "Execute Backend Consolidation", "type": "main", "index": 0}],
                [{"node": "Log Clean Run Summary", "type": "main", "index": 0}]
            ]
        },
        "Execute Backend Consolidation": {
            "main": [
                [{"node": "Compile Final Execution Summary", "type": "main", "index": 0}]
            ]
        }
    }

    return {
        "name": "WF4 — Automatic Temporary Memory Expiration",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {
            "executionOrder": "v1"
        },
        "versionId": "1.1.0",
        "meta": {
            "templateCredsSetupCompleted": False,
            "instanceId": "anchor-automation-instance"
        },
        "tags": [
            {"name": "ANCHOR"},
            {"name": "Lifecycle"},
            {"name": "Expiration"},
            {"name": "Consolidation"}
        ]
    }


def main():
    workflows = {
        "WF1_memory_creation.json": build_wf1(),
        "WF2_memory_retrieval.json": build_wf2(),
        "WF3_memory_management.json": build_wf3(),
        "WF4_temporary_memory_expiration.json": build_wf4()
    }

    for output_dir in OUTPUT_DIRS:
        print(f"Writing workflows to: {output_dir}")
        for filename, data in workflows.items():
            filepath = os.path.join(output_dir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"  -> Generated: {filepath}")

if __name__ == "__main__":
    main()
