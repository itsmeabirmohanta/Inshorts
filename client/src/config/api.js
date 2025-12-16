// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL.replace('/api', ''),
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
  },
  ANNOUNCEMENTS: {
    BASE: `${API_BASE_URL}/announcements`,
    BY_ID: (id) => `${API_BASE_URL}/announcements/${id}`,
    UPLOAD: (id) => `${API_BASE_URL}/announcements/${id}/upload`,
    DELETE_ATTACHMENT: (announcementId, attachmentId) => 
      `${API_BASE_URL}/announcements/${announcementId}/attachment/${attachmentId}`,
    REGENERATE_IMAGE: (id) => `${API_BASE_URL}/announcements/${id}/regenerate-image`,
  },
};

export default API_ENDPOINTS;
