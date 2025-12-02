const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  originalDescription: { type: String, required: true },
  summary: { type: String, required: true }, // AI generated 60 words
  imageUrl: { type: String, required: true }, // AI generated
  tags: [{ type: String }], // User provided tags for image generation
  category: { 
    type: String, 
    enum: ['All', 'Academic', 'Administrative/Misc', 'Co-curricular/Sports/Cultural', 'Placement'],
    default: 'All'
  },
  authorId: { type: String, required: true }, // ID of the teacher who created it
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Announcement', announcementSchema);
