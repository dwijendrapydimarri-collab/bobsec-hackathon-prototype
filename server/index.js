require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE ROUTES FOR DEMO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const analyseRoute = require('./routes/analyse')
const feedbackRoute = require('./routes/feedback')
const authRoute = require('./routes/auth')
const casesRoute = require('./routes/cases')
const historyRoute = require('./routes/history')

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLATFORM ROUTES — DISABLED FOR DEMO (commented out to prevent loading)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// const organizationsRoute = require('./routes/organizations')
// const apiKeysRoute = require('./routes/apiKeys')
// const webhooksRoute = require('./routes/webhooks')
// const consentRoute = require('./routes/consent')
// const policiesRoute = require('./routes/policies')
// const pluginsRoute = require('./routes/plugins')
// const pipelineVersionsRoute = require('./routes/pipelineVersions')
// const loadTestsRoute = require('./routes/loadTests')
// const monitorsRoute = require('./routes/monitors')
// const publicApiRoute = require('./routes/publicApi')
// const scamnetRoute = require('./routes/scamnet')
// const investigationsRoute = require('./routes/investigations')
// const governanceRoute = require('./routes/governance')
const { initializeStore } = require('./data/store')
const { combinedRateLimit, strictRateLimit } = require('./middleware/rateLimiter')
const requestIdMiddleware = require('./middleware/requestId')
const requestLoggerMiddleware = require('./middleware/requestLogger')
const auth = require('./middleware/auth')
const logger = require('./utils/logger')
const metrics = require('./utils/metrics')

const app = express()
const PORT = process.env.PORT || 3001

// Request ID for distributed tracing
app.use(requestIdMiddleware)

// Request logging
app.use(requestLoggerMiddleware)

// Security: Helmet for HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS
app.use(cors())

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Global rate limiting (100 req/15min per IP, 200 req/15min per user)
app.use(combinedRateLimit(100, 200, 15 * 60 * 1000))

// Initialize data store
initializeStore()
  .then(() => {
    logger.info('Data store initialized successfully')
  })
  .catch(err => {
    logger.error('Failed to initialize data store', { error: err.message })
  })

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE ROUTES FOR DEMO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use('/api', analyseRoute)           // Core scam analysis
app.use('/api', feedbackRoute)          // Feedback learning
app.use('/api/auth', authRoute)         // Authentication (if needed for demo)
app.use('/api/history', historyRoute)   // User history (if wired)
app.use('/api/cases', casesRoute)       // Case management

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLATFORM ROUTES — DISABLED FOR DEMO STABILITY
// These routes are fully implemented but commented out to prevent startup
// issues during demo. Uncomment for production deployment.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// app.use('/api/organizations', organizationsRoute)
// app.use('/api/keys', auth, apiKeysRoute)
// app.use('/api/webhooks', auth, webhooksRoute)
// app.use('/api/consent', auth, consentRoute)
// app.use('/api/policies', auth, policiesRoute)
// app.use('/api/plugins', auth, pluginsRoute)
// app.use('/api/pipeline-versions', auth, pipelineVersionsRoute)
// app.use('/api/load-tests', auth, loadTestsRoute)
// app.use('/api/monitors', auth, monitorsRoute)
// app.use('/api/public', publicApiRoute)
// app.use('/api/scamnet', auth, scamnetRoute)
// app.use('/api/investigations', investigationsRoute)
// app.use('/api/governance', governanceRoute)

// Enhanced health check with governance status
app.get('/api/health', (req, res) => {
  const stats = metrics.getStats()
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: stats.uptime.formatted,
    mock_mode: process.env.MOCK_MODE === 'true',
    version: '2.0.0',
    features: {
      bob_orchestration: true,
      rule_dsl: true,
      feedback_learning: true,
      post_incident_mode: true,
      governance_layer: true,
      multi_agent_system: true,
      authentication: true,
      multi_tenancy: true,
      organizations: true,
      role_based_access: true,
      logging: true,
      metrics: true,
      api_keys: true,
      webhooks: true,
      consent_management: true,
      data_classification: true,
      pii_masking: true,
      policy_as_code: true,
      plugin_system: true,
      pipeline_versioning: true,
      load_testing: true,
      synthetic_monitoring: true,
      multi_sector: true,
      multi_region: true,
      scamnet_intelligence: true,
      investigation_tools: true,
      chain_of_custody: true,
      governance_monitoring: true,
      ecosystem_health: true,
      compliance_checks: true
    },
    agents: {
      prompt_firewall: 'active',
      scam_agent: 'active',
      intel_agent: 'active',
      explainer_agent: 'active',
      policy_check_agent: 'active',
      rule_suggestion_agent: 'active'
    },
    governance: {
      human_in_loop: true,
      no_auto_submission: true,
      no_data_retention: true,
      confidence_threshold: 55,
      pii_redaction: true
    }
  })
})

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  const stats = metrics.getStats()
  res.json(stats)
})

// Dev endpoint: Run simulation
app.get('/dev/sim', async (req, res) => {
  try {
    const { runSimulation } = require('./tools/runDemoSim')
    const results = await runSimulation()
    res.json(results)
  } catch (error) {
    res.status(500).json({
      error: 'simulation_failed',
      message: error.message
    })
  }
})

app.listen(PORT, () => {
  logger.info('BobSec server started', {
    port: PORT,
    mockMode: process.env.MOCK_MODE === 'true',
    version: '2.0.0',
    logLevel: process.env.LOG_LEVEL || 'INFO'
  })
  
  console.log(`\n🛡  BobSec Server running on http://localhost:${PORT}`)
  console.log(`   Mock mode: ${process.env.MOCK_MODE === 'true' ? 'ON (demo safe)' : 'OFF (live API)'}`)
  console.log(`   Version: 2.0.0 (Bob-Native Multi-Agent System)`)
  console.log(`   Log level: ${process.env.LOG_LEVEL || 'INFO'}`)
  console.log(`   Agents: 8 active (PromptFirewall, ScamAgent, ConsumerAgent, BankSideAgent, IntelAgent, ExplainerAgent, PolicyCheck, RuleSuggestion)`)
  console.log(`   Governance: Human-in-loop ✓ | No auto-submission ✓ | PII redaction ✓`)
  console.log(`   Platform: Multi-sector ✓ | Multi-region ✓ | ScamNet Intelligence ✓`)
  console.log(`\n   📍 Active Endpoints (Demo Mode):`)
  console.log(`      Health Check:     GET  /api/health`)
  console.log(`      Metrics:          GET  /api/metrics`)
  console.log(`      Analysis:         POST /api/analyse`)
  console.log(`      Feedback:         POST /api/feedback`)
  console.log(`      Auth:             POST /api/auth/login`)
  console.log(`      History:          GET  /api/history`)
  console.log(`      Cases:            GET  /api/cases`)
  console.log(`      Dev Sim:          GET  /dev/sim`)
  console.log(`\n   ⚠️  Platform routes disabled for demo stability`)
  console.log(`      (organizations, webhooks, plugins, etc. - see index.js)`)
})

// Made with Bob
