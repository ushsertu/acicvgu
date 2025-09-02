const express = require('express');
const cors = require('cors');
import { GoogleGenerativeAI } from '@google/generative-ai';
const { parseINR, sanitizeText, buildCitations, formatINR } = require('./src/lib/utils.js');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting store
const rateLimitStore = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// Quick valuation endpoint
app.post('/api/valuation/quick', async (req, res) => {
  try {
    // Rate limiting
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        hint: 'Please wait a minute before trying again' 
      });
    }

    const { arrOrMrr, isMRR, sector, region, currency, stage } = req.body;

    if (!arrOrMrr || !sector) {
      return res.status(400).json({ error: 'ARR/MRR and sector are required' });
    }

    // Parse ARR
    let arr;
    try {
      const parsed = parseINR(arrOrMrr);
      arr = isMRR ? parsed * 12 : parsed;
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Invalid ARR/MRR format' });
    }

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ 
        error: 'AI service unavailable', 
        hint: 'Please contact support' 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      tools: [{ googleSearch: {} }]
    });

    // Get current multiples with grounding
    const multiplesPrompt = `Find current ARR revenue multiples for ${sector} companies in ${region} at ${stage} stage in 2025. Return ONLY valid JSON:
{
  "multipleMid": number,
  "multipleLow": number, 
  "multipleHigh": number,
  "asOf": "YYYY-MM",
  "shortRationale": "brief reason for this range"
}`;

    const multiplesResult = await model.generateContent(multiplesPrompt);
    const multiplesText = multiplesResult.response.text();
    
    let multiplesData;
    try {
      multiplesData = JSON.parse(multiplesText);
    } catch {
      // Retry with stronger instruction
      const retryPrompt = `${multiplesPrompt}\n\nIMPORTANT: Return ONLY the JSON object, no other text.`;
      const retryResult = await model.generateContent(retryPrompt);
      try {
        multiplesData = JSON.parse(retryResult.response.text());
      } catch {
        return res.status(500).json({ error: 'Unable to fetch current market data. Please try again.' });
      }
    }

    // Build snapshot
    const snapshot = {
      arr,
      sector,
      region,
      currency,
      stage,
      multiples: {
        mid: multiplesData.multipleMid,
        low: multiplesData.multipleLow,
        high: multiplesData.multipleHigh,
        asOf: multiplesData.asOf,
        shortRationale: multiplesData.shortRationale,
      },
    };

    // Compute valuation
    const valuation = {
      mid: arr * multiplesData.multipleMid,
      low: arr * (multiplesData.multipleLow || 0.8 * multiplesData.multipleMid),
      high: arr * (multiplesData.multipleHigh || 1.2 * multiplesData.multipleMid),
    };

    // Get explanation bullets (no search needed)
    const explanationModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const explanationPrompt = `Write exactly 3 concise bullet points explaining this valuation:
- ARR: ${formatINR(arr)}
- Sector: ${sector}
- Region: ${region}
- Stage: ${stage}
- Multiple: ${multiplesData.multipleMid.toFixed(1)}× (range ${(multiplesData.multipleLow || 0.8 * multiplesData.multipleMid).toFixed(1)}×-${(multiplesData.multipleHigh || 1.2 * multiplesData.multipleMid).toFixed(1)}×)
- Valuation: ${formatINR(valuation.mid)}

Focus on: why this multiple makes sense, market context, one key risk. Keep each bullet under 25 words.`;

    const explanationResult = await explanationModel.generateContent(explanationPrompt);
    const explanationText = explanationResult.response.text();
    const explanationBullets = explanationText
      .split('\n')
      .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[•\-*]\s*/, '').trim())
      .slice(0, 3);

    // Extract citations
    const citations = buildCitations(multiplesResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks);

    res.json({
      snapshot,
      valuation,
      explanationBullets,
      citations,
    });

  } catch (error) {
    console.error('Valuation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate valuation', 
      hint: 'Please check your inputs and try again' 
    });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    // Rate limiting
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        hint: 'Please wait a minute before trying again' 
      });
    }

    const { message, snapshot } = req.body;

    if (!message || !snapshot) {
      return res.status(400).json({ error: 'Message and snapshot are required' });
    }

    const sanitizedMessage = sanitizeText(message);
    
    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ 
        error: 'AI service unavailable', 
        hint: 'Please contact support' 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Detect intent and update snapshot
    let updatedSnapshot = { ...snapshot };
    let needsSearch = false;
    let citations = [];

    // ARR change intent
    const arrMatch = sanitizedMessage.match(/(?:make\s+arr|arr|set\s+arr\s+to)\s+([0-9.,]+\s*(?:k|l|lakh|cr|crore)?)/i);
    if (arrMatch) {
      try {
        updatedSnapshot.arr = parseINR(arrMatch[1]);
      } catch (err) {
        return res.json({ 
          reply: 'Please use a valid ARR format (e.g., 2Cr, 15L, 85k)',
          snapshot,
          valuation: null 
        });
      }
    }

    // Multiple change intent
    const multipleMatch = sanitizedMessage.match(/(?:use|set\s+multiple\s+to)\s+([0-9.]+)\s*[×x]/i);
    if (multipleMatch) {
      const newMultiple = parseFloat(multipleMatch[1]);
      if (!isNaN(newMultiple) && newMultiple > 0) {
        updatedSnapshot.multiples.mid = newMultiple;
        updatedSnapshot.multiples.low = newMultiple * 0.8;
        updatedSnapshot.multiples.high = newMultiple * 1.2;
      }
    }

    // Use low/high multiple intent
    if (/use\s+low\s+multiple/i.test(sanitizedMessage)) {
      updatedSnapshot.multiples.mid = updatedSnapshot.multiples.low || updatedSnapshot.multiples.mid * 0.8;
    }
    if (/use\s+high\s+multiple/i.test(sanitizedMessage)) {
      updatedSnapshot.multiples.mid = updatedSnapshot.multiples.high || updatedSnapshot.multiples.mid * 1.2;
    }

    // Percentage change intent
    const percentMatch = sanitizedMessage.match(/([+-]?\d+)%\s+(arr|multiple)/i);
    if (percentMatch) {
      const percent = parseInt(percentMatch[1]) / 100;
      const target = percentMatch[2].toLowerCase();
      
      if (target === 'arr') {
        updatedSnapshot.arr = updatedSnapshot.arr * (1 + percent);
      } else if (target === 'multiple') {
        updatedSnapshot.multiples.mid = updatedSnapshot.multiples.mid * (1 + percent);
        updatedSnapshot.multiples.low = updatedSnapshot.multiples.low ? updatedSnapshot.multiples.low * (1 + percent) : updatedSnapshot.multiples.mid * 0.8;
        updatedSnapshot.multiples.high = updatedSnapshot.multiples.high ? updatedSnapshot.multiples.high * (1 + percent) : updatedSnapshot.multiples.mid * 1.2;
      }
    }

    // Fresh multiples search intent
    if (/latest.*multiples|market\s+multiple\s+now|fresh\s+multiples/i.test(sanitizedMessage)) {
      needsSearch = true;
    }

    // Perform search if needed
    if (needsSearch) {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        tools: [{ googleSearch: {} }]
      });

      const searchPrompt = `Find current ARR revenue multiples for ${updatedSnapshot.sector} companies in ${updatedSnapshot.region} at ${updatedSnapshot.stage} stage in 2025. Return ONLY valid JSON:
{
  "multipleMid": number,
  "multipleLow": number, 
  "multipleHigh": number,
  "asOf": "YYYY-MM",
  "shortRationale": "brief reason for this range"
}`;

      const searchResult = await model.generateContent(searchPrompt);
      const searchText = searchResult.response.text();
      
      try {
        const newMultiples = JSON.parse(searchText);
        updatedSnapshot.multiples = {
          mid: newMultiples.multipleMid,
          low: newMultiples.multipleLow,
          high: newMultiples.multipleHigh,
          asOf: newMultiples.asOf,
          shortRationale: newMultiples.shortRationale,
        };
        citations = buildCitations(searchResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks);
      } catch {
        // Retry with stronger instruction
        const retryPrompt = `${searchPrompt}\n\nIMPORTANT: Return ONLY the JSON object, no other text.`;
        const retryResult = await model.generateContent(retryPrompt);
        try {
          const newMultiples = JSON.parse(retryResult.response.text());
          updatedSnapshot.multiples = {
            mid: newMultiples.multipleMid,
            low: newMultiples.multipleLow,
            high: newMultiples.multipleHigh,
            asOf: newMultiples.asOf,
            shortRationale: newMultiples.shortRationale,
          };
          citations = buildCitations(retryResult.response.candidates?.[0]?.groundingMetadata?.groundingChunks);
        } catch {
          return res.json({ 
            reply: 'Unable to fetch fresh market data right now. Please try again.',
            snapshot,
            valuation: null 
          });
        }
      }
    }

    // Compute new valuation
    const valuation = {
      mid: updatedSnapshot.arr * updatedSnapshot.multiples.mid,
      low: updatedSnapshot.arr * (updatedSnapshot.multiples.low || 0.8 * updatedSnapshot.multiples.mid),
      high: updatedSnapshot.arr * (updatedSnapshot.multiples.high || 1.2 * updatedSnapshot.multiples.mid),
    };

    // Generate reply
    const replyModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const replyPrompt = `User said: "${sanitizedMessage}"

Current valuation snapshot:
- ARR: ${formatINR(updatedSnapshot.arr)}
- Multiple: ${updatedSnapshot.multiples.mid.toFixed(1)}×
- Valuation: ${formatINR(valuation.mid)}

Write a helpful reply (≤120 words) explaining what changed and the new valuation. Include ₹ amounts. Be conversational and helpful.`;

    const replyResult = await replyModel.generateContent(replyPrompt);
    const reply = replyResult.response.text().trim();

    const response = {
      reply,
      snapshot: updatedSnapshot,
      valuation,
    };

    if (citations.length > 0) {
      response.citations = citations;
    }

    res.json(response);

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      reply: 'Sorry, I encountered an error processing your request. Please try again.',
      snapshot: req.body?.snapshot || null,
      valuation: null 
    });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});