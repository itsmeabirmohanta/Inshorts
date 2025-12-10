import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file';

const TeacherDashboard = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState(['', '', '']);
  const [category, setCategory] = useState('All');
  const [audience, setAudience] = useState('Both');
  const [studentsList, setStudentsList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
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
    setSummary('');
    setTags(['', '', '']);
    setCategory('All');
    setAudience('Both');
    setStudentsList([]);
    setStaffList([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setTitle(item.title);
    setDescription(item.originalDescription);
    setSummary(item.summary);
    // Ensure 3 tags
    const currentTags = item.tags || [];
    setTags([
      currentTags[0] || '',
      currentTags[1] || '',
      currentTags[2] || ''
    ]);
    setCategory(item.category || 'All');
    setAudience(item.audience || 'Both');
    setStudentsList(item.students || []);
    setStaffList(item.staff || []);
    setEditingId(item._id);
    setShowForm(true);
  };

  const parseCsvOrExcel = (file) => {
    return new Promise((resolve, reject) => {
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv') || file.type === 'text/csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (err) => reject(err)
        });
      } else {
        readXlsxFile(file)
          .then((rows) => {
            if (rows.length === 0) {
              resolve([]);
              return;
            }
            const headers = rows[0];
            const data = rows.slice(1).map(row => {
              const obj = {};
              headers.forEach((header, i) => {
                obj[header] = row[i] || '';
              });
              return obj;
            });
            resolve(data);
          })
          .catch((err) => reject(err));
      }
    });
  };

  const handleStudentsFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const rows = await parseCsvOrExcel(file);
      const mapped = rows.map(r => ({
        name: r.name || r.Name || r.fullname || r.FullName || r.student_name || '',
        regId: r.regId || r.RegId || r.reg_id || r.Reg_ID || r.RegNo || '',
        email: r.email || r.Email || ''
      }));
      setStudentsList(mapped.filter(x => x.name || x.regId || x.email));
    } catch (err) {
      console.error('Failed to parse students file', err);
      alert('Failed to parse students file');
    }
  };

  const handleStaffFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const rows = await parseCsvOrExcel(file);
      const mapped = rows.map(r => ({
        name: r.name || r.Name || r.fullname || r.FullName || r.staff_name || '',
        staffId: r.staffId || r.StaffId || r.staff_id || r.Staff_ID || r.staffNo || '',
        email: r.email || r.Email || ''
      }));
      setStaffList(mapped.filter(x => x.name || x.staffId || x.email));
    } catch (err) {
      console.error('Failed to parse staff file', err);
      alert('Failed to parse staff file');
    }
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

  const handleImageModalOpen = (announcement) => {
    setSelectedAnnouncement(announcement);
    setCustomImageUrl('');
    setShowImageModal(true);
  };

  const handleRegenerateImage = async () => {
    if (!selectedAnnouncement) return;
    setImageLoading(true);
    try {
      console.log('Regenerating image for:', selectedAnnouncement._id);
      console.log('Custom URL:', customImageUrl.trim());
      const res = await axios.post(`http://localhost:5001/api/announcements/${selectedAnnouncement._id}/regenerate-image`, {
        customImageUrl: customImageUrl.trim()
      });
      console.log('Response:', res.data);
      // Update announcements list
      setAnnouncements(announcements.map(a => a._id === res.data._id ? res.data : a));
      // Update selected announcement to show new image in modal
      setSelectedAnnouncement(res.data);
      alert(customImageUrl.trim() ? 'Image updated successfully!' : 'New image generated successfully!');
      // Close modal after a brief delay to show the new image
      setTimeout(() => {
        setShowImageModal(false);
      }, 1000);
    } catch (err) {
      console.error('Error details:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      alert(`Failed to update image: ${errorMsg}`);
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanTags = tags.filter(t => t.trim() !== '');
    
    try {
      const payload = {
        title,
        description,
        summary,
        tags: cleanTags,
        category,
        audience,
        students: studentsList,
        staff: staffList
      };
      if (editingId) {
        await axios.put(`http://localhost:5001/api/announcements/${editingId}`, payload);
        alert('Announcement Updated!');
      } else {
        await axios.post('http://localhost:5001/api/announcements', { 
          ...payload,
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
              <button 
                onClick={() => navigate('/history')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                History
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
                        <option value="Benefits">Benefits</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-2">Select the category for this announcement</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Audience</label>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2">
                          <input type="radio" name="audience" value="Students" checked={audience === 'Students'} onChange={() => setAudience('Students')} />
                          <span className="text-sm">Students</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="radio" name="audience" value="Faculty" checked={audience === 'Faculty'} onChange={() => setAudience('Faculty')} />
                          <span className="text-sm">Faculty</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="radio" name="audience" value="Both" checked={audience === 'Both'} onChange={() => setAudience('Both')} />
                          <span className="text-sm">Both</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Who should receive this announcement?</p>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Students (CSV / XLSX)</label>
                      <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleStudentsFile} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                      <p className="text-xs text-gray-400 mt-2">Parsed students: <strong>{studentsList.length}</strong></p>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Staff (CSV / XLSX)</label>
                      <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleStaffFile} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                      <p className="text-xs text-gray-400 mt-2">Parsed staff: <strong>{staffList.length}</strong></p>
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

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">AI Summary (Editable)</label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none bg-gray-50 focus:bg-white"
                      placeholder="AI generated summary will appear here. You can edit it manually."
                    />
                    <p className="text-xs text-gray-400 mt-2">Leave empty to auto-generate from description.</p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-8 py-3 rounded-xl text-white font-bold text-lg transition-all transform hover:scale-[1.02] ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-blue-600 to-blue-700 shadow-lg hover:shadow-blue-500/30'}`}
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
                    onClick={() => handleImageModalOpen(item)}
                    className="bg-white/90 p-2 rounded-full text-purple-600 hover:bg-white shadow-sm"
                    title="Change/Regenerate Image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </button>
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

      {/* Image Management Modal */}
      <AnimatePresence>
        {showImageModal && selectedAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              <div className="bg-linear-to-r from-purple-600 to-blue-600 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">Change Image</h3>
                <p className="text-purple-100 text-sm">{selectedAnnouncement.title}</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Current Image Preview */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Current Image</label>
                  <div className="rounded-xl overflow-hidden border-2 border-gray-200 relative">
                    <img 
                      key={selectedAnnouncement.imageUrl}
                      src={`${selectedAnnouncement.imageUrl}?t=${Date.now()}`}
                      alt={selectedAnnouncement.title}
                      className="w-full h-64 object-cover"
                    />
                    {imageLoading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <svg className="animate-spin h-12 w-12 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-sm font-semibold">Generating new image...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom URL Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Image URL (Optional)</label>
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-2">Leave empty to auto-generate a new image with AI</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleRegenerateImage}
                    disabled={imageLoading}
                    className={`flex-1 px-6 py-3 rounded-xl text-white font-bold transition-all transform hover:scale-[1.02] ${
                      imageLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-linear-to-r from-purple-600 to-blue-600 shadow-lg hover:shadow-purple-500/30'
                    }`}
                  >
                    {imageLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : customImageUrl.trim() ? (
                      '✓ Use This Image'
                    ) : (
                      '🎨 Generate New Image'
                    )}
                  </button>
                  <button
                    onClick={() => setShowImageModal(false)}
                    disabled={imageLoading}
                    className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherDashboard;
