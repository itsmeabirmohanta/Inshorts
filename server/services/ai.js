const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateSummary = async (text) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return generateFallbackSummary(text);
    }
    
    // Use gemini-1.5-flash (stable, fast, and widely available)
    // Falls back to text truncation if API fails
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Summarize the following university announcement into exactly 60 words, keeping the key information intact. Make it engaging for students. \n\nAnnouncement: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Gemini API Error:", error.message || error);
    }
    return generateFallbackSummary(text);
  }
};

const generateFallbackSummary = (text) => {
  const words = text.trim().split(/\s+/);
  if (words.length <= 60) {
    return text.trim();
  }
  const summary = words.slice(0, 60).join(' ');
  return summary + '...';
};

const generateImage = async (title, tags = []) => {
  // Primary: Use Picsum (reliable, no API key needed)
  const seed = encodeURIComponent((title + Date.now()).replace(/\s+/g, '-'));
  const picsum = `https://picsum.photos/seed/${seed}/1600/900`;
  
  // Try Unsplash API if key is available
  if (process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const keywords = tags.length > 0 ? tags.join(",") : title;
      const searchQuery = encodeURIComponent(keywords);
      
      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=${searchQuery}&orientation=landscape&content_filter=high`,
        {
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.urls && data.urls.regular) {
          return data.urls.regular;
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Unsplash API Error:", error.message);
      }
    }
  }
  
  // Fallback to Pexels if key is available
  if (process.env.PEXELS_API_KEY) {
    try {
      const keywords = tags.length > 0 ? tags.join(" ") : "education university";
      const searchQuery = encodeURIComponent(keywords);
      const randomPage = Math.floor(Math.random() * 5) + 1;
      
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
  
  // Default: Always return Picsum (works 100% of the time)
  return picsum;
};

module.exports = { generateSummary, generateImage };
