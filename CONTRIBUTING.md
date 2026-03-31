# Contributing to tokburn

Thanks for your interest. tokburn is a small project and contributions are welcome.

---

## Dev Environment Setup

### CLI (tokburn-cli)

```bash
cd tokburn-cli
npm install
```

The only runtime dependency is `commander`. Keep it that way.

### Chrome Extension (tokburn-ext)

No build step. Load the `tokburn-ext/` folder as an unpacked extension in Chrome:

1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" and select `tokburn-ext/`

---

## Running Tests

```bash
cd tokburn-cli
npm test
```

This runs both the benchmark suite (SSE parsing, cost calculation, proxy latency, throughput) and the card rendering tests.

To run benchmarks only:

```bash
npm run benchmark
```

To run card tests only:

```bash
npm run test:card
```

---

## PR Guidelines

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- One logical change per PR
- Include a brief description of what changed and why
- Run `npm test` and confirm all benchmarks pass before submitting

---

## Code Style

- **No heavy dependencies.** The CLI has one dep (`commander`). The extension has zero. Think hard before adding anything.
- **Fail-open everywhere.** If parsing fails, swallow the error and move on. Never break the proxy, never break the page.
- **Wrap parsing in try/catch.** Every JSON parse, every SSE line parse, every file read. If it can throw, catch it.
- **Async logging.** Usage extraction happens after the response is delivered. Use `setImmediate()` in the proxy, handle cloned streams in the extension.

---

## Testing Guidelines

- **New parsing logic** -- Add benchmark cases in `test/benchmark.js` with real Anthropic API payloads.
- **New UI components** -- Add card rendering tests in `test/test-card.js` verifying alignment and edge cases.
- **Status line modules** -- Test with mock session JSON piped to `statusline.js`.
- **Extension changes** -- Load unpacked in Chrome, open claude.ai, send a few messages, verify the pill and dashboard update correctly. Check the console for errors.

---

## Project Structure

```
tokburn/
  tokburn-cli/          CLI + proxy package
    cli.js              Command definitions (commander)
    proxy.js            HTTP proxy + daemon management
    tracker.js          Usage logging to JSONL
    store.js            Reading/querying usage data
    display.js          Terminal formatting + live TUI
    costs.js            Model pricing + cost calculation
    config.js           Config file management
    init.js             Setup wizard
    statusline.js       Claude Code status line renderer
    card.js             Task summary card rendering
    test/               Benchmarks + card tests

  tokburn-ext/          Chrome extension
    manifest.json       MV3 manifest
    interceptor.js      Page-context fetch interceptor
    content-script.js   Shadow DOM UI + message relay
    background.js       Storage management service worker
    popup.html/js/css   Extension popup
    styles.css          Pill + dashboard styles
```

---

## Design Principles

1. **Zero latency impact** -- The proxy must never slow down API responses.
2. **Fail-open** -- Errors in tracking must never break the user's workflow.
3. **Fully local** -- No network calls except forwarding to the original API target.
4. **No heavy deps** -- Keep the dependency tree minimal.

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
