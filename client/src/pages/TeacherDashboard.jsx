import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
  const [attachments, setAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
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
      console.log('Fetching announcements for user:', user);
      console.log('User ID:', user.id);
      const res = await axios.get(`http://localhost:5001/api/announcements?authorId=${user.id}`);
      console.log('Fetched announcements:', res.data);
      console.log('Number of announcements:', res.data.length);
      // Force a new array reference to trigger re-render
      setAnnouncements([...res.data]);
    } catch (err) {
      console.error('Failed to fetch announcements:', err.message);
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
    setAttachments([]);
    setSelectedFiles([]);
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
    setAttachments(item.attachments || []);
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
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          resolve(json);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleStudentsFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    
    // Security: File size validation (1MB limit)
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum size is 1MB for CSV/Excel files.');
      e.target.value = ''; // Reset input
      return;
    }
    
    try {
      const rows = await parseCsvOrExcel(file);
      const mapped = rows.map(r => ({
        name: r.name || r.Name || r.fullname || r.FullName || r.student_name || '',
        regId: r.regId || r.RegId || r.reg_id || r.Reg_ID || r.RegNo || '',
        email: r.email || r.Email || ''
      }));
      setStudentsList(mapped.filter(x => x.name || x.regId || x.email));
    } catch (err) {
      console.error('Failed to parse students file:', err.message);
      alert('Failed to parse students file. Please check the file format.');
      e.target.value = ''; // Reset input on error
    }
  };

  const handleStaffFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    
    // Security: File size validation (1MB limit)
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum size is 1MB for CSV/Excel files.');
      e.target.value = ''; // Reset input
      return;
    }
    
    try {
      const rows = await parseCsvOrExcel(file);
      const mapped = rows.map(r => ({
        name: r.name || r.Name || r.fullname || r.FullName || r.staff_name || '',
        staffId: r.staffId || r.StaffId || r.staff_id || r.Staff_ID || r.staffNo || '',
        email: r.email || r.Email || ''
      }));
      setStaffList(mapped.filter(x => x.name || x.staffId || x.email));
    } catch (err) {
      console.error('Failed to parse staff file:', err.message);
      alert('Failed to parse staff file. Please check the file format.');
      e.target.value = ''; // Reset input on error
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count (max 5 files total including already selected)
    if (selectedFiles.length + files.length > 5) {
      alert('Maximum 5 files can be selected at once');
      e.target.value = '';
      return;
    }
    
    // Validate file sizes
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`File(s) too large: ${invalidFiles.map(f => f.name).join(', ')}\nMaximum size is 10MB per file.`);
      e.target.value = '';
      return;
    }
    
    // Append to existing selected files
    setSelectedFiles([...selectedFiles, ...files]);
    e.target.value = ''; // Reset input to allow selecting more files
  };

  const handleRemoveSelectedFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, idx) => idx !== index));
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      pdf: '📕',
      doc: '📘', docx: '📘',
      xls: '📗', xlsx: '📗',
      ppt: '📙', pptx: '📙',
      txt: '📄',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      zip: '📦'
    };
    return iconMap[ext] || '📎';
  };

  const handlePreviewFile = (file) => {
    // Handle image preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(`
          <html>
            <head>
              <title>Preview: ${file.name}</title>
              <style>
                body { margin: 0; padding: 20px; background: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; }
                .container { max-width: 900px; margin: 0 auto; }
                .header { color: #fff; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px; }
                .filename { font-size: 18px; font-weight: 600; margin-bottom: 5px; }
                .filetype { font-size: 12px; color: #aaa; }
                img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="filename">📸 ${file.name}</div>
                  <div class="filetype">${file.type} • ${(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <img src="${e.target.result}" />
              </div>
            </body>
          </html>
        `);
      };
      reader.readAsDataURL(file);
    }
    // Handle PDF preview
    else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewWindow = window.open('', '_blank');
        const pdfDataUrl = e.target.result;
        previewWindow.document.write(`
          <html>
            <head>
              <title>Preview: ${file.name}</title>
              <style>
                body { margin: 0; padding: 10px; background: #f0f0f0; }
                .header { background: white; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
                .filename { font-weight: 600; margin-bottom: 5px; }
                .filetype { font-size: 12px; color: #666; }
                iframe { width: 100%; height: calc(100vh - 100px); border: none; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="filename">📄 ${file.name}</div>
                <div class="filetype">PDF • ${(file.size / 1024).toFixed(1)} KB</div>
              </div>
              <iframe src="${pdfDataUrl}"></iframe>
            </body>
          </html>
        `);
      };
      reader.readAsDataURL(file);
    }
    // Handle text file preview
    else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewWindow = window.open('', '_blank');
        const content = e.target.result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        previewWindow.document.write(`
          <html>
            <head>
              <title>Preview: ${file.name}</title>
              <style>
                body { margin: 0; padding: 20px; background: #1e1e1e; font-family: 'Monaco', 'Courier New', monospace; color: #d4d4d4; }
                .container { max-width: 1000px; margin: 0 auto; }
                .header { color: #fff; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px; }
                .filename { font-size: 18px; font-weight: 600; margin-bottom: 5px; }
                .filetype { font-size: 12px; color: #aaa; }
                pre { background: #252526; padding: 15px; border-radius: 4px; overflow-x: auto; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="filename">📝 ${file.name}</div>
                  <div class="filetype">Text File • ${(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <pre>${content}</pre>
              </div>
            </body>
          </html>
        `);
      };
      reader.readAsText(file);
    }
    // For Word docs, show message and open download
    else if (file.type === 'application/msword' || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      const blobUrl = URL.createObjectURL(file);
      window.open(blobUrl, '_blank');
      alert(`📄 ${file.name}\n\nWord documents cannot be previewed in browser. The file is being opened in your default viewer.`);
    }
    // For other documents
    else {
      const blobUrl = URL.createObjectURL(file);
      window.open(blobUrl, '_blank');
      alert(`📎 ${file.name}\n\nFile type: ${file.type || 'Unknown'}\nSize: ${(file.size / 1024).toFixed(1)} KB\n\nThe file is being opened in your default viewer.`);
    }
  };

  const handleFileUpload = async (announcementId) => {
    if (selectedFiles.length === 0) return;
    
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await axios.post(
        `http://localhost:5001/api/announcements/${announcementId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setAttachments(res.data.announcement.attachments || []);
      setSelectedFiles([]);
      alert('Files uploaded successfully!');
      fetchAnnouncements();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload files: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteAttachment = async (announcementId, attachmentId) => {
    if (!window.confirm('Delete this file?')) return;
    
    try {
      const res = await axios.delete(
        `http://localhost:5001/api/announcements/${announcementId}/attachment/${attachmentId}`
      );
      setAttachments(res.data.announcement.attachments || []);
      fetchAnnouncements();
      alert('File deleted successfully');
    } catch (err) {
      console.error('Delete attachment error:', err.message);
      alert('Failed to delete file');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await axios.delete(`http://localhost:5001/api/announcements/${id}`);
      fetchAnnouncements();
      alert('Announcement deleted successfully');
    } catch (err) {
      console.error('Delete announcement error:', err.message);
      alert('Failed to delete announcement');
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
      const res = await axios.post(`http://localhost:5001/api/announcements/${selectedAnnouncement._id}/regenerate-image`, {
        customImageUrl: customImageUrl.trim()
      });
      
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
      console.error('Image regeneration error:', err.message);
      const errorMsg = err.response?.data?.message || 'Failed to update image';
      alert(errorMsg);
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
      
      let announcementId = editingId;
      
      if (editingId) {
        await axios.put(`http://localhost:5001/api/announcements/${editingId}`, payload);
        alert('Announcement Updated!');
      } else {
        console.log('Creating announcement with authorId:', user.id);
        console.log('User object:', user);
        const res = await axios.post('http://localhost:5001/api/announcements', { 
          ...payload,
          authorId: user.id
        });
        console.log('Created announcement:', res.data);
        console.log('Announcement authorId:', res.data.authorId);
        announcementId = res.data._id;
        
        // Upload files if any were selected during creation
        if (selectedFiles.length > 0) {
          await handleFileUpload(announcementId);
        }
        
        alert('Announcement Posted Successfully!');
      }
      
      resetForm();
      
      // Wait a moment then fetch to ensure database has saved
      setTimeout(() => {
        fetchAnnouncements();
      }, 500);
    } catch (err) {
      console.error('Error saving announcement:', err);
      alert('Failed to save announcement: ' + (err.response?.data?.message || err.message));
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

                  {/* File Attachments Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">📎 File Attachments</label>
                    
                    {/* Existing Attachments (for editing) */}
                    {editingId && attachments.length > 0 && (
                        <div className="mb-4">
                          <div className="mb-2">
                            <span className="text-sm font-semibold text-gray-700">
                              Uploaded Attachments ({attachments.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {attachments.map((att) => (
                              <div key={att._id} className="flex items-center justify-between bg-green-50 px-4 py-2 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="text-2xl">{getFileIcon(att.fileName)}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{att.fileName}</p>
                                    <p className="text-xs text-gray-500">
                                      {(att.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(att.uploadedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const ext = att.fileName.split('.').pop().toLowerCase();
                                      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                                        window.open(`http://localhost:5001${att.fileUrl}`, '_blank');
                                      } else if (ext === 'pdf') {
                                        window.open(`http://localhost:5001${att.fileUrl}`, '_blank');
                                      } else {
                                        window.open(`http://localhost:5001${att.fileUrl}`, '_blank');
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:shadow-md active:scale-95"
                                    title="Preview or download file"
                                  >
                                    <span>👁️</span>
                                    <span>Preview</span>
                                  </button>
                                  <a
                                    href={`http://localhost:5001${att.fileUrl}`}
                                    download={att.fileName}
                                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all hover:shadow-md active:scale-95"
                                    title="Download file"
                                  >
                                    <span>⬇️</span>
                                    <span>Download</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAttachment(editingId, att._id)}
                                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all hover:shadow-md active:scale-95"
                                    title="Delete this attachment"
                                  >
                                    <span>✕</span>
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Files Preview (for both create and edit) */}
                      {selectedFiles.length > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-700">
                              Selected Files ({selectedFiles.length}/5)
                            </span>
                            {!editingId && (
                              <span className="text-xs text-blue-600 font-medium">Ready to upload</span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {Array.from(selectedFiles).map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="text-2xl">{getFileIcon(file.name)}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  {file.type.startsWith('image/') && (
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewFile(file)}
                                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:shadow-md active:scale-95"
                                      title="Preview image"
                                    >
                                      <span>👁️</span>
                                      <span>Preview</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSelectedFile(idx)}
                                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all hover:shadow-md active:scale-95"
                                    title="Remove this file"
                                  >
                                    <span>✕</span>
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* File Selection and Upload */}
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:from-green-100 hover:to-blue-100 transition-all">
                              <span className="text-2xl">📎</span>
                              <span className="text-sm font-medium text-gray-700">
                                {selectedFiles.length > 0 
                                  ? `Add More Files (${5 - selectedFiles.length} remaining)`
                                  : 'Choose Files or Drag & Drop'
                                }
                              </span>
                            </div>
                            <input
                              type="file"
                              multiple
                              onChange={handleFileSelect}
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                              className="hidden"
                              disabled={selectedFiles.length >= 5}
                            />
                          </label>
                          {editingId && selectedFiles.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleFileUpload(editingId)}
                              disabled={uploadingFiles}
                              className={`px-6 py-3 rounded-lg font-medium text-sm whitespace-nowrap ${
                                uploadingFiles
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                              } transition-all`}
                            >
                              {uploadingFiles ? '⏳ Uploading...' : `📤 Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
                            </button>
                          )}
                        </div>
                        <div className="flex items-start gap-2 text-xs text-gray-500">
                          <span>ℹ️</span>
                          <div>
                            <p className="font-medium mb-1">
                              {editingId 
                                ? 'Upload files to this announcement'
                                : 'Files will be uploaded when you post the announcement'
                              }
                            </p>
                            <p>• Accepted: PDF, Word, Excel, PowerPoint, Text, Images, ZIP</p>
                            <p>• Maximum: 10MB per file, up to 5 files total</p>
                            <p>• You can preview images before uploading</p>
                          </div>
                        </div>
                      </div>
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

                {/* Attachments Preview */}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1">
                      📎 Attachments ({item.attachments.length})
                    </p>
                    <div className="space-y-1">
                      {item.attachments.map((att) => (
                        <div key={att._id} className="text-xs text-green-900 truncate">
                          • {att.fileName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
