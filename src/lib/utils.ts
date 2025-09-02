/**
 * Parse Indian number format into rupees
 * Supports: k, L/lakh, Cr/crore, comma formatting, lowercase variants
 */
export function parseINR(input: string | number): number {
  if (typeof input === 'number') return input;
  
  if (!input || typeof input !== 'string') {
    throw new Error('Enter a valid amount (supports k/L/Cr)');
  }

  const cleanInput = input.trim().toLowerCase().replace(/,/g, '');
  
  // Handle unit suffixes
  const unitMatch = cleanInput.match(/^([\d.]+)\s*(k|l|lakh|cr|crore)$/);
  
  if (unitMatch) {
    const [, numberStr, unit] = unitMatch;
    const baseNumber = parseFloat(numberStr);
    
    if (isNaN(baseNumber)) {
      throw new Error('Enter a valid amount (supports k/L/Cr)');
    }
    
    let multiplier = 1;
    
    if (unit === 'k') multiplier = 1e3;
    else if (unit === 'l' || unit === 'lakh') multiplier = 1e5;
    else if (unit === 'cr' || unit === 'crore') multiplier = 1e7;
    
    return baseNumber * multiplier;
  }
  
  // Handle plain numbers
  const plainNumber = parseFloat(cleanInput);
  if (isNaN(plainNumber)) {
    throw new Error('Enter a valid amount (supports k/L/Cr)');
  }
  
  return plainNumber;
}

/**
 * Format number as Indian currency with smart units
 */
export function formatINR(num: number): string {
  if (num >= 1e7) {
    return `₹${(num / 1e7).toFixed(1)} Cr`;
  }
  if (num >= 1e5) {
    return `₹${(num / 1e5).toFixed(1)} L`;
  }
  if (num >= 1e3) {
    return `₹${(num / 1e3).toFixed(1)} k`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Sanitize user input for safety
 */
export function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim().slice(0, 2500);
}

/**
 * Extract citations from Gemini grounding metadata
 */
export function buildCitations(groundingChunks?: any[]): Array<{index: number; title: string; uri: string}> {
  if (!groundingChunks) return [];
  
  return groundingChunks.map((chunk, index) => ({
    index: index + 1,
    title: chunk.web?.title || chunk.title || 'Source',
    uri: chunk.web?.uri || chunk.uri || '#',
  }));
}