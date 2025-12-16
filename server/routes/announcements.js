const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { generateSummary, generateImage } = require('../services/ai');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs').promises;
const { sanitizeInput } = require('../utils/security');

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

router.post('/', upload.array('files'), async (req, res) => {
  try {
    const { title, description, tags, authorId, category, summary: manualSummary, audience, students, staff } = req.body;
    
    // Input validation
    if (!title || !description || !authorId) {
      return res.status(400).json({ message: 'Title, description, and authorId are required' });
    }

    // Sanitize text inputs
    if (!sanitizeInput(title) || !sanitizeInput(description)) {
      return res.status(400).json({ message: 'Invalid input format' });
    }

    // Validate title length
    if (title.length > 200) {
      return res.status(400).json({ message: 'Title must be less than 200 characters' });
    }

    // Parse JSON fields from FormData
    let parsedTags = [];
    let parsedStudents = [];
    let parsedStaff = [];

    try {
      if (tags && typeof tags === 'string') {
        parsedTags = JSON.parse(tags);
      }
      if (students && typeof students === 'string') {
        parsedStudents = JSON.parse(students);
      }
      if (staff && typeof staff === 'string') {
        parsedStaff = JSON.parse(staff);
      }
    } catch (parseErr) {
      console.error('Error parsing JSON fields:', parseErr);
      return res.status(400).json({ message: 'Invalid JSON format in tags, students, or staff fields' });
    }

    // Generate AI content
    // Use manual summary if provided, otherwise generate
    const summary = manualSummary || await generateSummary(description);
    const imageUrl = await generateImage(title, parsedTags);

    // Process uploaded files
    const attachments = req.files ? req.files.map(file => ({
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype
    })) : [];

    const newAnnouncement = new Announcement({
      title,
      originalDescription: description,
      summary,
      imageUrl,
      tags: parsedTags || [],
      category: category || 'All',
      audience: audience || 'Both',
      students: Array.isArray(parsedStudents) ? parsedStudents : [],
      staff: Array.isArray(parsedStaff) ? parsedStaff : [],
      attachments: attachments || [],
      authorId
    });

    const savedAnnouncement = await newAnnouncement.save();
    res.status(201).json(savedAnnouncement);
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ message: err.message || 'Failed to create announcement' });
  }
});

router.put('/:id', upload.array('files'), async (req, res) => {
  const { title, description, tags, category, summary: manualSummary, audience, students, staff } = req.body;
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    let summary = announcement.summary;
    let imageUrl = announcement.imageUrl;

    // Parse JSON fields from FormData
    let parsedTags = announcement.tags;
    let parsedStudents = announcement.students;
    let parsedStaff = announcement.staff;

    try {
      if (tags && typeof tags === 'string') parsedTags = JSON.parse(tags);
      else if (tags) parsedTags = tags;
      
      if (students && typeof students === 'string') parsedStudents = JSON.parse(students);
      else if (students) parsedStudents = students;
      
      if (staff && typeof staff === 'string') parsedStaff = JSON.parse(staff);
      else if (staff) parsedStaff = staff;
    } catch (parseErr) {
      console.error('Error parsing JSON fields:', parseErr);
      return res.status(400).json({ message: 'Invalid JSON format in tags, students, or staff fields' });
    }

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

    if ((parsedTags && JSON.stringify(parsedTags) !== JSON.stringify(announcement.tags)) || (title && title !== announcement.title)) {
      imageUrl = await generateImage(title || announcement.title, parsedTags || announcement.tags);
    }

    // Handle new file uploads
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileSize: file.size,
        fileType: file.mimetype
      }));
      announcement.attachments = newAttachments;
    }

    announcement.title = title || announcement.title;
    announcement.originalDescription = description || announcement.originalDescription;
    announcement.tags = parsedTags;
    announcement.category = category || announcement.category;
    announcement.audience = audience || announcement.audience;
    announcement.students = parsedStudents;
    announcement.staff = parsedStaff;
    announcement.summary = summary;
    announcement.imageUrl = imageUrl;

    const updatedAnnouncement = await announcement.save();
    res.json(updatedAnnouncement);
  } catch (err) {
    console.error('Error updating announcement:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/regenerate-image', async (req, res) => {
  const { customImageUrl } = req.body;
  
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Authorization: require authorId in body or x-user-id header and match announcement author
    const userId = req.body.authorId || req.headers['x-user-id'];
    if (!userId || userId.toString() !== announcement.authorId.toString()) {
      return res.status(403).json({ message: 'Not authorized to upload files to this announcement' });
    }

    // If custom URL provided, use it; otherwise regenerate with AI
    let imageUrl;
    if (customImageUrl && customImageUrl.trim() !== '') {
      imageUrl = customImageUrl.trim();
    } else {
      imageUrl = await generateImage(announcement.title, announcement.tags);
    }

    announcement.imageUrl = imageUrl;
    const updatedAnnouncement = await announcement.save();
    res.json(updatedAnnouncement);
  } catch (err) {
    console.error('Error regenerating image:', err.message);
    res.status(500).json({ message: 'Failed to regenerate image' });
  }
});

// Upload file attachments
router.post('/:id/upload', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

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
    console.error('File upload error:', err.message);
    res.status(500).json({ message: 'Failed to upload files' });
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

    // Authorization: require authorId in body or x-user-id header and match announcement author
    const userId = req.body.authorId || req.headers['x-user-id'];
    if (!userId || userId.toString() !== announcement.authorId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete attachments from this announcement' });
    }

    // Delete file from disk (best-effort)
    const attachment = announcement.attachments[attachmentIndex];
    if (attachment && attachment.fileUrl) {
      try {
        const filePath = path.join(__dirname, '..', attachment.fileUrl);
        await fs.unlink(filePath);
      } catch (fileErr) {
        console.error('Failed to delete file from disk:', fileErr.message);
        // continue even if unlink fails
      }
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
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    // Authorization: require authorId in body or x-user-id header and match announcement author
    const userId = req.body.authorId || req.headers['x-user-id'];
    if (!userId || userId.toString() !== announcement.authorId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this announcement' });
    }

    // Delete files from disk (best-effort)
    if (announcement.attachments && announcement.attachments.length > 0) {
      for (const att of announcement.attachments) {
        if (att.fileUrl) {
          try {
            const filePath = path.join(__dirname, '..', att.fileUrl);
            await fs.unlink(filePath);
          } catch (fileErr) {
            console.error('Failed to delete file from disk during announcement deletion:', fileErr.message);
          }
        }
      }
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
