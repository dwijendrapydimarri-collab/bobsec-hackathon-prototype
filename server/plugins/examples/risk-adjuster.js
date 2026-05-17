/**
 * Example Plugin: Risk Score Adjuster
 * 
 * This plugin demonstrates how to modify risk scores based on
 * custom business logic or regional patterns.
 */

module.exports = {
  name: 'Risk Score Adjuster',
  slug: 'risk-adjuster',
  version: '1.0.0',
  description: 'Adjusts risk scores based on regional patterns and custom rules',
  author: 'BobSec Team',
  type: 'agent',
  
  manifest: {
    hooks: ['risk.calculated'],
    permissions: ['storage'],
    dependencies: [],
    config: {
      regionalBoost: {
        type: 'number',
        required: false,
        default: 5,
        description: 'Points to add for region-specific scam patterns'
      },
      enableLearning: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Enable learning from feedback to adjust scores'
      }
    }
  },
  
  hooks: {
    'risk.calculated': async function(context) {
      const { riskScore, riskLevel, analysis } = context
      const config = plugin.config
      
      let adjustedScore = riskScore
      const adjustments = []
      
      // Regional pattern detection
      if (analysis.entities.impersonated_org) {
        const org = analysis.entities.impersonated_org.toLowerCase()
        
        // Check for region-specific high-risk organizations
        const regionalHighRisk = ['hdfc', 'sbi', 'icici', 'paytm', 'phonepe']
        if (regionalHighRisk.some(r => org.includes(r))) {
          adjustedScore += config.regionalBoost
          adjustments.push({
            reason: 'Regional high-risk organization impersonated',
            adjustment: config.regionalBoost
          })
        }
      }
      
      // Digital arrest pattern (India-specific)
      if (analysis.entities.urgency_phrases) {
        const phrases = analysis.entities.urgency_phrases.join(' ').toLowerCase()
        if (phrases.includes('digital arrest') || phrases.includes('cyber cell')) {
          adjustedScore += 10
          adjustments.push({
            reason: 'Digital arrest scam pattern detected',
            adjustment: 10
          })
        }
      }
      
      // UPI-specific patterns
      if (analysis.entities.upi_ids && analysis.entities.upi_ids.length > 0) {
        const upis = analysis.entities.upi_ids.map(u => u.value || u).join(' ')
        
        // Suspicious UPI patterns
        if (upis.includes('refund') || upis.includes('prize') || upis.includes('winner')) {
          adjustedScore += 8
          adjustments.push({
            reason: 'Suspicious UPI ID pattern',
            adjustment: 8
          })
        }
      }
      
      // Learning from feedback (if enabled)
      if (config.enableLearning) {
        try {
          const feedbackKey = `feedback:${analysis.category}:${analysis.sub_type}`
          const feedbackData = await plugin.storage.get(feedbackKey)
          
          if (feedbackData && feedbackData.avgAdjustment) {
            adjustedScore += feedbackData.avgAdjustment
            adjustments.push({
              reason: 'Learned adjustment from feedback',
              adjustment: feedbackData.avgAdjustment
            })
          }
        } catch (error) {
          console.error('Failed to apply learned adjustments:', error.message)
        }
      }
      
      // Cap score at 100
      adjustedScore = Math.min(100, Math.max(0, adjustedScore))
      
      // Recalculate risk level if score changed significantly
      let adjustedLevel = riskLevel
      if (Math.abs(adjustedScore - riskScore) >= 10) {
        if (adjustedScore >= 80) adjustedLevel = 'HIGH'
        else if (adjustedScore >= 50) adjustedLevel = 'MEDIUM'
        else if (adjustedScore >= 20) adjustedLevel = 'LOW'
        else adjustedLevel = 'SAFE'
      }
      
      console.log('Risk Score Adjusted', {
        original: riskScore,
        adjusted: adjustedScore,
        adjustments: adjustments.length
      })
      
      plugin.emit('risk.adjusted', {
        originalScore: riskScore,
        adjustedScore,
        originalLevel: riskLevel,
        adjustedLevel,
        adjustments
      })
      
      return {
        adjustedScore,
        adjustedLevel,
        adjustments
      }
    }
  }
}

// Made with Bob
