# BobSec SDK Documentation

Official SDKs for integrating with the BobSec Anti-Scam Platform.

---

## Available SDKs

| Language | Status | Directory | Package |
|----------|--------|-----------|---------|
| **JavaScript/Node.js** | ✅ Available | [`javascript/`](javascript/) | `bobsec-sdk` |
| **Python** | 🚧 Coming Soon | `python/` | `bobsec` |
| **Java** | 🚧 Coming Soon | `java/` | `com.bobsec:bobsec-sdk` |
| **PHP** | 🚧 Coming Soon | `php/` | `bobsec/bobsec-sdk` |
| **Ruby** | 🚧 Coming Soon | `ruby/` | `bobsec-sdk` |
| **Go** | 🚧 Coming Soon | `go/` | `github.com/bobsec/bobsec-go` |

---

## JavaScript/Node.js SDK

### Installation

```bash
npm install bobsec-sdk
```

### Quick Start

```javascript
const { createClient } = require('bobsec-sdk')

// Create client
const client = createClient({
  apiKey: 'your_api_key_here',
  baseUrl: 'https://api.bobsec.ai',  // Optional
  timeout: 30000,                     // Optional
  debug: false                        // Optional
})

// Analyse suspicious content
const result = await client.analyse({
  input: 'Dear Customer, Your HDFC Bank account will be SUSPENDED...',
  channel: 'sms'
})

console.log('Risk Level:', result.result.risk_level)
console.log('Risk Score:', result.result.risk_score)
console.log('Category:', result.result.category)
```

### API Reference

#### `client.analyse(options)`

Analyse suspicious content for scam indicators.

**Parameters:**
- `input` (string, required): Suspicious content to analyse (min 10 chars)
- `channel` (string, optional): Channel type - `'web'`, `'api'`, `'sms'`, `'whatsapp'`, `'email'` (default: `'api'`)
- `metadata` (object, optional): Additional metadata
- `webhookUrl` (string, optional): Webhook URL for async notifications
- `async` (boolean, optional): Use async mode (default: `false`)

**Returns:** Promise<Object>

**Example:**
```javascript
const result = await client.analyse({
  input: 'Congratulations! You have won ₹25,00,000...',
  channel: 'sms',
  metadata: {
    phoneNumber: '+91-9876543210',
    receivedAt: '2026-05-16T10:30:00Z'
  }
})
```

#### `client.batchAnalyse(options)`

Analyse multiple inputs in a single batch.

**Parameters:**
- `inputs` (array, required): Array of input objects (max 100)
- `webhookUrl` (string, optional): Webhook URL for batch completion notification

**Returns:** Promise<Object>

#### `client.getAnalysis(analysisId)`

Retrieve analysis result by ID.

#### `client.getHistory(options)`

Retrieve analysis history with pagination and filtering.

#### `client.getStats(options)`

Get aggregated statistics.

#### `BobSecClient.verifyWebhookSignature(payload, signature, timestamp, secret)`

Verify webhook signature (static method).

---

## Webhook Events

BobSec sends webhooks for async operations. All webhooks include:

- **Headers:**
  - `X-BobSec-Signature`: HMAC-SHA256 signature
  - `X-BobSec-Timestamp`: Unix timestamp
  - `X-BobSec-Event`: Event type

### Event Types

| Event | Description |
|-------|-------------|
| `analysis.completed` | Analysis completed successfully |
| `analysis.failed` | Analysis failed |
| `batch.completed` | Batch analysis completed |

---

## Rate Limiting

API keys have rate limits based on tier:

| Tier | Requests/Minute | Concurrent Analyses |
|------|-----------------|---------------------|
| Free | 60 | 5 |
| Starter | 300 | 20 |
| Professional | 1000 | 100 |
| Enterprise | Custom | Custom |

When rate limit is exceeded, API returns `429 Too Many Requests`.

---

## Support

- **Documentation**: https://docs.bobsec.ai
- **API Reference**: https://api.bobsec.ai/docs
- **Support Email**: support@bobsec.ai
- **GitHub**: https://github.com/bobsec/bobsec-sdk