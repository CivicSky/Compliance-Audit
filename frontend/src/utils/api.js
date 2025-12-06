import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


// Office Heads API functions
export const officeHeadsAPI = {
  // Add new office head
  addHead: async (formData) => {
    const response = await api.post('/officeheads/add', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get all office heads
  getAllHeads: async () => {
    const response = await api.get('/officeheads/all');
    return response.data;
  },

  // Get office head by ID
  getHeadById: async (id) => {
    const response = await api.get(`/officeheads/${id}`);
    return response.data;
  },

  // Test backend connection
  testConnection: async () => {
    try {
      // Use the root health endpoint, not /api/health
      const response = await axios.get('http://localhost:5000/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete multiple office heads
  deleteHeads: async (headIds) => {
    try {
      console.log('Sending DELETE request to:', `${API_BASE_URL}/officeheads/delete`);
      console.log('With data:', { headIds });

      // Try different request format - some servers prefer POST for complex data
      const response = await api.delete('/officeheads/delete', {
        data: { headIds },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete API error:', error);

      // If DELETE with body fails, try as query parameters
      if (error.response?.status === 404 || error.response?.status === 405) {
        try {
          console.log('Trying alternative DELETE method...');
          const queryString = headIds.map(id => `ids=${id}`).join('&');
          const fallbackResponse = await api.delete(`/officeheads/delete?${queryString}`);
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error('Fallback delete method also failed:', fallbackError);
          throw fallbackError;
        }
      }

      throw error;
    }
  },
};

// Authentication API functions
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Users API functions
export const usersAPI = {
  getCurrentUser: async (email) => {
    const response = await api.get(`/user/current/${email}`);
    return response.data;
  },

  getAllUsers: async () => {
    const response = await api.get('/user');
    return response.data;
  },
};

// Events API functions
export const eventsAPI = {
  getAllEvents: async () => {
    const response = await api.get('/events');
    return response.data;
  },

  addEvent: async (eventData) => {
    const response = await api.post('/events/add', eventData);
    return response.data;
  },

  updateEvent: async (eventId, eventData) => {
    const response = await api.put(`/events/update/${eventId}`, eventData);
    return response.data;
  },

  deleteEvents: async (eventIds) => {
    const response = await api.post('/events/delete', { eventIds });
    return response.data;
  },

  testConnection: async () => {
    const response = await api.get('/officeheads');
    return response.data;
  },
};

// Requirements API functions
export const requirementsAPI = {
  getAllCriteria: async () => {
    const response = await api.get('/requirements/criteria');
    return response.data;
  },

  getCriteriaByEvent: async (eventId) => {
    const response = await api.get(`/requirements/criteria/event/${eventId}`);
    return response.data;
  },

  getAllRequirements: async () => {
    const response = await api.get('/requirements/all');
    return response.data;
  },

  getRequirementsByEvent: async (eventId) => {
    const response = await api.get(`/requirements/event/${eventId}`);
    return response.data;
  },

  addRequirement: async (requirementData) => {
    const response = await api.post('/requirements/add', requirementData);
    return response.data;
  },

  updateRequirement: async (requirementId, requirementData) => {
    const response = await api.put(`/requirements/update/${requirementId}`, requirementData);
    return response.data;
  },

  deleteRequirements: async (requirementIds) => {
    const response = await api.post('/requirements/delete', { requirementIds });
    return response.data;
  },
};

// Offices API functions
export const officesAPI = {
  // Get all offices
  getAll: async () => {
    const response = await api.get('/offices');
    return response.data;
  },

  // Create a new office
  createOffice: async (officeData) => {
    const response = await api.post('/offices', officeData);
    return response.data;
  },

  // Update an existing office
  updateOffice: async (officeId, officeData) => {
    const response = await api.put(`/offices/${officeId}`, officeData);
    return response.data;
  },

  // Delete an office
  deleteOffice: async (officeId) => {
    const response = await api.delete(`/offices/${officeId}`);
    return response.data;
  },
};

// Offices Types API functions
export const officetypesAPI = {
  getAll: async () => {
    const response = await api.get('/officestypes');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/officestypes/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/officestypes', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/officestypes/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/officestypes/${id}`);
    return response.data;
  }
};





export default api;