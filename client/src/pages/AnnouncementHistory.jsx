import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const AnnouncementHistory = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('Subject Wise');
  const [sortBy, setSortBy] = useState('Latest First');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const navigate = useNavigate();

  const searchOptions = ['Subject Wise', 'Date Wise', 'Uploaded By', 'Subject and Date', 'Description Wise'];

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('http://localhost:5001/api/announcements');
        setAnnouncements(res.data);
        setFilteredAnnouncements(res.data);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    let filtered = announcements;

    // Apply date filter if Date Wise is selected and date is chosen
    if (searchBy === 'Date Wise' && selectedDate) {
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter((ann) => {
        const annDate = new Date(ann.createdAt);
        annDate.setHours(0, 0, 0, 0);
        return annDate.getTime() === selected.getTime();
      });
    }

    // Apply search filter
    if (searchQuery.trim() && searchBy !== 'Date Wise') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((ann) => {
        switch (searchBy) {
          case 'Subject Wise':
            return ann.title.toLowerCase().includes(query);
          case 'Uploaded By':
            return ann.authorId.toLowerCase().includes(query);
          case 'Description Wise':
            return ann.originalDescription.toLowerCase().includes(query);
          case 'Subject and Date':
            return (
              ann.title.toLowerCase().includes(query) ||
              new Date(ann.createdAt).toLocaleDateString().includes(query)
            );
          default:
            return true;
        }
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'Latest First':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'Oldest First':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'Title A-Z':
          const titleA = (a.title || '').toLowerCase().trim();
          const titleB = (b.title || '').toLowerCase().trim();
          return titleA.localeCompare(titleB);
        case 'Title Z-A':
          const titleA_ZA = (a.title || '').toLowerCase().trim();
          const titleB_ZA = (b.title || '').toLowerCase().trim();
          return titleB_ZA.localeCompare(titleA_ZA);
        default:
          return 0;
      }
    });

    setFilteredAnnouncements(sorted);
  }, [searchQuery, searchBy, sortBy, announcements, selectedDate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleBack = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.role === 'teacher') {
      navigate('/dashboard');
    } else {
      navigate('/feed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-slate-900">Announcement History</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6 mb-8 border border-slate-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search By Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Search By:
              </label>
              <select
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-slate-900"
              >
                {searchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input or Date Picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {searchBy}:
              </label>
              {searchBy === 'Date Wise' ? (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search by ${searchBy.toLowerCase()}...`}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              )}
            </div>

            {/* Sort By Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Sort By:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-slate-900"
              >
                <option value="Latest First">Latest First</option>
                <option value="Oldest First">Oldest First</option>
                <option value="Title A-Z">Title A-Z</option>
                <option value="Title Z-A">Title Z-A</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchBy('Subject Wise');
                setSortBy('Latest First');
                setSelectedDate('');
              }}
              className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Reset
            </button>
            <button
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Show
            </button>
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{filteredAnnouncements.length}</span> announcement(s) found
            </p>
          </div>
        </motion.div>

        {/* Announcements List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAnnouncements.length > 0 ? (
              filteredAnnouncements.map((announcement, index) => (
                <motion.div
                  key={announcement._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedAnnouncement(announcement)}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-200 hover:border-blue-300 overflow-hidden"
                >
                  <div className="flex gap-4 p-5">
                    {/* Image */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-lg truncate mb-1">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                        {announcement.summary}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          📅 {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          🏷️ {announcement.category}
                        </span>
                        <span className="flex items-center gap-1">
                          👥 {announcement.audience}
                        </span>
                        {announcement.attachments?.length > 0 && (
                          <span className="flex items-center gap-1">
                            📎 {announcement.attachments.length} file(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="flex-shrink-0 flex items-start gap-2">
                      <span className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                        {announcement.category}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="inline-block text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No announcements found</h3>
                <p className="text-slate-600">Try adjusting your search or filter criteria</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAnnouncement(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedAnnouncement.title}</h2>
                  <p className="text-blue-100 text-sm">
                    Posted on {new Date(selectedAnnouncement.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Image */}
                <img
                  src={selectedAnnouncement.imageUrl}
                  alt={selectedAnnouncement.title}
                  className="w-full h-64 object-cover rounded-lg"
                />

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Category</p>
                    <p className="text-sm font-medium text-slate-900">{selectedAnnouncement.category}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-xs text-green-600 font-semibold uppercase mb-1">Audience</p>
                    <p className="text-sm font-medium text-slate-900">{selectedAnnouncement.audience}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Posted Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(selectedAnnouncement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-xs text-orange-600 font-semibold uppercase mb-1">Attachments</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedAnnouncement.attachments?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Summary</h3>
                  <p className="text-slate-700 leading-relaxed">{selectedAnnouncement.summary}</p>
                </div>

                {/* Full Description */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Full Description</h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedAnnouncement.originalDescription}
                  </p>
                </div>

                {/* Attachments */}
                {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">📎 Attachments</h3>
                    <div className="space-y-2">
                      {selectedAnnouncement.attachments.map((att) => {
                        const ext = att.fileName.split('.').pop().toLowerCase();
                        const iconMap = {
                          pdf: '📕', doc: '📘', docx: '📘',
                          xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙',
                          txt: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
                          zip: '📦'
                        };
                        const icon = iconMap[ext] || '📎';

                        return (
                          <a
                            key={att._id}
                            href={`http://localhost:5001${att.fileUrl}`}
                            download={att.fileName}
                            className="flex items-center justify-between bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors group border border-slate-200"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{icon}</span>
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{att.fileName}</p>
                                <p className="text-xs text-slate-500">
                                  {(att.fileSize / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-blue-600 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedAnnouncement.tags && selectedAnnouncement.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnnouncement.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementHistory;
