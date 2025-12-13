// ========================
// Criteria API
// ========================
export const criteriaAPI = {
  deleteCriteria: async (ids) => (await api.delete('/api/criteria/delete', { data: { criteriaIds: ids } })).data,
};
// ========================
// Areas API
// ========================
export const areasAPI = {
  getAll: async () => (await api.get('/api/areas')).data,
  getByEvent: async (eventId) => (await api.get(`/api/areas/event/${eventId}`)).data,
  addArea: async (areaData) => (await api.post('/api/areas/add', areaData)).data,
};
import axios from 'axios';

// Backend base URL
const API_BASE_URL = 'http://localhost:5000'; // remove /api to match backend

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to include JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // JWT token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========================
// Office Heads API
// ========================
export const officeHeadsAPI = {
  addHead: async (formData) => {
    const response = await api.post('/api/officeheads/add', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getAllHeads: async () => (await api.get('/api/officeheads/all')).data,
  getHeadById: async (id) => (await api.get(`/api/officeheads/${id}`)).data,
  deleteHeads: async (headIds) => {
    try {
      return (await api.delete('/api/officeheads/delete', { data: { headIds } })).data;
    } catch (error) {
      // fallback with query string
      const queryString = headIds.map((id) => `ids=${id}`).join('&');
      return (await api.delete(`/api/officeheads/delete?${queryString}`)).data;
    }
  },
};

// ========================
// Users/Auth API
// ========================
export const usersAPI = {
  login: async (credentials) => (await api.post('/api/user/login', credentials)).data,
  register: async (userData) => (await api.post('/user/register', userData)).data,
  getLoggedInUser: async () => (await api.get('/api/user/me')).data, // JWT required
  getAllUsers: async () => (await api.get('/api/user')).data,
  getCurrentUser: async (email) => (await api.get(`/user/current/${email}`)).data,
  updateUser: async (userId, data) => {
    if (!userId) throw new Error("updateUser: userId is required");

    const token = localStorage.getItem("token");
    if (!token) throw new Error("updateUser: JWT token not found");

    // data should be a FormData instance if uploading a file
    const response = await api.put(`/api/user/${userId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data", // required for file upload
      },
    });

    return response.data;
  },
};



  // ========================
  // Events API
  // ========================
  export const eventsAPI = {
    getAllEvents: async () => (await api.get('/api/events')).data,
    addEvent: async (eventData) => (await api.post('/api/events/add', eventData)).data,
    updateEvent: async (eventId, eventData) => (await api.put(`/api/events/update/${eventId}`, eventData)).data,
    deleteEvents: async (eventIds) => (await api.post('/api/events/delete', { eventIds })).data,
  };

  // ========================
  // Requirements API
  // ========================
  export const requirementsAPI = {
    getAllCriteria: async () => (await api.get('/api/requirements/criteria')).data,
    getCriteriaByEvent: async (eventId) => (await api.get(`/api/requirements/criteria/event/${eventId}`)).data,
    getAllRequirements: async () => (await api.get('/api/requirements/all')).data,
    getRequirementsByEvent: async (eventId) => (await api.get(`/api/requirements/event/${eventId}`)).data,
    addRequirement: async (data) => (await api.post('/api/requirements/add', data)).data,
    updateRequirement: async (id, data) => (await api.put(`/api/requirements/update/${id}`, data)).data,
    deleteRequirements: async (ids) => (await api.post('/api/requirements/delete', { requirementIds: ids })).data,
  };

  // ========================
  // Offices API
  // ========================
  export const officesAPI = {
    getAll: async () => ({ data: (await api.get('/api/offices')).data }),
    createOffice: async (data) => (await api.post('/api/offices', data)).data,
    updateOffice: async (id, data) => (await api.put(`/api/offices/${id}`, data)).data,
    deleteOffice: async (id) => (await api.delete(`/api/offices/${id}`)).data,
  };

  // ========================
  // Office Types API
  // ========================
  export const officetypesAPI = {
    getAll: async () => (await api.get('/api/officestypes')).data,
    getById: async (id) => (await api.get(`/api/officestypes/${id}`)).data,
    create: async (data) => (await api.post('/api/officestypes', data)).data,
    update: async (id, data) => (await api.put(`/api/officestypes/${id}`, data)).data,
    delete: async (id) => (await api.delete(`/api/officestypes/${id}`)).data,
  };

  export default api;
