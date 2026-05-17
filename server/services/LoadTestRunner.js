/**
 * Load Test Runner
 * 
 * Executes load tests against the analysis pipeline to measure performance
 * under various load conditions.
 */

const logger = require('../utils/logger')
const { executeVersionedAnalysis } = require('../orchestrator/versionedOrchestrator')

class LoadTestRunner {
  constructor() {
    this.activeTests = new Map() // testId -> test state
    this.results = new Map() // testId -> results
  }

  /**
   * Run load test
   */
  async runTest(config) {
    const testId = this.generateTestId()
    const startTime = Date.now()

    const testState = {
      id: testId,
      config,
      status: 'running',
      startTime,
      endTime: null,
      progress: 0,
      results: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        latencies: [],
        errors: [],
        throughput: 0,
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0
      }
    }

    this.activeTests.set(testId, testState)

    try {
      logger.info('Load test started', {
        testId,
        config: {
          duration: config.duration,
          concurrency: config.concurrency,
          rampUp: config.rampUp
        }
      })

      // Execute test based on strategy
      if (config.strategy === 'constant') {
        await this.runConstantLoad(testState)
      } else if (config.strategy === 'ramp') {
        await this.runRampLoad(testState)
      } else if (config.strategy === 'spike') {
        await this.runSpikeLoad(testState)
      } else if (config.strategy === 'stress') {
        await this.runStressTest(testState)
      }

      // Calculate final metrics
      this.calculateMetrics(testState)

      testState.status = 'completed'
      testState.endTime = Date.now()

      logger.info('Load test completed', {
        testId,
        duration: testState.endTime - testState.startTime,
        totalRequests: testState.results.totalRequests,
        successRate: (testState.results.successfulRequests / testState.results.totalRequests * 100).toFixed(2),
        avgLatency: testState.results.avgLatency.toFixed(2)
      })

      this.results.set(testId, testState)
      return testState

    } catch (error) {
      testState.status = 'failed'
      testState.endTime = Date.now()
      testState.error = error.message

      logger.error('Load test failed', {
        testId,
        error: error.message
      })

      throw error
    } finally {
      this.activeTests.delete(testId)
    }
  }

  /**
   * Run constant load test
   */
  async runConstantLoad(testState) {
    const { config, results } = testState
    const { duration, concurrency, payload } = config

    const endTime = Date.now() + (duration * 1000)
    const workers = []

    // Start concurrent workers
    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker(testState, endTime, payload))
    }

    await Promise.all(workers)
  }

  /**
   * Run ramp-up load test
   */
  async runRampLoad(testState) {
    const { config, results } = testState
    const { duration, concurrency, rampUp, payload } = config

    const endTime = Date.now() + (duration * 1000)
    const rampUpMs = rampUp * 1000
    const workers = []

    // Gradually add workers
    for (let i = 0; i < concurrency; i++) {
      const delay = (i / concurrency) * rampUpMs
      setTimeout(() => {
        workers.push(this.worker(testState, endTime, payload))
      }, delay)
    }

    // Wait for ramp-up to complete
    await new Promise(resolve => setTimeout(resolve, rampUpMs))

    // Wait for all workers to finish
    await Promise.all(workers)
  }

  /**
   * Run spike load test
   */
  async runSpikeLoad(testState) {
    const { config, results } = testState
    const { duration, concurrency, payload } = config

    const phaseDuration = duration / 3
    const endTime = Date.now() + (duration * 1000)

    // Phase 1: Normal load (25% concurrency)
    await this.runPhase(testState, Math.floor(concurrency * 0.25), phaseDuration, payload)

    // Phase 2: Spike (100% concurrency)
    await this.runPhase(testState, concurrency, phaseDuration, payload)

    // Phase 3: Recovery (25% concurrency)
    await this.runPhase(testState, Math.floor(concurrency * 0.25), phaseDuration, payload)
  }

  /**
   * Run stress test (increasing load until failure)
   */
  async runStressTest(testState) {
    const { config, results } = testState
    const { duration, payload } = config

    let concurrency = 10
    const phaseDuration = 30 // 30 seconds per phase
    const maxConcurrency = 1000

    while (concurrency <= maxConcurrency) {
      logger.info('Stress test phase', { concurrency })

      await this.runPhase(testState, concurrency, phaseDuration, payload)

      // Check if error rate is too high
      const errorRate = results.failedRequests / results.totalRequests
      if (errorRate > 0.1) {
        logger.warn('Stress test threshold reached', {
          concurrency,
          errorRate: (errorRate * 100).toFixed(2)
        })
        break
      }

      concurrency += 10
    }
  }

  /**
   * Run test phase with specific concurrency
   */
  async runPhase(testState, concurrency, duration, payload) {
    const endTime = Date.now() + (duration * 1000)
    const workers = []

    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker(testState, endTime, payload))
    }

    await Promise.all(workers)
  }

  /**
   * Worker that sends requests until end time
   */
  async worker(testState, endTime, payload) {
    const { results } = testState

    while (Date.now() < endTime) {
      const requestStart = Date.now()

      try {
        // Execute analysis
        await executeVersionedAnalysis(payload.input, {
          organizationId: payload.organizationId,
          userId: payload.userId || 'load-test-user',
          requestId: this.generateRequestId()
        })

        const latency = Date.now() - requestStart

        // Record success
        results.totalRequests++
        results.successfulRequests++
        results.totalLatency += latency
        results.latencies.push(latency)
        results.minLatency = Math.min(results.minLatency, latency)
        results.maxLatency = Math.max(results.maxLatency, latency)

      } catch (error) {
        const latency = Date.now() - requestStart

        // Record failure
        results.totalRequests++
        results.failedRequests++
        results.errors.push({
          timestamp: Date.now(),
          error: error.message,
          latency
        })
      }

      // Update progress
      testState.progress = Math.min(100, ((Date.now() - testState.startTime) / (endTime - testState.startTime)) * 100)
    }
  }

  /**
   * Calculate final metrics
   */
  calculateMetrics(testState) {
    const { results } = testState
    const duration = (testState.endTime - testState.startTime) / 1000

    // Average latency
    results.avgLatency = results.totalRequests > 0
      ? results.totalLatency / results.totalRequests
      : 0

    // Throughput (requests per second)
    results.throughput = results.totalRequests / duration

    // Percentiles
    if (results.latencies.length > 0) {
      const sorted = results.latencies.sort((a, b) => a - b)
      results.p50Latency = this.percentile(sorted, 50)
      results.p95Latency = this.percentile(sorted, 95)
      results.p99Latency = this.percentile(sorted, 99)
    }

    // Success rate
    results.successRate = results.totalRequests > 0
      ? (results.successfulRequests / results.totalRequests) * 100
      : 0

    // Error rate
    results.errorRate = results.totalRequests > 0
      ? (results.failedRequests / results.totalRequests) * 100
      : 0
  }

  /**
   * Calculate percentile
   */
  percentile(sorted, p) {
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[index] || 0
  }

  /**
   * Get test status
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId) || this.results.get(testId)
  }

  /**
   * Get all test results
   */
  getAllResults() {
    return Array.from(this.results.values())
  }

  /**
   * Stop running test
   */
  stopTest(testId) {
    const test = this.activeTests.get(testId)
    if (test) {
      test.status = 'stopped'
      this.activeTests.delete(testId)
      this.results.set(testId, test)
      return true
    }
    return false
  }

  /**
   * Generate test ID
   */
  generateTestId() {
    return `load-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
let instance = null

function getLoadTestRunner() {
  if (!instance) {
    instance = new LoadTestRunner()
  }
  return instance
}

module.exports = { LoadTestRunner, getLoadTestRunner }

// Made with Bob
