const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { generateSummary, generateImage } = require('../services/ai');

// Get all announcements (optional filter by authorId)
router.get('/', async (req, res) => {
  const { authorId, category } = req.query;
  try {
    let query = {};
    if (authorId) query.authorId = authorId;
    if (category && category !== 'All') query.category = category;
    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create announcement (Teacher only)
router.post('/', async (req, res) => {
  const { title, description, tags, authorId, category } = req.body;
  
  if (!title || !description || !authorId) {
    return res.status(400).json({ message: 'Title, description, and authorId are required' });
  }

  try {
    // Generate AI content
    const summary = await generateSummary(description);
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
  const { title, description, tags, category } = req.body;
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    let summary = announcement.summary;
    let imageUrl = announcement.imageUrl;

    // Regenerate summary if description changed
    if (description && description !== announcement.originalDescription) {
      summary = await generateSummary(description);
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
