# QA Architect — Implementation Guide

## Prerequisites

- Node.js >= 18
- pnpm (`npm install -g pnpm`)
- [Ollama](https://ollama.com/download) installed on the local machine
- 16 GB RAM recommended for the 7B model

---

## 1. CLI Installation (one-time)

```bash
# Clone or navigate to the QA Architect repository
cd /path/to/qa-architect

# Install dependencies and build everything
pnpm install
pnpm build

# Register the qa-architect command globally
cd packages/cli
npm link
```

Verify the installation:

```bash
qa-architect --version
```

---

## 2. Configure Ollama

```bash
# Start the Ollama server
ollama serve

# Download the model (first time only, ~4 GB)
ollama pull qwen2.5-coder:7b

# Verify it is running
curl http://localhost:11434
# Expected response: Ollama is running
```

> If Ollama is running on Windows and your project is in WSL, get the host IP:
> ```bash
> cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
> ```
> Use that IP as the `endpoint` in the config instead of `localhost`.

---

## 3. Initialize in your project

Navigate to the root of the project you want to analyze and run:

```bash
cd ~/projects/my-project
qa-architect init
```

This creates `qa-architect.config.json`. Edit it with your project details.

---

## 4. Configuration (`qa-architect.config.json`)

```json
{
  "project_name": "My Project",
  "language": "TypeScript",
  "framework": "Next.js",
  "source_directories": [
    "src/app/api",
    "src/lib/utils",
    "src/components"
  ],
  "custom_patterns": [
    "**/route.ts",
    "**/*.ts",
    "**/*Manager.tsx"
  ],
  "exclude_patterns": [
    "**/__tests__/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/types.ts",
    "**/index.ts"
  ],
  "ollama": {
    "model": "qwen2.5-coder:7b",
    "endpoint": "http://localhost:11434",
    "timeout_ms": 300000,
    "delay_between_ms": 2000,
    "retry_attempts": 2
  },
  "sdk": {
    "port": 9000
  }
}
```

### Config fields

| Field | Description |
|---|---|
| `language` | `PHP`, `Python`, `JavaScript`, `TypeScript` |
| `framework` | `Symfony`, `FastAPI`, `Next.js` (affects file search patterns) |
| `source_directories` | Directories to search for business logic files |
| `custom_patterns` | Additional globs on top of the framework defaults |
| `exclude_patterns` | Globs to ignore (tests, types, infrastructure utilities) |
| `ollama.timeout_ms` | Max time per file (default: 300000 ms) |
| `ollama.delay_between_ms` | Pause between files to avoid saturating Ollama (default: 2000 ms) |
| `ollama.retry_attempts` | Retries if Ollama fails (default: 2) |

### Patterns by framework

| Framework | Files detected automatically |
|---|---|
| `Next.js` | `**/route.ts`, `**/actions.ts`, `**/*service*.ts`, `**/*util*.ts` |
| `Symfony` | `**/*Controller.php`, `**/*Service.php`, `**/*Handler.php` |
| `FastAPI` | `**/*router*.py`, `**/*service*.py`, `**/routes*.py` |

---

## 5. Available commands

```bash
qa-architect init       # Creates qa-architect.config.json in the current directory
qa-architect analyze    # Analyzes code with Ollama and generates .qa-architect/rules.json
qa-architect serve      # Starts the dashboard at http://localhost:9000
qa-architect start      # analyze + serve + watcher (re-analyzes on file changes)
qa-architect report     # Generates a coverage report (Markdown or HTML)
```

### Recommended workflow

```bash
# Terminal 1: continuous analysis
qa-architect start

# Dashboard available at http://localhost:9000
```

---

## 6. Telemetry SDK — Frontend (Next.js / React)

The SDK automatically captures HTTP requests, UI events, and screenshots on errors.

### Installation

```bash
cd ~/projects/my-project
npm install /path/to/qa-architect/packages/sdk-js
```

### Create the Provider

`src/components/ui/QaArchitectProvider.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export function QaArchitectProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    import('@qa-architect/sdk-js').then(({ initQaArchitect }) => {
      initQaArchitect({
        endpoint: 'http://localhost:9000',
        captureNetwork: true,     // Intercepts fetch and XHR
        captureEvents: true,      // Captures clicks and submits
        captureScreenshots: true, // Screenshot on HTTP errors >= 400
        localFilter: 'localhost', // Only local requests
      });
    });
  }, []);

  return <>{children}</>;
}
```

### Add to root layout

`src/app/layout.tsx`:

```tsx
import { QaArchitectProvider } from '@/components/ui/QaArchitectProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QaArchitectProvider>
          {children}
        </QaArchitectProvider>
      </body>
    </html>
  );
}
```

### What the SDK captures

| Event | When | What it saves |
|---|---|---|
| HTTP request | Every `fetch` or `XHR` call to localhost | URL, method, headers, body, response, duration |
| HTTP error | Response with code >= 400 | All of the above + screenshot |
| Click | Every click on the page | CSS selector, text, current URL |
| Submit | Every form submission | Selector, action, current URL |
| JS error | Uncaught exception | Message, file, line + screenshot |

---

## 7. Telemetry SDK — Backend PHP (Symfony)

### Installation

```bash
cd ~/projects/my-symfony-project
composer require qa-architect/sdk-symfony
```

### Register the bundle

`config/bundles.php`:

```php
return [
    // ...other bundles
    QaArchitect\SdkSymfony\QaArchitectBundle::class => ['dev' => true],
];
```

### Configure

`config/packages/qa_architect.yaml`:

```yaml
qa_architect:
  storage_dir: '%kernel.project_dir%'
  server_endpoint: 'http://localhost:9000'
  write_to_file: true
  send_to_server: true
```

The SDK automatically registers the `kernel.request`, `kernel.response`, and `kernel.exception` events. No changes to your controllers are required.

---

## 8. Telemetry SDK — Backend Python (FastAPI)

### Installation

```bash
cd ~/projects/my-fastapi-project
pip install /path/to/qa-architect/packages/sdk-python
```

### Add the middleware

`main.py`:

```python
from fastapi import FastAPI
from qa_architect_sdk import QaArchitectMiddleware

app = FastAPI()

app.add_middleware(
    QaArchitectMiddleware,
    project_root="/path/to/my/project",
    server_endpoint="http://localhost:9000",
    write_to_file=True,
    send_to_server=True,
)
```

---

## 9. Dashboard — Quick reference

Open `http://localhost:9000` while `qa-architect serve` is running.

| Element | Description |
|---|---|
| Left sidebar | List of detected business flows |
| Diamond node (yellow) | Logical condition (`if/else`) |
| Green node | Success scenario |
| Red/amber node | Failure scenario |
| Highlighted node | That scenario was executed and has real traces |
| Click on highlighted node | Opens side panel with screenshot, request/response, and stack trace |
| "Refine Rule" button | Manually edit a node's description |

### Server REST API

```bash
GET  /api/rules                          # Rules extracted by Ollama
GET  /api/traces                         # Telemetry traces
POST /api/traces                         # Receive telemetry from SDK
PUT  /api/rules/:flowId/steps/:stepId    # Refine a step description
GET  /api/screenshots/:traceId           # Screenshot image
GET  /api/status                         # General status
```

---

## 10. Generated files (`.qa-architect/`)

```
.qa-architect/
├── rules.json          ← Business rules extracted by Ollama
├── traces.json         ← Telemetry traces captured by the SDKs
└── screenshots/
    └── {trace-id}.webp ← Error screenshots
```

> Add `.qa-architect/` to your `.gitignore` — it contains local development data.

---

## 11. Troubleshooting

| Error | Cause | Solution |
|---|---|---|
| `Cannot connect to Ollama` | Ollama is not running | Run `ollama serve` in another terminal |
| `fetch failed` during analysis | Ollama got saturated | Increase `delay_between_ms` to 3000 or more |
| `timeout` on a file | File too large or model too slow | Increase `timeout_ms` or exclude the file with `exclude_patterns` |
| `No files found` | Patterns do not match | Check `source_directories` and `custom_patterns` in the config |
| Nodes not highlighted | SDK not sending traces | Verify `qa-architect serve` is running and the SDK is initialized |

---

## 12. Coverage report

```bash
# Markdown report (default)
qa-architect report

# HTML report with sidebar navigation
qa-architect report --format html --output report.html
```

The report shows which flows and steps have been covered by real traces, and which ones are still untested.
