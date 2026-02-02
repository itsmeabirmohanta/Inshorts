const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const mongoose = require('mongoose');
const { generateSummary, generateImage } = require('../services/ai');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs').promises;
const { sanitizeInput } = require('../utils/security');
const { authenticate, authorize } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiter for file uploads (5 uploads per 15 minutes)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { 
    success: false, 
    error: 'Too many upload requests. Please try again in 15 minutes.', 
    code: 'RATE_LIMIT_EXCEEDED' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper: Validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Get all announcements (optional filter by authorId)
router.get('/', async (req, res) => {
  const { authorId, category } = req.query;
  try {
    let query = {};
    
    // Sanitize authorId if provided
    if (authorId) {
      if (!isValidObjectId(authorId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid author ID format', 
          code: 'INVALID_AUTHOR_ID' 
        });
      }
      query.authorId = authorId;
    }
    
    if (category && category !== 'All') query.category = category;
    
    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch announcements', 
      code: 'FETCH_ERROR' 
    });
  }
});

router.post('/', authenticate, authorize('teacher'), upload.array('files'), async (req, res) => {
  try {
    const { title, description, tags, category, summary: manualSummary, audience, students, staff } = req.body;
    
    // Input validation
    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and description are required', 
        code: 'MISSING_FIELDS' 
      });
    }

    // Validate lengths
    if (title.length > 200) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title must be less than 200 characters', 
        code: 'TITLE_TOO_LONG' 
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Description must be less than 5000 characters', 
        code: 'DESCRIPTION_TOO_LONG' 
      });
    }

    // Sanitize text inputs
    if (!sanitizeInput(title) || !sanitizeInput(description)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input format detected', 
        code: 'INVALID_INPUT' 
      });
    }

    // Parse JSON fields from FormData
    let parsedTags = [];
    let parsedStudents = [];
    let parsedStaff = [];

    try {
      if (tags && typeof tags === 'string') {
        parsedTags = JSON.parse(tags);
        // Limit tags to 5 maximum
        if (parsedTags.length > 5) {
          return res.status(400).json({ 
            success: false, 
            error: 'Maximum 5 tags allowed', 
            code: 'TOO_MANY_TAGS' 
          });
        }
      }
      
      if (students && typeof students === 'string') {
        parsedStudents = JSON.parse(students);
        // Validate email formats
        for (const student of parsedStudents) {
          if (student.email && !emailRegex.test(student.email)) {
            return res.status(400).json({ 
              success: false, 
              error: `Invalid email format: ${student.email}`, 
              code: 'INVALID_EMAIL' 
            });
          }
        }
      }
      
      if (staff && typeof staff === 'string') {
        parsedStaff = JSON.parse(staff);
        // Validate email formats
        for (const member of parsedStaff) {
          if (member.email && !emailRegex.test(member.email)) {
            return res.status(400).json({ 
              success: false, 
              error: `Invalid email format: ${member.email}`, 
              code: 'INVALID_EMAIL' 
            });
          }
        }
      }
    } catch (parseErr) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON format in tags, students, or staff fields', 
        code: 'JSON_PARSE_ERROR' 
      });
    }

    // Generate AI content
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
      authorId: req.user.id // Use authenticated user's ID
    });

    const savedAnnouncement = await newAnnouncement.save();
    res.status(201).json({ success: true, data: savedAnnouncement });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create announcement', 
      code: 'CREATE_ERROR' 
    });
  }
});

router.put('/:id', authenticate, authorize('teacher'), upload.array('files'), async (req, res) => {
  const { title, description, tags, category, summary: manualSummary, audience, students, staff } = req.body;
  
  try {
    // Validate ID format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid announcement ID format', 
        code: 'INVALID_ID' 
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        error: 'Announcement not found', 
        code: 'NOT_FOUND' 
      });
    }

    // Authorization: Check if user owns this announcement
    if (announcement.authorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to edit this announcement', 
        code: 'FORBIDDEN' 
      });
    }

    // Validate input lengths if provided
    if (title && title.length > 200) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title must be less than 200 characters', 
        code: 'TITLE_TOO_LONG' 
      });
    }

    if (description && description.length > 5000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Description must be less than 5000 characters', 
        code: 'DESCRIPTION_TOO_LONG' 
      });
    }

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
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON format in tags, students, or staff fields', 
        code: 'JSON_PARSE_ERROR' 
      });
    }

    // Regenerate summary if description changed AND no manual summary provided
    if (manualSummary && manualSummary !== announcement.summary) {
      summary = manualSummary;
    } else if (description && description !== announcement.originalDescription) {
      summary = await generateSummary(description);
    } else if (manualSummary === "") {
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
      
      if (!announcement.attachments) {
        announcement.attachments = [];
      }
      
      // Append new attachments, avoiding duplicates by filename
      const existingFilenames = new Set(announcement.attachments.map(att => att.fileName));
      const uniqueNewAttachments = newAttachments.filter(att => !existingFilenames.has(att.fileName));
      announcement.attachments = announcement.attachments.concat(uniqueNewAttachments);
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
    res.json({ success: true, data: updatedAnnouncement });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update announcement', 
      code: 'UPDATE_ERROR' 
    });
  }
});

router.post('/:id/regenerate-image', authenticate, authorize('teacher'), async (req, res) => {
  const { customImageUrl } = req.body;
  
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid announcement ID format', 
        code: 'INVALID_ID' 
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        error: 'Announcement not found', 
        code: 'NOT_FOUND' 
      });
    }

    // Authorization: Check if user owns this announcement
    if (announcement.authorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to modify this announcement', 
        code: 'FORBIDDEN' 
      });
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
    res.json({ success: true, data: updatedAnnouncement });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate image', 
      code: 'IMAGE_GENERATION_ERROR' 
    });
  }
});

// Upload file attachments with rate limiting
router.post('/:id/upload', authenticate, authorize('teacher'), uploadLimiter, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files provided', 
        code: 'NO_FILES' 
      });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid announcement ID format', 
        code: 'INVALID_ID' 
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        error: 'Announcement not found', 
        code: 'NOT_FOUND' 
      });
    }

    // Authorization: Check if user owns this announcement
    if (announcement.authorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to upload files to this announcement', 
        code: 'FORBIDDEN' 
      });
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
      success: true,
      message: 'Files uploaded successfully', 
      data: {
        attachments: newAttachments,
        announcement
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload files', 
      code: 'UPLOAD_ERROR' 
    });
  }
});

// Delete attachment
router.delete('/:id/attachment/:attachmentId', authenticate, authorize('teacher'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.attachmentId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid ID format', 
        code: 'INVALID_ID' 
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        error: 'Announcement not found', 
        code: 'NOT_FOUND' 
      });
    }

    // Authorization: Check if user owns this announcement
    if (announcement.authorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to delete attachments from this announcement', 
        code: 'FORBIDDEN' 
      });
    }

    const attachmentIndex = announcement.attachments.findIndex(
      att => att._id.toString() === req.params.attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Attachment not found', 
        code: 'ATTACHMENT_NOT_FOUND' 
      });
    }
    
    // Delete file from disk (best-effort)
    const attachment = announcement.attachments[attachmentIndex];
    if (attachment && attachment.fileUrl) {
      try {
        const safeAttachmentsDir = path.resolve(__dirname, '../uploads');
        const filename = path.basename(attachment.fileUrl);
        
        // Validate filename and resolve path safely
        if (!/^[A-Za-z0-9._-]+$/.test(filename)) {
          // Invalid filename, skip deletion but continue
        } else {
          const filePath = path.resolve(safeAttachmentsDir, filename);
          if (filePath.startsWith(safeAttachmentsDir + path.sep)) {
            await fs.unlink(filePath);
          }
        }
      } catch (fileErr) {
        // File deletion failed, but continue with DB update
      }
    }

    // Remove from array
    announcement.attachments.splice(attachmentIndex, 1);
    await announcement.save();

    res.json({ success: true, message: 'Attachment deleted', data: announcement });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete attachment', 
      code: 'DELETE_ERROR' 
    });
  }
});

// Delete announcement
router.delete('/:id', authenticate, authorize('teacher'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid announcement ID format', 
        code: 'INVALID_ID' 
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false, 
        error: 'Announcement not found', 
        code: 'NOT_FOUND' 
      });
    }

    // Authorization: Check if user owns this announcement
    if (announcement.authorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to delete this announcement', 
        code: 'FORBIDDEN' 
      });
    }

    // Delete files from disk (best-effort - don't fail if files don't exist)
    if (announcement.attachments && announcement.attachments.length > 0) {
      const safeAttachmentsDir = path.resolve(__dirname, '../uploads');
      
      for (const att of announcement.attachments) {
        if (att.fileUrl) {
          try {
            const filename = path.basename(att.fileUrl);
            if (/^[A-Za-z0-9._-]+$/.test(filename)) {
              const filePath = path.resolve(safeAttachmentsDir, filename);
              if (filePath.startsWith(safeAttachmentsDir + path.sep)) {
                await fs.unlink(filePath);
              }
            }
          } catch (fileErr) {
            // Continue even if file deletion fails
          }
        }
      }
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete announcement', 
      code: 'DELETE_ERROR' 
    });
  }
});

module.exports = router;
