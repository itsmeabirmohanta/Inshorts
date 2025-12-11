import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API_ENDPOINTS from '../config/api';

const StudentFeed = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  
  // FIX 1: Ensure default state matches the first category
  const [selectedCategory, setSelectedCategory] = useState('All'); 
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const navigate = useNavigate();

  // FIX 2: Variable name consistency
  const categories = ['All', 'Academic', 'Administrative/Misc', 'Co-curricular/Sports/Cultural', 'Placement', 'Benefits'];

  useEffect(() => {
    // Replace with your actual API endpoint
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.ANNOUNCEMENTS.BASE);
        setAnnouncements(res.data);
        // Initialize filtered list with all data
        setFilteredAnnouncements(res.data); 
      } catch (err) {
        console.error(err);
      }
    };
    fetchAnnouncements();
  }, []);

  // FIX 3: Fixed Filter Logic to match 'All'
  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredAnnouncements(announcements);
    } else {
      setFilteredAnnouncements(announcements.filter(item => item.category === selectedCategory));
    }
  }, [selectedCategory, announcements]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (announcements.length === 0) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-black text-white">
        <p className="text-xl font-light animate-pulse">Loading feed...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
      `}</style>

      <div className="h-[100dvh] w-full bg-black overflow-hidden flex flex-col relative">
        
        {/* ================= MOBILE VIEW ================= */}
        <div className="md:hidden flex flex-col h-full w-full">
          
          {/* HEADER */}
          <div className="flex-none z-30 bg-black pt-4 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between px-4">
              
              {/* Scrollable Filter Bar */}
              <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-6 mr-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap text-[15px] transition-colors duration-200 ${
                      selectedCategory === cat
                        ? 'text-blue-500 font-bold' 
                        : 'text-zinc-400 font-medium hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* History and Logout Icons */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/history')}
                  className="text-purple-300 hover:text-purple-200 transition-colors"
                  title="History"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-white transition-colors"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Feed Area */}
          <div className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black">
            {filteredAnnouncements.map((item) => (
              <div key={item._id} className="h-full w-full snap-start flex flex-col relative">
                
                {/* Image Section */}
                <div className="h-[40%] w-full relative shrink-0">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  
                  {/* Category Tag */}
                  <div className="absolute top-4 left-4">
                     <span className="bg-black/60 backdrop-blur-sm text-white/90 text-[10px] px-2 py-1 rounded-sm uppercase tracking-wider font-semibold">
                      {item.category || 'Notice'}
                     </span>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-5">
                     <h2 className="text-white text-xl font-bold leading-tight drop-shadow-md line-clamp-2 font-sans">
                      {item.title}
                    </h2>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 bg-black p-5 flex flex-col min-h-0">
                  <div className="flex items-center gap-2 mb-3 shrink-0">
                    <span className="text-zinc-500 text-xs">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-zinc-600 text-[10px]">•</span>
                    <span className="text-zinc-500 text-xs">AI Summary</span>
                  </div>
                  
                  {/* Summary Text */}
                  <div className="flex-1 overflow-y-auto custom-scroll pr-2 relative">
                    <p className="text-[#d1d5db] text-[16px] leading-[1.6] text-justify font-sans font-light">
                      {item.summary}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 shrink-0 border-t border-zinc-900">
                    <p 
                      onClick={() => setSelectedAnnouncement(item)}
                      className="text-zinc-400 text-xs text-center w-full pb-2 animate-pulse cursor-pointer"
                    >
                      Tap here to read what else the notice said
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= DESKTOP VIEW ================= */}
        <div className="hidden md:flex h-full w-full flex-col relative">
          <div className="absolute top-0 left-0 w-full z-50 bg-gradient-to-b from-black/80 to-transparent pt-4 pb-12 pointer-events-none">
            <div className="max-w-7xl mx-auto px-8 flex items-center justify-between pointer-events-auto">
              <h1 className="text-white text-3xl font-bold tracking-tight">Announce<span className="text-zinc-500">Shorts</span></h1>
              <div className="flex items-center gap-4">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex items-center gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedCategory === cat
                          ? 'bg-white text-black shadow-lg'
                          : 'text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => navigate('/history')}
                  className="px-4 py-1.5 rounded-full text-xs font-medium transition-all text-purple-300 hover:text-purple-200 bg-black/40 backdrop-blur-xl border border-white/10 hover:border-purple-500/30"
                >
                  History
                </button>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2 rounded-full text-white text-sm transition-all"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar">
            {filteredAnnouncements.map((item) => (
              <div key={item._id} className="w-full h-full snap-start relative flex items-end justify-center">
                <div className="absolute inset-0 z-0">
                  <img src={item.imageUrl} alt="bg" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black" />
                </div>
                <div className="relative z-10 w-full max-w-6xl mb-16 p-8 grid grid-cols-2 gap-12 items-end">
                  <div>
                    <div className="flex gap-3 mb-4">
                      <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold tracking-wide">
                        {item.category || 'General'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs border border-white/10">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">{item.title}</h1>
                  </div>
                  <div className="flex flex-col items-start gap-6 border-l border-white/20 pl-8">
                    <div className="max-h-[40vh] overflow-y-auto custom-scroll pr-4">
                      <p className="text-lg text-zinc-300 leading-relaxed">{item.summary}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedAnnouncement(item)}
                      className="group flex items-center gap-2 text-white font-semibold hover:text-blue-400 transition-colors shrink-0"
                    >
                      <span>Read Full Announcement</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= MODAL ================= */}
        <AnimatePresence>
          {selectedAnnouncement && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-sm"
              onClick={() => setSelectedAnnouncement(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
              >
                <div className="h-48 md:h-64 relative shrink-0">
                  <img src={selectedAnnouncement.imageUrl} alt={selectedAnnouncement.title} className="w-full h-full object-cover" />
                  <button onClick={() => setSelectedAnnouncement(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 backdrop-blur text-white p-2 rounded-full transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                  <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-zinc-900 to-transparent">
                     <h2 className="text-white text-2xl md:text-3xl font-bold leading-tight">{selectedAnnouncement.title}</h2>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
                  <div className="prose prose-invert prose-p:text-zinc-300 prose-headings:text-white max-w-none">
                    <p className="text-white whitespace-pre-wrap">{selectedAnnouncement.originalDescription}</p>
                  </div>

                  {/* Attachments Section */}
                  {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-zinc-700">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        📎 Attachments ({selectedAnnouncement.attachments.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedAnnouncement.attachments.map((att) => {
                          const ext = att.fileName.split('.').pop().toLowerCase();
                          const iconMap = {
                            pdf: '📕', doc: '📘', docx: '📘',
                            xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙',
                            txt: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
                            zip: '📦', rar: '📦'
                          };
                          const icon = iconMap[ext] || '📎';
                          const fileSize = att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Unknown size';

                          return (
                            <a
                              key={att._id}
                              href={`${API_ENDPOINTS.BASE_URL}${att.fileUrl}`}
                              download={att.fileName}
                              className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 p-4 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 group"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-2xl">{icon}</span>
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate text-sm">{att.fileName}</p>
                                  <p className="text-xs text-zinc-400">{fileSize}</p>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-blue-400 group-hover:text-blue-300 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default StudentFeed;