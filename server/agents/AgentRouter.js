/**
 * AgentRouter - Routes analysis requests to sector-specific agents
 * 
 * Determines which specialized agent should handle the analysis based on:
 * - Platform context (sector, region)
 * - Content characteristics
 * - User preferences
 */

const ConsumerAgent = require('./ConsumerAgent')
const BankSideAgent = require('./BankSideAgent')
const logger = require('../utils/logger')

class AgentRouter {
  constructor() {
    this.agents = {
      CONSUMER: new ConsumerAgent(),
      BANK: new BankSideAgent(),
      // TELCO: new TelcoSideAgent(),      // Phase 10.3 continuation
      // GOV: new InvestigatorAgent(),      // Phase 10.3 continuation
      // WALLET: new WalletAgent(),         // Phase 10.3 continuation
      // NGO: new PolicyAdvisorAgent()      // Phase 10.3 continuation
    }
    
    this.defaultAgent = this.agents.CONSUMER
  }
  
  /**
   * Route analysis to appropriate agent
   * 
   * @param {string} input - Content to analyse
   * @param {Object} context - Platform context
   * @returns {Promise<Object>} Analysis result
   */
  async route(input, context) {
    logger.info('AgentRouter: Routing analysis', {
      sector: context.sector,
      region: context.region,
      channel: context.channel
    })
    
    // Select agent based on sector
    const agent = this.selectAgent(context)
    
    logger.info('AgentRouter: Selected agent', {
      agent: agent.name,
      sector: agent.sector
    })
    
    // Execute analysis
    const result = await agent.analyse(input, context)
    
    // Add routing metadata
    result.routing = {
      selected_agent: agent.name,
      sector: agent.sector,
      routing_reason: this.getRoutingReason(context),
      alternative_agents: this.getAlternativeAgents(context)
    }
    
    return result
  }
  
  /**
   * Select appropriate agent based on context
   */
  selectAgent(context) {
    // Primary selection: by sector
    if (context.sector && this.agents[context.sector]) {
      return this.agents[context.sector]
    }
    
    // Fallback: default agent
    logger.warn('AgentRouter: No agent for sector, using default', {
      sector: context.sector
    })
    
    return this.defaultAgent
  }
  
  /**
   * Get routing reason for transparency
   */
  getRoutingReason(context) {
    if (context.sector && this.agents[context.sector]) {
      return `Routed to ${context.sector} agent based on organization sector`
    }
    
    return 'Routed to default CONSUMER agent'
  }
  
  /**
   * Get alternative agents that could handle this request
   */
  getAlternativeAgents(context) {
    return Object.keys(this.agents)
      .filter(sector => sector !== context.sector)
      .map(sector => ({
        sector,
        agent: this.agents[sector].name,
        capabilities: this.agents[sector].capabilities
      }))
  }
  
  /**
   * Get all available agents
   */
  getAvailableAgents() {
    return Object.entries(this.agents).map(([sector, agent]) => ({
      sector,
      name: agent.name,
      capabilities: agent.capabilities
    }))
  }
  
  /**
   * Check if agent is available for sector
   */
  isAgentAvailable(sector) {
    return !!this.agents[sector]
  }
}

module.exports = AgentRouter

// Made with Bob
