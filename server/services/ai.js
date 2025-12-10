const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateSummary = async (text) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing in .env file - using fallback summary");
      return generateFallbackSummary(text);
    }
    
    // Use gemini-1.5-flash (stable model)
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
    const prompt = `Summarize the following university announcement into exactly 60 words, keeping the key information intact. Make it engaging for students. \n\nAnnouncement: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error Details:", JSON.stringify(error, null, 2));
    console.error("Original Error:", error);
    
    // Check for specific error types
    if (error.message && error.message.includes('API key expired')) {
      console.error("⚠️  GEMINI API KEY HAS EXPIRED - Please update GEMINI_API_KEY in .env file");
      console.error("   Get a new key from: https://aistudio.google.com/app/apikey");
    }
    
    // Return a fallback summary instead of error message
    return generateFallbackSummary(text);
  }
};

// Fallback summary generation when AI is unavailable
const generateFallbackSummary = (text) => {
  // Simple text truncation with word boundary
  const words = text.trim().split(/\s+/);
  if (words.length <= 60) {
    return text.trim();
  }
  // Take first 60 words and add ellipsis
  const summary = words.slice(0, 60).join(' ');
  return summary + '...';
};

const generateImage = async (title, tags = []) => {
  // Try Unsplash first (free, no key required)
  try {
    const keywords = tags.length > 0 ? tags.join(" ") : title;
    const searchQuery = encodeURIComponent(keywords);
    
    const response = await fetch(
      `https://source.unsplash.com/1600x900/?${searchQuery}`,
      { redirect: 'follow' }
    );
    
    if (response.ok && response.url) {
      return response.url;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Unsplash Error:", error.message);
    }
  }
  
  // Try Pexels API if available
  if (process.env.PEXELS_API_KEY) {
    try {
      const keywords = tags.length > 0 ? tags.join(" ") : "university education students";
      const searchQuery = encodeURIComponent(keywords);
      const randomPage = Math.floor(Math.random() * 5) + 1; // Get random page for variety
      
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1&page=${randomPage}&orientation=landscape`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.photos && data.photos.length > 0) {
          return data.photos[0].src.large2x;
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Pexels API Error:", error.message);
      }
    }
  }
  
  // Fallback: Use Picsum for random high-quality photos
  const seed = encodeURIComponent(title + Date.now()); // Add timestamp for different images
  return `https://picsum.photos/seed/${seed}/1600/900`;
};

module.exports = { generateSummary, generateImage };
