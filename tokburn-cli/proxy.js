const http = require('http');
const https = require('https');
const { URL } = require('url');
const { logUsage } = require('./tracker');
const { getConfig } = require('./config');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function extractUsageFromSSE(buffer) {
  // Parse buffered SSE data to extract usage information
  const text = buffer.toString('utf8');
  const lines = text.split('\n');
  let model = null;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const jsonStr = line.slice(6).trim();
    if (jsonStr === '[DONE]') continue;

    try {
      const data = JSON.parse(jsonStr);

      // message_start contains model and initial usage
      if (data.type === 'message_start' && data.message) {
        model = data.message.model || model;
        if (data.message.usage) {
          inputTokens = data.message.usage.input_tokens || 0;
        }
      }

      // message_delta contains final usage
      if (data.type === 'message_delta' && data.usage) {
        outputTokens = data.usage.output_tokens || 0;
      }

      // Also check for content_block_delta model info
      if (data.model) {
        model = data.model;
      }
    } catch {
      // Skip unparseable lines
    }
  }

  return { model, input_tokens: inputTokens, output_tokens: outputTokens };
}

function extractUsageFromJSON(buffer) {
  try {
    const data = JSON.parse(buffer.toString('utf8'));
    const model = data.model || null;
    let inputTokens = 0;
    let outputTokens = 0;

    if (data.usage) {
      inputTokens = data.usage.input_tokens || 0;
      outputTokens = data.usage.output_tokens || 0;
    }

    return { model, input_tokens: inputTokens, output_tokens: outputTokens };
  } catch {
    return null;
  }
}

function extractConversationId(reqHeaders, reqBody) {
  // Try to extract conversation/session ID from request metadata
  try {
    if (reqHeaders['x-conversation-id']) return reqHeaders['x-conversation-id'];
    if (reqHeaders['x-session-id']) return reqHeaders['x-session-id'];
    if (reqBody) {
      const body = JSON.parse(reqBody.toString('utf8'));
      if (body.metadata && body.metadata.conversation_id) return body.metadata.conversation_id;
      if (body.metadata && body.metadata.session_id) return body.metadata.session_id;
    }
  } catch {
    // Ignore
  }
  return null;
}

function createProxy(config) {
  const targetUrl = new URL(config.target || 'https://api.anthropic.com');
  const port = config.port || 4088;

  const server = http.createServer((clientReq, clientRes) => {
    const startTime = Date.now();

    // Collect request body
    const reqChunks = [];
    clientReq.on('data', (chunk) => reqChunks.push(chunk));
    clientReq.on('end', () => {
      const reqBody = Buffer.concat(reqChunks);
      const conversationId = extractConversationId(clientReq.headers, reqBody);

      // Build upstream request options
      const isHTTPS = targetUrl.protocol === 'https:';
      const mod = isHTTPS ? https : http;

      const upstreamHeaders = { ...clientReq.headers };
      // Update host header for upstream
      upstreamHeaders.host = targetUrl.host;
      // Remove hop-by-hop headers that shouldn't be forwarded
      delete upstreamHeaders['connection'];
      delete upstreamHeaders['keep-alive'];
      delete upstreamHeaders['transfer-encoding'];

      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHTTPS ? 443 : 80),
        path: clientReq.url,
        method: clientReq.method,
        headers: upstreamHeaders,
      };

      const upstreamReq = mod.request(options, (upstreamRes) => {
        const contentType = upstreamRes.headers['content-type'] || '';
        const isStreaming = contentType.includes('text/event-stream');

        // Forward status and headers to client immediately
        const responseHeaders = { ...upstreamRes.headers };
        // Remove transfer-encoding to avoid conflicts
        delete responseHeaders['transfer-encoding'];
        clientRes.writeHead(upstreamRes.statusCode, responseHeaders);

        // Buffer for async usage extraction
        const resChunks = [];

        upstreamRes.on('data', (chunk) => {
          // Forward to client immediately
          clientRes.write(chunk);
          // Buffer copy for usage extraction
          resChunks.push(Buffer.from(chunk));
        });

        upstreamRes.on('end', () => {
          clientRes.end();
          const latency = Date.now() - startTime;

          // Async: extract usage and log (never block the response)
          setImmediate(() => {
            try {
              const fullBuffer = Buffer.concat(resChunks);
              let usage = null;

              if (isStreaming) {
                usage = extractUsageFromSSE(fullBuffer);
              } else if (contentType.includes('application/json')) {
                usage = extractUsageFromJSON(fullBuffer);
              }

              if (usage && (usage.input_tokens > 0 || usage.output_tokens > 0)) {
                logUsage({
                  model: usage.model,
                  input_tokens: usage.input_tokens,
                  output_tokens: usage.output_tokens,
                  conversation_id: conversationId,
                  latency_ms: latency,
                });
              }
            } catch {
              // Swallow all errors - never break the proxy
            }
          });
        });

        upstreamRes.on('error', () => {
          try { clientRes.end(); } catch {}
        });
      });

      upstreamReq.on('error', (err) => {
        try {
          clientRes.writeHead(502, { 'Content-Type': 'application/json' });
          clientRes.end(JSON.stringify({ error: 'Proxy upstream error', message: err.message }));
        } catch {
          // Swallow
        }
      });

      // Send request body to upstream
      if (reqBody.length > 0) {
        upstreamReq.write(reqBody);
      }
      upstreamReq.end();
    });

    clientReq.on('error', () => {
      try { clientRes.end(); } catch {}
    });
  });

  return { server, port };
}

function startServer() {
  const config = getConfig();
  const { server, port } = createProxy(config);

  server.listen(port, '127.0.0.1', () => {
    console.log(`tokburn proxy listening on http://127.0.0.1:${port}`);
    console.log(`Forwarding to ${config.target || 'https://api.anthropic.com'}`);
    console.log('Set ANTHROPIC_BASE_URL=http://127.0.0.1:' + port);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: Port ${port} is already in use. Is tokburn already running?`);
      process.exit(1);
    }
    console.error('Proxy server error:', err.message);
    process.exit(1);
  });

  return server;
}

// Daemon management
const TOKBURN_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.tokburn');
const PID_FILE = path.join(TOKBURN_DIR, 'tokburn.pid');

function startDaemon() {
  if (!fs.existsSync(TOKBURN_DIR)) {
    fs.mkdirSync(TOKBURN_DIR, { recursive: true });
  }

  // Check if already running
  if (isRunning()) {
    const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
    return { success: false, message: `tokburn is already running (PID ${pid})` };
  }

  const logFile = path.join(TOKBURN_DIR, 'proxy.log');
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  const child = spawn(process.execPath, [__filename, '--serve'], {
    detached: true,
    stdio: ['ignore', out, err],
    env: { ...process.env },
  });

  child.unref();

  fs.writeFileSync(PID_FILE, String(child.pid) + '\n', 'utf8');

  return { success: true, pid: child.pid, message: `tokburn proxy started (PID ${child.pid})` };
}

function stopDaemon() {
  if (!fs.existsSync(PID_FILE)) {
    return { success: false, message: 'tokburn is not running (no PID file)' };
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (isNaN(pid)) {
    fs.unlinkSync(PID_FILE);
    return { success: false, message: 'Invalid PID file, cleaned up' };
  }

  try {
    process.kill(pid, 'SIGTERM');
    // Give it a moment, then clean up PID file
    try { fs.unlinkSync(PID_FILE); } catch {}
    return { success: true, message: `tokburn proxy stopped (PID ${pid})` };
  } catch (e) {
    if (e.code === 'ESRCH') {
      try { fs.unlinkSync(PID_FILE); } catch {}
      return { success: false, message: 'Process was not running, cleaned up stale PID file' };
    }
    return { success: false, message: `Failed to stop process: ${e.message}` };
  }
}

function isRunning() {
  if (!fs.existsSync(PID_FILE)) return false;

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (isNaN(pid)) return false;

  try {
    process.kill(pid, 0); // Signal 0 = check if process exists
    return true;
  } catch {
    // Process doesn't exist, clean up stale PID file
    try { fs.unlinkSync(PID_FILE); } catch {}
    return false;
  }
}

// When run directly, start the server
if (require.main === module) {
  if (process.argv.includes('--serve')) {
    startServer();
  } else {
    // If run directly without --serve, also start
    startServer();
  }
}

module.exports = { createProxy, startServer, startDaemon, stopDaemon, isRunning };
