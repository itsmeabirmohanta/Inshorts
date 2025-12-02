import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherDashboard = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState(['', '', '']);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/api/announcements?authorId=${user.id}`);
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleTagChange = (index, value) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTags(['', '', '']);
    setCategory('All');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setTitle(item.title);
    setDescription(item.originalDescription);
    // Ensure 3 tags
    const currentTags = item.tags || [];
    setTags([
      currentTags[0] || '',
      currentTags[1] || '',
      currentTags[2] || ''
    ]);
    setCategory(item.category || 'All');
    setEditingId(item._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await axios.delete(`http://localhost:5001/api/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanTags = tags.filter(t => t.trim() !== '');
    
    try {
      if (editingId) {
        await axios.put(`http://localhost:5001/api/announcements/${editingId}`, { 
          title, 
          description, 
          tags: cleanTags,
          category
        });
        alert('Announcement Updated!');
      } else {
        await axios.post('http://localhost:5001/api/announcements', { 
          title, 
          description, 
          tags: cleanTags,
          category,
          authorId: user.id
        });
        alert('Announcement Posted Successfully!');
      }
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Teacher Portal</h1>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { resetForm(); setShowForm(!showForm); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {showForm ? 'Cancel' : '+ New Announcement'}
              </button>
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 font-medium transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{editingId ? 'Edit Announcement' : 'Create New Announcement'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                        placeholder="e.g. End Semester Exam Schedule"
                        required
                      />
                    </div>
                    
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Image Tags (for AI)</label>
                      <div className="flex gap-2">
                        {tags.map((tag, index) => (
                          <input
                            key={index}
                            type="text"
                            value={tag}
                            onChange={(e) => handleTagChange(index, e.target.value)}
                            className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50 focus:bg-white"
                            placeholder={`Tag ${index + 1}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Keywords to guide the AI image generation (e.g. "exam", "calendar", "minimal")</p>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                      >
                        <option value="All">All</option>
                        <option value="Academic">Academic</option>
                        <option value="Administrative/Misc">Administrative/Misc</option>
                        <option value="Co-curricular/Sports/Cultural">Co-curricular/Sports/Cultural</option>
                        <option value="Placement">Placement</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-2">Select the category for this announcement</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none bg-gray-50 focus:bg-white"
                      placeholder="Enter the full details of the announcement..."
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-8 py-3 rounded-xl text-white font-bold text-lg transition-all transform hover:scale-[1.02] ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg hover:shadow-blue-500/30'}`}
                    >
                      {loading ? 'Processing with AI...' : (editingId ? 'Update Announcement' : 'Post Announcement')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((item) => (
            <motion.div 
              layout
              key={item._id} 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-48 overflow-hidden relative group">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="bg-white/90 p-2 rounded-full text-blue-600 hover:bg-white shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  </button>
                  <button 
                    onClick={() => handleDelete(item._id)}
                    className="bg-white/90 p-2 rounded-full text-red-600 hover:bg-white shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{item.title}</h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-4">{item.originalDescription}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags && item.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">#{tag}</span>
                  ))}
                  {item.category && item.category !== 'All' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-semibold">📁 {item.category}</span>
                  )}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    AI Summary
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">{item.summary}</p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50">
                  <span className="text-xs text-gray-400">Posted on</span>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {announcements.length === 0 && !showForm && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No announcements yet. Create one to get started!</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default TeacherDashboard;
