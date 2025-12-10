import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const AnnouncementHistory = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('Title');
  const [sortBy, setSortBy] = useState('Latest First');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const searchOptions = [
    { value: 'Title', label: 'Title', placeholder: 'Search by announcement title...', icon: '📝' },
    { value: 'Date Range', label: 'Date Range', placeholder: 'Select date range...', icon: '📅' },
    { value: 'Author', label: 'Author', placeholder: 'Search by author name...', icon: '👤' },
    { value: 'Title & Date', label: 'Title & Date', placeholder: 'Search title and date...', icon: '🔍' },
    { value: 'Content', label: 'Content', placeholder: 'Search in announcement content...', icon: '📄' }
  ];

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

    // Apply date range filter (if Date Range or Title & Date search is selected and dates are provided)
    if ((searchBy === 'Date Range' || searchBy === 'Title & Date') && (startDate || endDate)) {
      filtered = filtered.filter((ann) => {
        const annDate = new Date(ann.createdAt);
        annDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999); // End of day
          return annDate >= start && annDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          return annDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return annDate <= end;
        }
        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim() && searchBy !== 'Date Range') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((ann) => {
        switch (searchBy) {
          case 'Title':
            return ann.title.toLowerCase().includes(query);
          case 'Author':
            return ann.authorId.toLowerCase().includes(query);
          case 'Content':
            return ann.originalDescription.toLowerCase().includes(query);
          case 'Title & Date':
            return ann.title.toLowerCase().includes(query);
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

    console.log('Sort By:', sortBy);
    console.log('First 3 titles after sorting:', sorted.slice(0, 3).map(a => a.title));

    setFilteredAnnouncements(sorted);
  }, [searchQuery, searchBy, sortBy, announcements, startDate, endDate]);

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
          className="relative bg-gradient-to-br from-white via-slate-50 to-white rounded-2xl shadow-2xl p-8 mb-8 border border-slate-200 overflow-hidden"
          style={{
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-orange-400/10 to-transparent rounded-br-full"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-400/10 to-transparent rounded-tl-full"></div>
          
          <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                🔍 Search & Filter Announcements
              </h2>
              <p className="text-sm text-slate-500 mt-1">Find exactly what you're looking for</p>
            </div>

            {/* First Row: Search By and Sort By */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Search By Dropdown */}
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">🔍</span>
                  <span>Search By</span>
                </label>
                <div className="relative neon-orange-hover">
                  <select
                    value={searchBy}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 transition-all duration-300 hover:border-orange-400 hover:shadow-lg cursor-pointer appearance-none font-medium"
                  >
                    {searchOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-orange-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Sort By Dropdown */}
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span>Sort By</span>
                </label>
                <div className="relative neon-orange-hover">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 transition-all duration-300 hover:border-orange-400 hover:shadow-lg cursor-pointer appearance-none font-medium"
                  >
                    <option value="Latest First">📅 Latest First</option>
                    <option value="Oldest First">🕐 Oldest First</option>
                    <option value="Title A-Z">🔤 Title A-Z</option>
                    <option value="Title Z-A">🔡 Title Z-A</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-orange-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row: Search Input or Date Range */}
            {searchBy === 'Date Range' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="neon-orange-hover">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>Start Date</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 hover:border-orange-400 hover:shadow-lg font-medium"
                  />
                </div>
                <div className="neon-orange-hover">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>End Date</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 hover:border-orange-400 hover:shadow-lg font-medium"
                  />
                </div>
              </div>
            ) : searchBy === 'Title & Date' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="neon-orange-hover">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <span>Title</span>
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title..."
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 hover:border-orange-400 hover:shadow-lg font-medium"
                  />
                </div>
                <div className="neon-orange-hover">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>Start Date</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 hover:border-orange-400 hover:shadow-lg font-medium"
                  />
                </div>
                <div className="neon-orange-hover">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>End Date</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 hover:border-orange-400 hover:shadow-lg font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="neon-orange-hover">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">{searchOptions.find(opt => opt.value === searchBy)?.icon}</span>
                  <span>{searchBy}</span>
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchOptions.find(opt => opt.value === searchBy)?.placeholder || `Search by ${searchBy.toLowerCase()}...`}
                  className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-300 hover:border-orange-400 hover:shadow-lg font-medium"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchBy('Title');
                  setSortBy('Latest First');
                  setStartDate('');
                  setEndDate('');
                }}
                className="group px-8 py-3.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 hover:border-orange-400 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-base">🔄</span>
                  Reset
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-orange-400/10 to-orange-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                className="group px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/50 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-base">✨</span>
                  Apply Filters
                </span>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>

            {/* Results Count */}
            <div className="mt-6 pt-4 border-t-2 border-slate-200">
              <p className="text-sm text-slate-600 text-center">
                <span className="font-bold text-slate-900 text-lg">{filteredAnnouncements.length}</span> <span className="text-base">announcement(s) found</span>
              </p>
            </div>
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
