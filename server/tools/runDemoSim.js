#!/usr/bin/env node

// BobSec Demo Simulation Runner
// Runs all 7 demo samples through the full pipeline and outputs results table

const { orchestrate } = require('../orchestrator/bobOrchestrator')

// Demo samples (same as client-side)
const DEMO_SAMPLES = [
  {
    id: 'SAMPLE_1',
    name: 'Fake Bank KYC',
    text: 'Dear Customer, Your HDFC Bank account will be SUSPENDED within 24 hours due to incomplete KYC. Update immediately: http://hdfc-kyc-update.tk/verify or call 9876500000. Ignore at your own risk. — HDFC KYC Team'
  },
  {
    id: 'SAMPLE_2',
    name: 'Job Scam',
    text: 'Work from home and earn ₹5000/day! No experience needed. Just pay ₹499 registration fee to start. WhatsApp HR: 8800000001. Limited slots! Apply now.'
  },
  {
    id: 'SAMPLE_3',
    name: 'Lottery Scam',
    text: 'Congratulations! You have been selected in KBC Lucky Draw 2024. You have WON ₹25,00,000. To claim, pay ₹599 processing fee to UPI: refund@paytm123. Hurry! Offer expires in 2 hours.'
  },
  {
    id: 'SAMPLE_4',
    name: 'Fake Delivery',
    text: 'Your Amazon parcel (AWB: 7823991) is held at customs. Pay ₹299 clearance fee at: amazon-refund-claim.in. Failure to pay within 12 hours will result in parcel return.'
  },
  {
    id: 'SAMPLE_5',
    name: 'TRAI Threat',
    text: 'This is TRAI Cyber Cell. Your mobile number has been linked to 47 illegal transactions. You are under DIGITAL ARREST. Do not contact anyone. Pay ₹15,000 to avoid immediate police action. Call: 9876500000'
  },
  {
    id: 'SAMPLE_6',
    name: 'Investment Scam',
    text: 'Join our SEBI-certified WhatsApp group and get GUARANTEED 40% monthly returns on stock tips! 500+ members earning ₹1 lakh/month. Limited seats. Invest minimum ₹10,000. Contact: 8800000001'
  },
  {
    id: 'SAMPLE_7',
    name: 'Digital Arrest (Extreme)',
    text: 'URGENT: This is CBI Officer Rajesh Kumar (Badge #4729). Your Aadhaar has been used in a money laundering case worth ₹4.2 crore. You are under DIGITAL ARREST effective immediately. Do NOT disconnect this call or contact anyone. Failure to cooperate will result in physical arrest within 2 hours. Transfer ₹50,000 to this account for bail verification: 9876500000@paytm'
  }
]

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function getRiskColor(level) {
  switch (level) {
    case 'HIGH': return 'red'
    case 'MEDIUM': return 'yellow'
    case 'LOW': return 'blue'
    case 'SAFE': return 'green'
    default: return 'gray'
  }
}

// Format table row
function formatRow(cols, widths) {
  return cols.map((col, i) => {
    const str = String(col)
    return str.padEnd(widths[i])
  }).join(' │ ')
}

// Main simulation runner
async function runSimulation() {
  console.log(colorize('\n╔════════════════════════════════════════════════════════════════╗', 'cyan'))
  console.log(colorize('║          BobSec Demo Simulation Runner v1.0                  ║', 'cyan'))
  console.log(colorize('║          Testing all 7 samples through Bob pipeline          ║', 'cyan'))
  console.log(colorize('╚════════════════════════════════════════════════════════════════╝\n', 'cyan'))

  const results = []
  const startTime = Date.now()

  // Run each sample
  for (const sample of DEMO_SAMPLES) {
    process.stdout.write(colorize(`Running ${sample.id}... `, 'gray'))
    
    try {
      const sampleStart = Date.now()
      const result = await orchestrate(sample.text, { mode: 'pre_incident', lang: 'en' })
      const elapsed = Date.now() - sampleStart

      results.push({
        id: sample.id,
        name: sample.name,
        riskLevel: result.risk_level,
        riskScore: result.risk_score,
        category: result.category,
        confidence: result.confidence,
        elapsedMs: elapsed,
        traceSteps: result.trace?.length || 0,
        policyPassed: result.policy_decision?.policy_passed || false,
        error: false
      })

      console.log(colorize('✓', 'green'))
    } catch (error) {
      results.push({
        id: sample.id,
        name: sample.name,
        riskLevel: 'ERROR',
        riskScore: 0,
        category: 'ERROR',
        confidence: 0,
        elapsedMs: 0,
        traceSteps: 0,
        policyPassed: false,
        error: true,
        errorMsg: error.message
      })

      console.log(colorize('✗', 'red'))
    }
  }

  const totalTime = Date.now() - startTime

  // Print results table
  console.log(colorize('\n╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗', 'cyan'))
  console.log(colorize('║                                              SIMULATION RESULTS                                                          ║', 'cyan'))
  console.log(colorize('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝\n', 'cyan'))

  // Table headers
  const widths = [12, 25, 12, 10, 20, 12, 10, 8, 8]
  const headers = ['Sample ID', 'Name', 'Risk Level', 'Score', 'Category', 'Confidence', 'Time(ms)', 'Steps', 'Policy']
  
  console.log(colorize(formatRow(headers, widths), 'bright'))
  console.log('─'.repeat(widths.reduce((a, b) => a + b + 3, 0)))

  // Table rows
  results.forEach(r => {
    const row = [
      r.id,
      r.name,
      r.riskLevel,
      r.riskScore,
      r.category,
      `${r.confidence}%`,
      r.elapsedMs,
      r.traceSteps,
      r.policyPassed ? '✓' : '✗'
    ]
    
    const riskColor = getRiskColor(r.riskLevel)
    const formattedRow = formatRow(row, widths)
    console.log(colorize(formattedRow, r.error ? 'red' : riskColor))
  })

  // Summary statistics
  console.log('\n' + '─'.repeat(widths.reduce((a, b) => a + b + 3, 0)))
  
  const successCount = results.filter(r => !r.error).length
  const highRiskCount = results.filter(r => r.riskLevel === 'HIGH').length
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.elapsedMs, 0) / results.length)
  const avgConfidence = Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length)
  const policyPassRate = Math.round((results.filter(r => r.policyPassed).length / results.length) * 100)

  console.log(colorize('\n📊 Summary Statistics:', 'bright'))
  console.log(`   Total Samples      : ${results.length}`)
  console.log(`   Successful         : ${colorize(successCount, 'green')} / ${results.length}`)
  console.log(`   High Risk Detected : ${colorize(highRiskCount, 'red')}`)
  console.log(`   Avg Processing Time: ${colorize(avgTime + 'ms', 'cyan')}`)
  console.log(`   Avg Confidence     : ${colorize(avgConfidence + '%', 'cyan')}`)
  console.log(`   Policy Pass Rate   : ${colorize(policyPassRate + '%', 'green')}`)
  console.log(`   Total Runtime      : ${colorize(totalTime + 'ms', 'cyan')}`)

  // Error details
  const errors = results.filter(r => r.error)
  if (errors.length > 0) {
    console.log(colorize('\n⚠️  Errors:', 'red'))
    errors.forEach(e => {
      console.log(`   ${e.id}: ${e.errorMsg}`)
    })
  }

  console.log(colorize('\n✓ Simulation complete!\n', 'green'))

  // Return results for programmatic use
  return {
    results,
    summary: {
      total: results.length,
      successful: successCount,
      highRisk: highRiskCount,
      avgTimeMs: avgTime,
      avgConfidence,
      policyPassRate,
      totalTimeMs: totalTime
    }
  }
}

// Run if called directly
if (require.main === module) {
  runSimulation()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(colorize('\n✗ Simulation failed:', 'red'), err)
      process.exit(1)
    })
}

// Export for programmatic use
module.exports = { runSimulation, DEMO_SAMPLES }

// Made with Bob
