/**
 * tokburn — interceptor.js
 * Injected into the page context on claude.ai.
 * Monkey-patches window.fetch to intercept API responses containing SSE token usage data.
 * Posts extracted token counts back to the content script via window.postMessage.
 *
 * CRITICAL: The original fetch response is returned immediately and untouched.
 * All parsing happens on a cloned stream. Errors are swallowed — never break the page.
 */
(function () {
  'use strict';

  if (window.__tokburn_interceptor_installed__) return;
  window.__tokburn_interceptor_installed__ = true;

  const originalFetch = window.fetch;

  window.fetch = function (...args) {
    const request = args[0];
    let url = '';

    try {
      if (typeof request === 'string') {
        url = request;
      } else if (request instanceof Request) {
        url = request.url;
      } else if (request && request.toString) {
        url = request.toString();
      }
    } catch (_) {
      // Fall through — url stays empty, we skip interception
    }

    // Only intercept claude.ai API calls
    const shouldIntercept =
      url.includes('/api/') &&
      (url.includes('claude.ai') || url.startsWith('/'));

    if (!shouldIntercept) {
      return originalFetch.apply(this, args);
    }

    return originalFetch.apply(this, args).then(function (response) {
      try {
        // Clone so original consumer is not affected
        const cloned = response.clone();
        processResponse(cloned, url).catch(function () {
          // Silently ignore processing errors
        });
      } catch (_) {
        // Clone or processing setup failed — ignore
      }
      return response;
    });
  };

  /**
   * Read the cloned response body as an SSE stream and extract token usage.
   */
  async function processResponse(response, url) {
    if (!response.body) return;

    const contentType = response.headers.get('content-type') || '';
    // We care about SSE streams and JSON responses
    const isSSE = contentType.includes('text/event-stream');
    const isJSON = contentType.includes('application/json');

    if (!isSSE && !isJSON) return;

    // Extract conversation ID from the URL if possible
    let conversationId = null;
    try {
      const urlMatch = url.match(/\/api\/organizations\/[^/]+\/chat_conversations\/([^/?]+)/);
      if (urlMatch) {
        conversationId = urlMatch[1];
      }
    } catch (_) {}

    if (isJSON) {
      try {
        const data = await response.json();
        extractUsageFromJSON(data, conversationId);
      } catch (_) {}
      return;
    }

    // SSE stream processing
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreationInputTokens = 0;
    let cacheReadInputTokens = 0;
    let model = null;
    let accumulatedText = '';
    let foundExactCounts = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep last partial line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;

          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);
            const eventType = event.type;

            // Extract model info
            if (!model && event.message && event.message.model) {
              model = event.message.model;
            }

            // message_start — contains input token usage
            if (eventType === 'message_start' && event.message && event.message.usage) {
              const usage = event.message.usage;
              if (typeof usage.input_tokens === 'number') {
                inputTokens = usage.input_tokens;
                foundExactCounts = true;
              }
              if (typeof usage.cache_creation_input_tokens === 'number') {
                cacheCreationInputTokens = usage.cache_creation_input_tokens;
              }
              if (typeof usage.cache_read_input_tokens === 'number') {
                cacheReadInputTokens = usage.cache_read_input_tokens;
              }
            }

            // message_delta — contains output token usage
            if (eventType === 'message_delta' && event.usage) {
              if (typeof event.usage.output_tokens === 'number') {
                outputTokens = event.usage.output_tokens;
                foundExactCounts = true;
              }
            }

            // content_block_delta — accumulate text for fallback estimation
            if (eventType === 'content_block_delta' && event.delta) {
              if (event.delta.type === 'text_delta' && event.delta.text) {
                accumulatedText += event.delta.text;
              }
            }

            // message_stop — final event, may have usage
            if (eventType === 'message_stop') {
              if (event.usage) {
                if (typeof event.usage.input_tokens === 'number') {
                  inputTokens = event.usage.input_tokens;
                  foundExactCounts = true;
                }
                if (typeof event.usage.output_tokens === 'number') {
                  outputTokens = event.usage.output_tokens;
                  foundExactCounts = true;
                }
              }
            }
          } catch (_) {
            // JSON parse failed for this line — skip
          }
        }
      }
    } catch (_) {
      // Stream read error — use whatever we've collected so far
    }

    // Fallback: estimate from accumulated text if no exact counts
    let isEstimate = false;
    if (!foundExactCounts && accumulatedText.length > 0) {
      outputTokens = Math.ceil(accumulatedText.length / 4);
      isEstimate = true;
    }

    // Only post if we have something meaningful
    if (inputTokens > 0 || outputTokens > 0) {
      window.postMessage(
        {
          type: 'TOKBURN_USAGE',
          payload: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_creation_input_tokens: cacheCreationInputTokens,
            cache_read_input_tokens: cacheReadInputTokens,
            is_estimate: isEstimate,
            model: model,
            conversation_id: conversationId,
            timestamp: Date.now(),
          },
        },
        '*'
      );
    }
  }

  /**
   * Handle plain JSON responses that may contain usage data.
   */
  function extractUsageFromJSON(data, conversationId) {
    if (!data || typeof data !== 'object') return;

    let inputTokens = 0;
    let outputTokens = 0;
    let model = data.model || null;

    if (data.usage) {
      inputTokens = data.usage.input_tokens || 0;
      outputTokens = data.usage.output_tokens || 0;
    }

    if (inputTokens > 0 || outputTokens > 0) {
      window.postMessage(
        {
          type: 'TOKBURN_USAGE',
          payload: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
            is_estimate: false,
            model: model,
            conversation_id: conversationId,
            timestamp: Date.now(),
          },
        },
        '*'
      );
    }
  }
})();
