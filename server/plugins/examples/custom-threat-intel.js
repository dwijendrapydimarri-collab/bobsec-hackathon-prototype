/**
 * Example Plugin: Custom Threat Intel
 * 
 * This plugin demonstrates how to add custom threat intelligence
 * lookups to the analysis pipeline.
 */

module.exports = {
  // Plugin metadata
  name: 'Custom Threat Intel',
  slug: 'custom-threat-intel',
  version: '1.0.0',
  description: 'Adds custom threat intelligence lookups from external sources',
  author: 'BobSec Team',
  type: 'integration',
  
  // Plugin manifest
  manifest: {
    hooks: ['entity.extracted', 'analysis.post'],
    permissions: ['http', 'storage'],
    dependencies: [],
    config: {
      apiKey: {
        type: 'string',
        required: true,
        description: 'API key for threat intel service'
      },
      apiUrl: {
        type: 'string',
        required: true,
        default: 'https://api.threatintel.example.com',
        description: 'Base URL for threat intel API'
      },
      cacheEnabled: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Enable caching of threat intel results'
      }
    }
  },
  
  // Hook handlers
  hooks: {
    /**
     * Called when entities are extracted
     */
    'entity.extracted': async function(context) {
      const { entities, input } = context
      const config = plugin.config
      
      console.log('Custom Threat Intel: Checking extracted entities')
      
      const enrichedEntities = { ...entities }
      
      // Check URLs against custom threat intel
      if (entities.urls && entities.urls.length > 0) {
        for (const url of entities.urls) {
          try {
            // Check cache first
            const cacheKey = `threat-intel:url:${url}`
            let result = null
            
            if (config.cacheEnabled) {
              result = await plugin.storage.get(cacheKey)
            }
            
            if (!result) {
              // Call external threat intel API
              const response = await plugin.http.post(`${config.apiUrl}/check-url`, {
                url: url,
                apiKey: config.apiKey
              })
              
              result = response.data
              
              // Cache result for 1 hour
              if (config.cacheEnabled) {
                await plugin.storage.set(cacheKey, result, { ttl: 3600 })
              }
            }
            
            // Add threat intel data to entity
            if (result.isMalicious) {
              enrichedEntities.urls = enrichedEntities.urls.map(u => 
                u === url ? { 
                  value: u, 
                  threatIntel: {
                    malicious: true,
                    confidence: result.confidence,
                    categories: result.categories,
                    source: 'custom-threat-intel'
                  }
                } : u
              )
            }
          } catch (error) {
            console.error(`Failed to check URL ${url}:`, error.message)
          }
        }
      }
      
      // Check phone numbers
      if (entities.phone_numbers && entities.phone_numbers.length > 0) {
        for (const phone of entities.phone_numbers) {
          try {
            const cacheKey = `threat-intel:phone:${phone}`
            let result = null
            
            if (config.cacheEnabled) {
              result = await plugin.storage.get(cacheKey)
            }
            
            if (!result) {
              const response = await plugin.http.post(`${config.apiUrl}/check-phone`, {
                phone: phone,
                apiKey: config.apiKey
              })
              
              result = response.data
              
              if (config.cacheEnabled) {
                await plugin.storage.set(cacheKey, result, { ttl: 3600 })
              }
            }
            
            if (result.isScam) {
              enrichedEntities.phone_numbers = enrichedEntities.phone_numbers.map(p =>
                p === phone ? {
                  value: p,
                  threatIntel: {
                    scam: true,
                    reportCount: result.reportCount,
                    scamTypes: result.scamTypes,
                    source: 'custom-threat-intel'
                  }
                } : p
              )
            }
          } catch (error) {
            console.error(`Failed to check phone ${phone}:`, error.message)
          }
        }
      }
      
      plugin.emit('entities.enriched', { enrichedEntities })
      
      return { enrichedEntities }
    },
    
    /**
     * Called after analysis completes
     */
    'analysis.post': async function(context) {
      const { analysis } = context
      
      console.log('Custom Threat Intel: Analysis complete', {
        analysisId: analysis.analysis_id,
        riskLevel: analysis.risk_level
      })
      
      // Log high-risk analyses for monitoring
      if (analysis.risk_level === 'HIGH') {
        plugin.emit('high-risk-detected', {
          analysisId: analysis.analysis_id,
          riskScore: analysis.risk_score,
          category: analysis.category
        })
      }
      
      return { processed: true }
    }
  }
}

// Made with Bob
