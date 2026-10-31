import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface WF1Payload {
  user_id: string;
  conversation_text: string;
  session_id?: string | null;
  source_timestamp?: string;
  workspace?: string;
}

export interface WF2Payload {
  user_id: string;
  query_text: string;
  workspace?: string;
}

export interface WF3Payload {
  user_id: string;
  instruction_text: string;
  workspace?: string;
}

export interface N8nWorkflowResult<T = any> {
  success: boolean;
  executed_by: 'n8n_workflow' | 'local_engine';
  workflow_id: 'WF1' | 'WF2' | 'WF3';
  data?: T;
  error?: string;
  fallback_reason?: 'n8n_unconfigured' | 'n8n_timeout' | 'n8n_error' | 'validation_failed';
  latency_ms: number;
}

class N8nService {
  private inFlightRequests = new Map<string, Promise<any>>();
  private recentExecutionHashes = new Map<string, number>();
  public lastDispatch: Record<string, { timestamp: string; success: boolean; executed_by: string; error?: string; latency_ms: number }> = {};

  /**
   * Deduplication check to prevent duplicate execution within a 3-second window
   */
  private checkDuplicate(hash: string): boolean {
    const now = Date.now();
    const lastSeen = this.recentExecutionHashes.get(hash);
    if (lastSeen && now - lastSeen < 3000) {
      return true;
    }
    this.recentExecutionHashes.set(hash, now);

    // Housekeeping: clean expired hashes
    if (this.recentExecutionHashes.size > 200) {
      for (const [k, timestamp] of this.recentExecutionHashes.entries()) {
        if (now - timestamp > 5000) {
          this.recentExecutionHashes.delete(k);
        }
      }
    }
    return false;
  }

  /**
   * Generic secure HTTP POST dispatcher to n8n Cloud webhook
   */
  private async dispatchWebhook<T>(
    workflowId: 'WF1' | 'WF2' | 'WF3',
    webhookUrl: string,
    payload: any,
    timeoutMs: number
  ): Promise<N8nWorkflowResult<T>> {
    const start = Date.now();
    const recordResult = (res: N8nWorkflowResult<T>): N8nWorkflowResult<T> => {
      this.lastDispatch[workflowId] = {
        timestamp: new Date().toISOString(),
        success: res.success,
        executed_by: res.executed_by,
        error: res.error,
        latency_ms: res.latency_ms
      };
      return res;
    };

    const targetUrl = (webhookUrl || '').trim();
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return recordResult({
        success: false,
        executed_by: 'local_engine',
        workflow_id: workflowId,
        fallback_reason: 'n8n_unconfigured',
        error: `Webhook URL for ${workflowId} is not configured on this server.`,
        latency_ms: 0
      });
    }

    const payloadStr = JSON.stringify(payload);
    const hash = crypto
      .createHash('sha256')
      .update(`${workflowId}:${payloadStr}`)
      .digest('hex');

    if (this.checkDuplicate(hash)) {
      return recordResult({
        success: false,
        executed_by: 'local_engine',
        workflow_id: workflowId,
        fallback_reason: 'validation_failed',
        error: `Duplicate execution rejected: identical ${workflowId} payload was submitted within 3 seconds.`,
        latency_ms: Date.now() - start
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info({ workflowId, webhookUrl: webhookUrl.replace(/:\/\/.*@/, '://') }, 'Dispatching to n8n webhook');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ANCHOR-Backend-Dispatcher/1.0',
        'x-origin-client': 'anchor-backend',
        'x-execution-context': 'n8n-dispatch'
      };

      if (config.internalApiKey) {
        headers['x-internal-key'] = config.internalApiKey;
      }

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: payloadStr,
        signal: controller.signal
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        logger.warn(
          { workflowId, status: res.status, errorBody: errorBody.slice(0, 200) },
          'n8n webhook returned non-200 status'
        );
        return recordResult({
          success: false,
          executed_by: 'local_engine',
          workflow_id: workflowId,
          fallback_reason: 'n8n_error',
          error: `n8n webhook returned HTTP ${res.status}: ${errorBody.slice(0, 150)}`,
          latency_ms: latencyMs
        });
      }

      let data: T;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = (await res.json()) as T;
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text) as T;
        } catch {
          data = { response: text } as unknown as T;
        }
      }

      logger.info({ workflowId, latencyMs }, 'n8n workflow executed successfully');

      return recordResult({
        success: true,
        executed_by: 'n8n_workflow',
        workflow_id: workflowId,
        data,
        latency_ms: latencyMs
      });
    } catch (err: any) {
      clearTimeout(timer);
      const latencyMs = Date.now() - start;
      const isTimeout = err.name === 'AbortError' || err.code === 20;

      logger.warn(
        { workflowId, isTimeout, error: err.message },
        'n8n webhook dispatch failed, routing to local fallback'
      );

      return recordResult({
        success: false,
        executed_by: 'local_engine',
        workflow_id: workflowId,
        fallback_reason: isTimeout ? 'n8n_timeout' : 'n8n_error',
        error: isTimeout
          ? `n8n ${workflowId} webhook timed out after ${timeoutMs}ms.`
          : `n8n dispatch failed: ${err.message}`,
        latency_ms: latencyMs
      });
    }
  }

  /**
   * Dispatch WF1: Intelligent Memory Creation
   */
  async dispatchWF1(payload: WF1Payload): Promise<N8nWorkflowResult> {
    if (!payload.user_id || typeof payload.user_id !== 'string') {
      return {
        success: false,
        executed_by: 'local_engine',
        workflow_id: 'WF1',
        fallback_reason: 'validation_failed',
        error: 'WF1 requires a valid user_id string.',
        latency_ms: 0
      };
    }

    if (!payload.conversation_text || typeof payload.conversation_text !== 'string' || payload.conversation_text.trim().length <= 5) {
      return {
        success: false,
        executed_by: 'local_engine',
        workflow_id: 'WF1',
        fallback_reason: 'validation_failed',
        error: 'WF1 requires conversation_text longer than 5 characters.',
        latency_ms: 0
      };
    }

    const body = {
      user_id: payload.user_id,
      conversation_text: payload.conversation_text.trim(),
      session_id: payload.session_id || null,
      source_timestamp: payload.source_timestamp || new Date().toISOString()
    };

    return await this.dispatchWebhook(
      'WF1',
      config.n8n.wf1WebhookUrl,
      body,
      config.n8n.timeoutMs
    );
  }

  /**
   * Dispatch WF2: Intelligent Memory Retrieval
   */
  async dispatchWF2(payload: WF2Payload): Promise<N8nWorkflowResult> {
    if (!payload.user_id || typeof payload.user_id !== 'string') {
      return {
        success: false,
        executed_by: 'local_engine',
        workflow_id: 'WF2',
        fallback_reason: 'validation_failed',
        error: 'WF2 requires a valid user_id string.',
        latency_ms: 0
      };
    }

    if (!payload.query_text || typeof payload.query_text !== 'string' || payload.query_text.trim().length < 2) {
      return {
        success: false,
        executed_by: 'local_engine',
        workflow_id: 'WF2',
        fallback_reason: 'validation_failed',
        error: 'WF2 requires query_text of at least 2 characters.',
        latency_ms: 0
      };
    }

    const body = {
      user_id: payload.user_id,
      query_text: payload.query_text.trim()
    };

    return await this.dispatchWebhook(
      'WF2',
      config.n8n.wf2WebhookUrl,
      body,
      config.n8n.timeoutMs
    );
  }

  /**
   * Dispatch WF3: Memory Management (Update & Deletion)
   */
  async dispatchWF3(payload: WF3Payload): Promise<N8nWorkflowResult> {
    if (!payload.user_id || typeof payload.user_id !== 'string') {
      return {
        success: false,
        executed_by: 'local_engine',
        workflow_id: 'WF3',
        fallback_reason: 'validation_failed',
        error: 'WF3 requires a valid user_id string.',
        latency_ms: 0
      };
    }

    if (!payload.instruction_text || typeof payload.instruction_text !== 'string' || payload.instruction_text.trim().length < 3) {
      return {
        success: false,
        executed_by: 'local_engine',
        workflow_id: 'WF3',
        fallback_reason: 'validation_failed',
        error: 'WF3 requires instruction_text of at least 3 characters.',
        latency_ms: 0
      };
    }

    const body = {
      user_id: payload.user_id,
      instruction_text: payload.instruction_text.trim()
    };

    return await this.dispatchWebhook(
      'WF3',
      config.n8n.wf3WebhookUrl,
      body,
      config.n8n.timeoutMs
    );
  }
}

export const n8nService = new N8nService();
