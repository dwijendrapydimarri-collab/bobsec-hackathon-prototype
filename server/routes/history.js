const express = require('express')
const router = express.Router()
const analysisRepo = require('../repositories/AnalysisRepository')
const { requireAuth } = require('../middleware/auth')
const { validateRequest } = require('../middleware/rateLimiter')
const logger = require('../utils/logger')

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚠️  DEMO MODE WARNING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auth and rate limiting have been DISABLED for demo stability.
// DO NOT ship this to production without restoring:
//   - requireAuth middleware on all routes
//   - Proper user context (req.user.id, req.user.tenantId)
//   - Rate limiting where appropriate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/history - Get paginated analysis history with filters
// DEMO MODE: Auth disabled for demo stability
router.get('/',
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        riskLevel,
        category,
        startDate,
        endDate,
        search
      } = req.query

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100), // Max 100 per page
        riskLevel: riskLevel || null,
        category: category || null,
        startDate: startDate || null,
        endDate: endDate || null,
        search: search || null
      }

      // Demo mode: use demo user ID
      const userId = 'demo-user'
      const tenantId = 'demo'

      const result = await analysisRepo.getHistory(
        userId,
        tenantId,
        options
      )

      logger.info('Fetched analysis history (demo mode)', {
        userId,
        page: options.page,
        total: result.pagination.total,
        filters: {
          riskLevel: options.riskLevel,
          category: options.category,
          search: options.search ? 'yes' : 'no'
        }
      })

      // If no history exists, provide demo seed data
      if (!result || !result.items || result.items.length === 0) {
        logger.info('No history found, returning demo seed data')
        return res.json({
          success: true,
          demoMode: true,
          items: [
            {
              id: 'demo-seed-1',
              analysisId: 'BSC-2024-000001',
              timestamp: new Date().toISOString(),
              riskLevel: 'HIGH',
              riskScore: 92,
              category: 'FINANCIAL_FRAUD',
              input: 'Dear Customer, Your HDFC Bank account will be SUSPENDED within 24 hours due to incomplete KYC...',
              verdict: 'Likely scam - KYC phishing attempt',
              entities: {
                phone_numbers: ['+91-9876500000'],
                urls: ['hdfc-kyc-update.tk']
              }
            },
            {
              id: 'demo-seed-2',
              analysisId: 'BSC-2024-000002',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              riskLevel: 'MEDIUM',
              riskScore: 68,
              category: 'JOB_SCAM',
              input: 'Work from home and earn ₹5000/day! No experience needed. Just pay ₹499 registration fee...',
              verdict: 'Suspicious - Advance fee job scam pattern',
              entities: {
                phone_numbers: ['+91-8800000001']
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        })
      }

      res.json({
        success: true,
        demoMode: true,
        ...result
      })
    } catch (err) {
      logger.error('Failed to fetch analysis history', {
        error: err.message
      })
      res.status(500).json({ error: 'Failed to fetch history' })
    }
  }
)

// GET /api/history/:id - Get single analysis by ID
// DEMO MODE: Auth disabled for demo stability
router.get('/:id',
  async (req, res) => {
    try {
      const analysis = await analysisRepo.getById(req.params.id)

      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' })
      }

      logger.info('Fetched single analysis (demo mode)', {
        analysisId: req.params.id
      })

      res.json({
        success: true,
        demoMode: true,
        ...analysis
      })
    } catch (err) {
      logger.error('Failed to fetch analysis', {
        error: err.message,
        analysisId: req.params.id
      })
      res.status(500).json({ error: 'Failed to fetch analysis' })
    }
  }
)

// GET /api/history/search/entity - Search by entity (phone, URL, UPI)
// DEMO MODE: Auth disabled for demo stability
router.get('/search/entity',
  async (req, res) => {
    try {
      const { q } = req.query

      if (!q || q.trim().length < 3) {
        return res.status(400).json({
          error: 'Search query must be at least 3 characters'
        })
      }

      // Demo mode: use demo user ID
      const userId = 'demo-user'
      const tenantId = 'demo'

      const results = await analysisRepo.searchByEntity(
        userId,
        tenantId,
        q
      )

      logger.info('Searched analyses by entity (demo mode)', {
        query: q,
        resultsCount: results.length
      })

      res.json({
        success: true,
        demoMode: true,
        query: q,
        results,
        total: results.length
      })
    } catch (err) {
      logger.error('Failed to search analyses', {
        error: err.message
      })
      res.status(500).json({ error: 'Failed to search analyses' })
    }
  }
)

// GET /api/history/session/last - Get last analysis for session restore
// DEMO MODE: Auth disabled for demo stability
router.get('/session/last',
  async (req, res) => {
    try {
      // Demo mode: use demo user ID
      const userId = 'demo-user'
      const tenantId = 'demo'

      const lastAnalysis = await analysisRepo.getLastAnalysis(
        userId,
        tenantId
      )

      if (!lastAnalysis) {
        return res.status(404).json({ error: 'No previous analysis found' })
      }

      logger.info('Fetched last analysis for session restore (demo mode)', {
        analysisId: lastAnalysis.id
      })

      res.json({
        success: true,
        demoMode: true,
        ...lastAnalysis
      })
    } catch (err) {
      logger.error('Failed to fetch last analysis', {
        error: err.message
      })
      res.status(500).json({ error: 'Failed to fetch last analysis' })
    }
  }
)

module.exports = router

// Made with Bob
