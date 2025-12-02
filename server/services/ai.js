const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateSummary = async (text) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env file");
    }
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Summarize the following university announcement into exactly 60 words, keeping the key information intact. Make it engaging for students. \n\nAnnouncement: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error Details:", JSON.stringify(error, null, 2));
    console.error("Original Error:", error);
    return "Summary generation failed. Please check server logs for details.";
  }
};

const generateImage = async (title, tags = []) => {
  console.log("Generating image for:", title);
  
  // Using Pexels API - Free, high-quality stock photos
  // Requires a free API key from pexels.com
  if (process.env.PEXELS_API_KEY) {
    try {
      const keywords = tags.length > 0 ? tags.join(" ") : "university education students";
      const searchQuery = encodeURIComponent(keywords);
      
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.photos && data.photos.length > 0) {
          console.log("Pexels image fetched successfully");
          return data.photos[0].src.large2x;
        }
      }
    } catch (error) {
      console.error("Pexels API Error:", error);
    }
  }
  
  // Fallback: Use Picsum for random high-quality photos
  // Completely free, no key required
  console.log("Using Picsum fallback");
  const seed = encodeURIComponent(title);
  return `https://picsum.photos/seed/${seed}/1600/900`;
};

module.exports = { generateSummary, generateImage };
