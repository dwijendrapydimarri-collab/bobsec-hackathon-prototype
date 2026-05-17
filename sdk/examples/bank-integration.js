/**
 * BobSec Integration Example: Banking Sector
 * 
 * This example shows how a bank can integrate BobSec to protect customers
 * from SMS phishing, fake transaction alerts, and account takeover attempts.
 */

const { createClient } = require('bobsec-sdk')
const express = require('express')

// ══════════════════════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════════════════════

const client = createClient({
  apiKey: process.env.BOBSEC_API_KEY,
  baseUrl: 'https://api.bobsec.ai',
  debug: true
})

const app = express()
app.use(express.json())

// ══════════════════════════════════════════════════════════════════════════════
// Use Case 1: Real-time SMS Analysis
// Analyse incoming SMS before delivering to customer
// ══════════════════════════════════════════════════════════════════════════════

app.post('/sms/incoming', async (req, res) => {
  const { from, to, message } = req.body
  
  try {
    // Analyse SMS content
    const result = await client.analyse({
      input: message,
      channel: 'sms',
      metadata: {
        from,
        to,
        timestamp: new Date().toISOString(),
        source: 'sms-gateway'
      }
    })
    
    const { risk_level, risk_score, category } = result.result
    
    // High risk: Block and alert customer
    if (risk_level === 'HIGH') {
      console.log(`🚨 BLOCKED: High-risk SMS from ${from}`)
      console.log(`   Risk Score: ${risk_score}`)
      console.log(`   Category: ${category}`)
      
      // Send alert to customer
      await sendCustomerAlert(to, {
        type: 'scam_blocked',
        message: 'We blocked a suspicious message claiming to be from your bank.',
        action: 'No action needed. Your account is safe.'
      })
      
      return res.json({
        action: 'blocked',
        reason: 'High-risk scam detected',
        riskScore: risk_score
      })
    }
    
    // Medium risk: Deliver with warning
    if (risk_level === 'MEDIUM') {
      console.log(`⚠️  WARNING: Medium-risk SMS from ${from}`)
      
      // Deliver with inline warning
      const warningMessage = `\n\n⚠️ SECURITY ALERT: This message may be suspicious. Never share OTP or passwords. Call ${process.env.BANK_HELPLINE} to verify.`
      
      await deliverSMS(to, message + warningMessage)
      
      return res.json({
        action: 'delivered_with_warning',
        riskScore: risk_score
      })
    }
    
    // Low/Safe: Deliver normally
    await deliverSMS(to, message)
    
    return res.json({
      action: 'delivered',
      riskScore: risk_score
    })
    
  } catch (error) {
    console.error('SMS analysis failed:', error.message)
    
    // Fail open: Deliver message if analysis fails
    await deliverSMS(to, message)
    
    return res.json({
      action: 'delivered',
      note: 'Analysis failed, delivered without check'
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// Use Case 2: Customer-Reported Suspicious Messages
// Allow customers to report suspicious messages via mobile app
// ══════════════════════════════════════════════════════════════════════════════

app.post('/customer/report-suspicious', async (req, res) => {
  const { customerId, message, source } = req.body
  
  try {
    // Analyse reported message
    const result = await client.analyse({
      input: message,
      channel: source, // 'sms', 'whatsapp', 'email'
      metadata: {
        customerId,
        reportedAt: new Date().toISOString(),
        reportType: 'customer_report'
      },
      async: true,
      webhookUrl: `${process.env.APP_URL}/webhooks/bobsec`
    })
    
    // Immediate response to customer
    return res.json({
      success: true,
      message: 'Thank you for reporting. We are analysing this message and will take appropriate action.',
      analysisId: result.analysisId,
      estimatedTime: '30 seconds'
    })
    
  } catch (error) {
    console.error('Report submission failed:', error.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to submit report. Please try again.'
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// Use Case 3: Batch Analysis of Transaction Alerts
// Analyse all outgoing transaction alerts before sending
// ══════════════════════════════════════════════════════════════════════════════

async function sendTransactionAlerts(transactions) {
  // Prepare batch
  const inputs = transactions.map(txn => ({
    id: txn.id,
    input: generateTransactionMessage(txn),
    metadata: {
      transactionId: txn.id,
      customerId: txn.customerId,
      amount: txn.amount,
      type: 'transaction_alert'
    }
  }))
  
  // Batch analyse
  const result = await client.batchAnalyse({
    inputs,
    webhookUrl: `${process.env.APP_URL}/webhooks/batch-alerts`
  })
  
  console.log(`📊 Batch analysis queued: ${result.batchId}`)
  console.log(`   ${result.itemCount} transaction alerts`)
  
  return result.batchId
}

// ══════════════════════════════════════════════════════════════════════════════
// Use Case 4: Webhook Handler for Async Results
// Process analysis results from BobSec
// ══════════════════════════════════════════════════════════════════════════════

app.post('/webhooks/bobsec', (req, res) => {
  const signature = req.headers['x-bobsec-signature']
  const timestamp = parseInt(req.headers['x-bobsec-timestamp'])
  const payload = req.body
  
  // Verify signature
  const isValid = require('bobsec-sdk').BobSecClient.verifyWebhookSignature(
    payload,
    signature,
    timestamp,
    process.env.BOBSEC_API_SECRET
  )
  
  if (!isValid) {
    console.error('❌ Invalid webhook signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }
  
  // Process event
  const { event, analysisId, result } = payload
  
  if (event === 'analysis.completed') {
    console.log(`✅ Analysis completed: ${analysisId}`)
    console.log(`   Risk Level: ${result.risk_level}`)
    console.log(`   Risk Score: ${result.risk_score}`)
    
    // Take action based on result
    if (result.risk_level === 'HIGH') {
      // Alert fraud team
      alertFraudTeam({
        analysisId,
        riskScore: result.risk_score,
        category: result.category,
        entities: result.entities
      })
      
      // Update customer record
      flagCustomerAccount(result.metadata.customerId, {
        reason: 'Reported suspicious message',
        riskLevel: result.risk_level,
        analysisId
      })
    }
  }
  
  res.json({ success: true })
})

// ══════════════════════════════════════════════════════════════════════════════
// Use Case 5: Fraud Dashboard - Get Statistics
// Display scam trends and statistics on fraud dashboard
// ══════════════════════════════════════════════════════════════════════════════

app.get('/dashboard/fraud-stats', async (req, res) => {
  try {
    // Get monthly statistics
    const stats = await client.getStats({ period: 'month' })
    
    // Get recent high-risk analyses
    const recentHighRisk = await client.getHistory({
      page: 1,
      limit: 10,
      riskLevel: 'HIGH'
    })
    
    // Get category breakdown
    const categoryBreakdown = stats.categoryBreakdown.map(cat => ({
      category: cat._id,
      count: cat.count,
      percentage: ((cat.count / stats.stats.total) * 100).toFixed(1)
    }))
    
    return res.json({
      period: 'Last 30 days',
      summary: {
        totalAnalyses: stats.stats.total,
        highRisk: stats.stats.high,
        mediumRisk: stats.stats.medium,
        lowRisk: stats.stats.low,
        avgRiskScore: stats.stats.avgRiskScore.toFixed(1),
        avgConfidence: stats.stats.avgConfidence.toFixed(1)
      },
      categoryBreakdown,
      recentHighRisk: recentHighRisk.data
    })
    
  } catch (error) {
    console.error('Failed to fetch stats:', error.message)
    return res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════════════════════

async function deliverSMS(to, message) {
  // Integrate with your SMS gateway
  console.log(`📱 Delivering SMS to ${to}`)
}

async function sendCustomerAlert(customerId, alert) {
  // Send push notification or in-app alert
  console.log(`🔔 Sending alert to customer ${customerId}:`, alert.type)
}

function generateTransactionMessage(txn) {
  return `Dear Customer, Rs.${txn.amount} has been ${txn.type} from your account ending ${txn.accountLast4} on ${txn.date}. Available balance: Rs.${txn.balance}. If not done by you, call ${process.env.BANK_HELPLINE} immediately.`
}

async function alertFraudTeam(details) {
  // Send alert to fraud monitoring team
  console.log('🚨 Alerting fraud team:', details)
}

async function flagCustomerAccount(customerId, details) {
  // Flag customer account for review
  console.log(`⚠️  Flagging customer ${customerId}:`, details)
}

// ══════════════════════════════════════════════════════════════════════════════
// Start Server
// ══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`\n🏦 Bank Integration Server running on port ${PORT}`)
  console.log(`   BobSec API: ${client.baseUrl}`)
  console.log(`   Webhook endpoint: http://localhost:${PORT}/webhooks/bobsec`)
})

// Made with Bob
