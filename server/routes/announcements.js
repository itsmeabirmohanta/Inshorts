const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { generateSummary, generateImage } = require('../services/ai');
const upload = require('../middleware/upload');
const path = require('path');

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
  const { title, description, tags, authorId, category, summary: manualSummary, audience, students, staff } = req.body;
  
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
      audience: audience || 'Both',
      students: Array.isArray(students) ? students : [],
      staff: Array.isArray(staff) ? staff : [],
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
  const { title, description, tags, category, summary: manualSummary, audience, students, staff } = req.body;
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
    announcement.audience = audience || announcement.audience;
    announcement.students = Array.isArray(students) ? students : announcement.students;
    announcement.staff = Array.isArray(staff) ? staff : announcement.staff;
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

// Upload file attachments
router.post('/:id/upload', upload.array('files', 5), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Add uploaded files to attachments array
    const newAttachments = req.files.map(file => ({
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype,
      uploadedAt: new Date()
    }));

    announcement.attachments = announcement.attachments || [];
    announcement.attachments.push(...newAttachments);
    
    await announcement.save();
    res.json({ 
      message: 'Files uploaded successfully', 
      attachments: newAttachments,
      announcement 
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete attachment
router.delete('/:id/attachment/:attachmentId', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const attachmentIndex = announcement.attachments.findIndex(
      att => att._id.toString() === req.params.attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Remove from array
    announcement.attachments.splice(attachmentIndex, 1);
    await announcement.save();

    res.json({ message: 'Attachment deleted', announcement });
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
