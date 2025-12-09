const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { generateSummary, generateImage } = require('../services/ai');

// Get all announcements (optional filter by authorId)
router.get('/', async (req, res) => {
  const { authorId, category, page = 1, limit = 10 } = req.query;
  try {
    const query = {};
    if (authorId) query.authorId = authorId;
    if (category && category !== 'All') query.category = category;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

    const [total, announcements] = await Promise.all([
      Announcement.countDocuments(query),
      Announcement.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * perPage)
        .limit(perPage)
    ]);

    res.json({
      total,
      page: pageNum,
      perPage,
      totalPages: Math.ceil(total / perPage),
      data: announcements
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create announcement (Teacher only)
router.post('/', async (req, res) => {
  const { title, description, tags, authorId, category, summary: manualSummary } = req.body;
  
  if (!title || !description || !authorId) {
    return res.status(400).json({ message: 'Title, description, and authorId are required' });
  }

  try {
    // Generate AI content
    // Use manual summary if provided, otherwise generate
    const summary = manualSummary || await generateSummary(description);
    const imageUrl = await generateImage(title, tags);

    const newAnnouncement = new Announcement({
      title,
      originalDescription: description,
      summary,
      imageUrl,
      tags,
      category: category || 'All',
      authorId
    });

    const savedAnnouncement = await newAnnouncement.save();
    res.status(201).json(savedAnnouncement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update announcement
router.put('/:id', async (req, res) => {
  const { title, description, tags, category, summary: manualSummary } = req.body;
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    let summary = announcement.summary;
    let imageUrl = announcement.imageUrl;

    // Regenerate summary if description changed AND no manual summary provided
    // If manual summary is provided AND it's different from the old one, use it.
    if (manualSummary && manualSummary !== announcement.summary) {
      summary = manualSummary;
    } else if (description && description !== announcement.originalDescription) {
      summary = await generateSummary(description);
    } else if (manualSummary === "") {
      // User explicitly cleared the summary, force regenerate
      summary = await generateSummary(description || announcement.originalDescription);
    }

    // Regenerate image if title or tags changed
    // Note: We always regenerate image if tags are provided, or if title changed
    if ((tags && JSON.stringify(tags) !== JSON.stringify(announcement.tags)) || (title && title !== announcement.title)) {
      imageUrl = await generateImage(title || announcement.title, tags || announcement.tags);
    }

    announcement.title = title || announcement.title;
    announcement.originalDescription = description || announcement.originalDescription;
    announcement.tags = tags || announcement.tags;
    announcement.category = category || announcement.category;
    announcement.summary = summary;
    announcement.imageUrl = imageUrl;

    const updatedAnnouncement = await announcement.save();
    res.json(updatedAnnouncement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Regenerate image for announcement
router.post('/:id/regenerate-image', async (req, res) => {
  const { customImageUrl } = req.body;
  console.log('Regenerate image request for ID:', req.params.id);
  console.log('Custom URL provided:', customImageUrl);
  
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      console.log('Announcement not found:', req.params.id);
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // If custom URL provided, use it; otherwise regenerate with AI
    let imageUrl;
    if (customImageUrl && customImageUrl.trim() !== '') {
      console.log('Using custom image URL');
      imageUrl = customImageUrl.trim();
    } else {
      console.log('Generating new image with AI for:', announcement.title);
      imageUrl = await generateImage(announcement.title, announcement.tags);
    }

    console.log('New image URL:', imageUrl);
    announcement.imageUrl = imageUrl;
    const updatedAnnouncement = await announcement.save();
    console.log('Image updated successfully');
    res.json(updatedAnnouncement);
  } catch (err) {
    console.error('Error regenerating image:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete announcement
router.delete('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
