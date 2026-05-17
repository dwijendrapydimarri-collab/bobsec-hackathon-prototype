// Feedback Repository - Persistence layer for user feedback
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

const DATA_DIR = path.join(__dirname, '../data/db')
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

// Initialize feedback file if it doesn't exist
async function initializeFile() {
  await ensureDataDir()
  try {
    await fs.access(FEEDBACK_FILE)
  } catch {
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify([], null, 2))
  }
}

class FeedbackRepository {
  constructor() {
    this.filePath = FEEDBACK_FILE
    initializeFile()
  }

  async read() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return []
    }
  }

  async write(data) {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2))
  }

  // Save feedback
  async saveFeedback(feedback) {
    const feedbacks = await this.read()
    
    const record = {
      id: crypto.randomUUID(),
      userId: feedback.userId || null,
      tenantId: feedback.tenantId || 'demo',
      message: feedback.message,
      verdict: feedback.verdict,
      matchedRules: feedback.matchedRules || [],
      userComment: feedback.userComment || '',
      entities: feedback.entities || {},
      feedbackType: feedback.feedbackType || 'incorrect_verdict',
      ruleSuggested: feedback.ruleSuggested || false,
      suggestionId: feedback.suggestionId || null,
      createdAt: new Date().toISOString()
    }
    
    feedbacks.push(record)
    await this.write(feedbacks)
    
    return record
  }

  // List feedback by user
  async listByUser(userId, tenantId, limit = 50) {
    const feedbacks = await this.read()
    
    const filtered = feedbacks
      .filter(f => f.userId === userId && f.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
    
    return filtered
  }

  // List all feedback by tenant
  async listByTenant(tenantId, limit = 100) {
    const feedbacks = await this.read()
    
    const filtered = feedbacks
      .filter(f => f.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
    
    return filtered
  }

  // Get feedback statistics
  async getStats(tenantId) {
    const feedbacks = await this.read()
    const tenantFeedback = feedbacks.filter(f => f.tenantId === tenantId)
    
    return {
      total: tenantFeedback.length,
      withSuggestions: tenantFeedback.filter(f => f.ruleSuggested).length,
      byType: {
        incorrect_verdict: tenantFeedback.filter(f => f.feedbackType === 'incorrect_verdict').length,
        false_positive: tenantFeedback.filter(f => f.feedbackType === 'false_positive').length,
        false_negative: tenantFeedback.filter(f => f.feedbackType === 'false_negative').length
      }
    }
  }
}

module.exports = new FeedbackRepository()

// Made with Bob
