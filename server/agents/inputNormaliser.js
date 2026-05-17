// Input Normaliser - Pre-processes user input before analysis

export function normalizeInput(rawInput) {
  const startTime = Date.now();
  
  // Strip formatting characters
  let normalized = rawInput.trim();
  
  // Detect language
  const hindiPattern = /[\u0900-\u097F]/;
  const hasHindi = hindiPattern.test(normalized);
  const hasEnglish = /[a-zA-Z]/.test(normalized);
  
  let detectedLanguage = 'en';
  if (hasHindi && !hasEnglish) {
    detectedLanguage = 'hi';
  } else if (hasHindi && hasEnglish) {
    detectedLanguage = 'hi-en'; // Mixed
  }
  
  // Check for distress markers
  const distressMarkers = [
    'i already clicked',
    'i already paid',
    'i gave my otp',
    'i am scared',
    'what do i do',
    'i already transferred',
    'i entered my password',
    'मुझे डर लग रहा है',
    'मैंने पहले ही',
    'मैंने क्लिक कर दिया',
    'मैंने पैसे भेज दिए'
  ];
  
  const lowerInput = normalized.toLowerCase();
  const distressed = distressMarkers.some(marker => lowerInput.includes(marker));
  
  // Extract candidate entities
  const entities = extractEntities(normalized);
  
  return {
    normalized,
    language: detectedLanguage,
    distressed,
    entities,
    time_ms: Date.now() - startTime
  };
}

function extractEntities(text) {
  const entities = {
    phone_numbers: [],
    urls: [],
    upi_ids: [],
    urgency_phrases: []
  };
  
  // Extract phone numbers (10-digit or +91 format)
  const phonePattern = /(\+91[-\s]?)?[6-9]\d{9}/g;
  const phones = text.match(phonePattern);
  if (phones) {
    entities.phone_numbers = [...new Set(phones.map(p => p.trim()))];
  }
  
  // Extract URLs and domains
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g;
  const urls = text.match(urlPattern);
  if (urls) {
    entities.urls = [...new Set(urls.map(u => u.replace(/^https?:\/\//, '').replace(/^www\./, '')))];
  }
  
  // Extract UPI IDs
  const upiPattern = /[a-zA-Z0-9._-]+@[a-zA-Z0-9]+/g;
  const upis = text.match(upiPattern);
  if (upis) {
    entities.upi_ids = [...new Set(upis)];
  }
  
  // Extract urgency phrases
  const urgencyKeywords = [
    'immediately', 'urgent', 'within 24 hours', 'expires', 'limited time',
    'act now', 'last chance', 'suspended', 'blocked', 'legal action',
    'तुरंत', 'जल्दी', 'अभी', 'बंद हो जाएगा', 'कानूनी कार्रवाई'
  ];
  
  const lowerText = text.toLowerCase();
  urgencyKeywords.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      // Extract the sentence containing the keyword
      const sentences = text.split(/[.!?।]/);
      const matchingSentence = sentences.find(s => 
        s.toLowerCase().includes(keyword.toLowerCase())
      );
      if (matchingSentence && !entities.urgency_phrases.includes(matchingSentence.trim())) {
        entities.urgency_phrases.push(matchingSentence.trim());
      }
    }
  });
  
  return entities;
}

export function checkLanguageSupport(language) {
  // Only English and Hindi are supported
  if (language === 'en' || language === 'hi' || language === 'hi-en') {
    return { supported: true };
  }
  
  return {
    supported: false,
    error: {
      en: "I currently support Hindi and English only. Please describe the suspicious message in Hindi or English and I will help you.",
      hi: "मैं अभी केवल हिंदी और English में काम करता/करती हूँ। कृपया संदिग्ध मैसेज हिंदी या English में बताएं।"
    }
  };
}

// Made with Bob
