// Cases route - User analysis history and case management
const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const AnalysisRepository = require('../repositories/AnalysisRepository')

// GET /api/cases/recent - Get recent analyses for authenticated user
router.get('/cases/recent', requireAuth, async (req, res) => {
  try {
    const { userId, tenantId } = req.auth
    const limit = parseInt(req.query.limit) || 20
    
    const analyses = await AnalysisRepository.listRecentByUser(userId, tenantId, limit)
    
    return res.json({
      success: true,
      total: analyses.length,
      analyses: analyses.map(a => ({
        id: a.id,
        timestamp: a.timestamp,
        riskLevel: a.riskLevel,
        riskScore: a.riskScore,
        category: a.category,
        confidence: a.confidence,
        mode: a.mode
      }))
    })
  } catch (error) {
    console.error('Error fetching recent cases:', error)
    return res.status(500).json({
      error: 'fetch_failed',
      message: 'Unable to fetch recent analyses'
    })
  }
})

// GET /api/cases/:id - Get full analysis by ID
router.get('/cases/:id', requireAuth, async (req, res) => {
  try {
    const { userId, tenantId } = req.auth
    const { id } = req.params
    
    const analysis = await AnalysisRepository.getById(id)
    
    if (!analysis) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Analysis not found'
      })
    }
    
    // Verify ownership (user can only access their own analyses)
    if (analysis.userId !== userId || analysis.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Access denied'
      })
    }
    
    return res.json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error('Error fetching analysis:', error)
    return res.status(500).json({
      error: 'fetch_failed',
      message: 'Unable to fetch analysis'
    })
  }
})

// GET /api/session/last - Get last analysis for session restore
router.get('/session/last', requireAuth, async (req, res) => {
  try {
    const { userId, tenantId } = req.auth
    
    const lastAnalysis = await AnalysisRepository.getLastAnalysis(userId, tenantId)
    
    if (!lastAnalysis) {
      return res.json({
        success: true,
        hasLast: false,
        analysis: null
      })
    }
    
    return res.json({
      success: true,
      hasLast: true,
      analysis: {
        id: lastAnalysis.id,
        timestamp: lastAnalysis.timestamp,
        riskLevel: lastAnalysis.riskLevel,
        category: lastAnalysis.category
      }
    })
  } catch (error) {
    console.error('Error fetching last session:', error)
    return res.status(500).json({
      error: 'fetch_failed',
      message: 'Unable to fetch last session'
    })
  }
})

// GET /api/cases/stats - Get user statistics
router.get('/cases/stats', requireAuth, async (req, res) => {
  try {
    const { userId, tenantId } = req.auth
    
    const stats = await AnalysisRepository.getUserStats(userId, tenantId)
    
    return res.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return res.status(500).json({
      error: 'fetch_failed',
      message: 'Unable to fetch statistics'
    })
  }
})

module.exports = router

// Made with Bob
