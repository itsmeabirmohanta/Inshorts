const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  originalDescription: { type: String, required: true },
  summary: { type: String, required: true }, // AI generated 60 words
  imageUrl: { type: String, required: true }, // AI generated
  tags: [{ type: String }], // User provided tags for image generation
  category: { 
    type: String, 
    enum: ['All', 'Academic', 'Administrative/Misc', 'Sports/Cultural', 'Co-curricular/Sports/Cultural', 'Placement', 'Benefits', 'Competitions'],
    default: 'All'
  },
  audience: {
    type: String,
    enum: ['Faculty', 'Students', 'Both'],
    default: 'Both'
  },
  students: [
    {
      name: String,
      regId: String,
      email: String
    }
  ],
  staff: [
    {
      name: String,
      staffId: String,
      email: String
    }
  ],
  attachments: [
    {
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      fileSize: { type: Number }, // in bytes
      fileType: { type: String }, // MIME type
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  authorId: { type: String, required: true }, // ID of the teacher who created it
  createdAt: { type: Date, default: Date.now },
});

// Add indexes for frequently queried fields to improve performance
announcementSchema.index({ authorId: 1, createdAt: -1 }); // Compound index for author's announcements sorted by date
announcementSchema.index({ category: 1 }); // Index for filtering by category
announcementSchema.index({ createdAt: -1 }); // Index for sorting by date

module.exports = mongoose.model('Announcement', announcementSchema);
