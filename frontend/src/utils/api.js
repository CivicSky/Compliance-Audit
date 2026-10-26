import axios from 'axios';
import { API_BASE_URL } from './apiBase';

export { API_BASE_URL };

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

// Response interceptor for 401/403 Unauthorized & Expired Tokens and Live Sync
api.interceptors.response.use(
  (response) => {
    const method = response?.config?.method?.toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const url = response?.config?.url || '';
      // Exclude login/logout/verify tokens from triggering full data sync
      if (!url.includes('/login') && !url.includes('/logout') && !url.includes('/otp') && !url.includes('/verify')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:data-sync', { detail: { url, method, timestamp: Date.now() } }));
        }
      }
    }
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    // Only redirect if not a login or register request
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      originalRequest &&
      !originalRequest.url.includes('/login') &&
      !originalRequest.url.includes('/register')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


// ========================
// Compliance Status Offices API
// ========================
export const complianceStatusOfficesAPI = {
  getAll: async () => (await api.get('/api/compliancestatusoffices')).data,
};
// ========================
// Criteria API
// ========================
export const criteriaAPI = {
  getAll: async () => (await api.get('/api/criteria')).data,
  getByEvent: async (eventid) => (await api.get(`/api/criteria/event/${eventid}`)).data,
  getByArea: async (areaid) => (await api.get(`/api/criteria/area/${areaid}`)).data,
  deleteCriteria: async (ids) => (await api.delete('/api/criteria/delete', { data: { criteriaIds: ids } })).data,
  addCriteria: async (data) => (await api.post('/api/criteria/add', data)).data,
  updateCriteria: async (id, data) => (await api.put(`/api/criteria/${id}`, data)).data,
};
// ========================
// Areas API
// ========================
export const areasAPI = {
  getAll: async () => (await api.get('/api/areas')).data,
  getByEvent: async (eventid) => (await api.get(`/api/areas/event/${eventid}`)).data,
  addArea: async (areaData) => (await api.post('/api/areas/add', areaData)).data,
  updateArea: async (id, data) => (await api.put(`/api/areas/${id}`, data)).data,
  deleteAreas: async (areaIds) => (await api.post('/api/areas/delete', { areaIds })).data,
};

export const masterlistAPI = {
  getAll: async () => (await api.get('/api/masterlist')).data,
  getAvailableForEvent: async (eventid) => (await api.get(`/api/masterlist/available/${eventid}`)).data,
  addItem: async (item) => (await api.post('/api/masterlist/add', item)).data,
  updateItem: async (id, item) => (await api.put(`/api/masterlist/${id}`, item)).data,
  deleteItem: async (id) => (await api.delete(`/api/masterlist/${id}`)).data,
  deleteMultiple: async (ids) => (await api.post('/api/masterlist/delete-multiple', { ids })).data,
  bulkDelete: async (ids) => (await api.post('/api/masterlist/delete-multiple', { ids })).data,
};


export const departmentsAPI = {
  getAll: async () => (await api.get('/api/departments')).data,
};

export const eventDepartmentsAPI = {
  getByEvent: async (eventid) => (await api.get(`/api/event-departments/event/${eventid}`)).data,
  assignDepartment: async (payload) => (await api.post('/api/event-departments', payload)).data,
  updateLevel: async (id, accreditationlevel) => (await api.put(`/api/event-departments/${id}/level`, { accreditationlevel })).data,
  deleteDepartment: async (id) => (await api.delete(`/api/event-departments/${id}`)).data,
};

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
  addMultipleHeads: async (userIds, position) => {
    const response = await api.post('/api/officeheads/add-multiple', { userIds, position });
    return response.data;
  },
  getAllHeads: async () => {
    try {
      const response = await api.get('/api/officeheads/all');
      console.log('getAllHeads full response:', response);
      // Backend returns { success: true, data: [...] }
      // response.data is { success: true, data: [...] }
      // So we need response.data.data for the array
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error('Unexpected response format:', response.data);
        return [];
      }
    } catch (error) {
      console.error('getAllHeads error:', error);
      throw error;
    }
  },
  getHeadById: async (id) => (await api.get(`/api/officeheads/${id}`)).data,
  updateHead: async (id, formData) => {
    const response = await api.put(`/api/officeheads/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
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
  loginStatus: async (email) => (await api.get(`/api/user/login-status?email=${encodeURIComponent(email)}`)).data,
  createRegistrationInvite: async (data = {}) => (await api.post('/api/user/registration-invite', data)).data,
  validateRegistrationInvite: async (token) => (
    await api.get(`/api/user/registration-invite/${encodeURIComponent(token)}`)
  ).data,
  sendChangePasswordOtp: async (data = {}) => (await api.post('/api/user/change-password/send-otp', data)).data,
  verifyAndChangePassword: async (data) => (await api.post('/api/user/change-password/verify-and-change', data)).data,
  getLoggedInUser: async () => (await api.get('/api/user/me')).data, // JWT required
  getAllUsers: async () => (await api.get('/api/user')).data,
  getCurrentUser: async (email) => (await api.get(`/user/current/${email}`)).data,
  updateUser: async (userid, data) => {
    if (!userid) throw new Error("updateUser: userid is required");

    const token = localStorage.getItem("token");
    if (!token) throw new Error("updateUser: JWT token not found");

    // data should be a FormData instance if uploading a file
    const response = await api.put(`/api/user/${userid}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data", // required for file upload
      },
    });

    return response.data;
  },
  updateApprovalStatus: async (userid, approvalstatus) => {
    const response = await api.put(`/api/user/${userid}/approval-status`, {
      approvalstatus: approvalstatus
    });
    return response.data;
  },
  updateUserRole: async (userid, roleid) => {
    const response = await api.put(`/api/user/${userid}/role`, {
      roleid: roleid
    });
    return response.data;
  },
  deleteUsers: async (ids) => {
    // Send array of ids in request body
    const response = await api.delete('/api/user', { data: { ids } });
    return response.data;
  },
};


// ========================
// Events API
// ========================
export const eventsAPI = {
  getAllEvents: async () => (await api.get('/api/events')).data,
  getAll: async () => (await api.get('/api/events')).data,
  getAccreditationLevels: async () => (await api.get('/api/events/accreditation-levels')).data,
  addEvent: async (eventData) => (await api.post('/api/events/add', eventData)).data,
  updateEvent: async (eventid, eventData) => (await api.put(`/api/events/update/${eventid}`, eventData)).data,
  deleteEvents: async (eventIds) => (await api.post('/api/events/delete', { eventIds })).data,
  getDownloadableFolders: async () => (await api.get('/api/events/downloadable-folders')).data,
  downloadEventZip: async (eventname) => {
    try {
      const response = await api.get(`/api/events/download/${encodeURIComponent(eventname)}`, {
        responseType: 'blob'
      });
      // response.data is already a Blob when responseType is 'blob'
      return window.URL.createObjectURL(response.data);
    } catch (error) {
      console.error('Download error:', error);
      // If error response has a blob (error message), try to extract it
      if (error.response && error.response.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const parsed = JSON.parse(errorText);
          throw new Error(parsed.message || errorText || 'Download failed');
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
          const rawText = await error.response.data.text();
          throw new Error(rawText || 'Download failed');
        }
      }
      throw error;
    }
  },
  // Copy event API
  copyEvent: async ({ sourceEventId, newEventName, newEventCode, newDescription }) =>
    (await api.post('/api/events/copy', { sourceEventId, newEventName, newEventCode, newDescription })).data,
};

// ========================
// Requirements API
// ========================
export const requirementsAPI = {
  getAllRequirements: async (params) => (await api.get('/api/requirements/all', { params })).data,
  getRequirementsByEvent: async (eventid) => (await api.get(`/api/requirements/event/${eventid}`)).data,
  getRequirementsByCriteria: async (criteriaid) => (await api.get(`/api/requirements/criteria/${criteriaid}`)).data,
  addRequirement: async (data) => (await api.post('/api/requirements/add', data)).data,
  updateRequirement: async (id, data) => (await api.put(`/api/requirements/update/${id}`, data)).data,
  deleteRequirements: async (ids) => (await api.post('/api/requirements/delete', { requirementIds: ids })).data,
  // User assignment functions
  assignUsersToRequirement: async (requirementid, officeid, userIds, assignedby) => 
    (await api.post('/api/requirements/assign-users', { requirementid, officeid, userIds, assignedby })).data,
  getAssignedUsers: async (requirementid, officeid) => {
    const params = officeid ? `?officeid=${officeid}` : '';
    return (await api.get(`/api/requirements/assigned-users/${requirementid}${params}`)).data;
  },
  getMyAssignments: async () => (await api.get('/api/requirements/my-assignments')).data,
  removeUserAssignment: async (assignmentid) => 
    (await api.delete(`/api/requirements/assignment/${assignmentid}`)).data,
  getUserAssignmentCount: async (userid) => 
    (await api.get(`/api/requirements/user-assignment-count/${userid}`)).data,
  getAvailableUsersForAssignment: async (requirementid, officeid) => {
    const params = new URLSearchParams();
    if (requirementid) params.append('requirementid', requirementid);
    if (officeid) params.append('officeid', officeid);
    return (await api.get(`/api/requirements/available-users?${params.toString()}`)).data;
  },
  updateUserUploadStatus: async (assignmentid, hasuploaded) => 
    (await api.put(`/api/requirements/assignment/${assignmentid}/upload-status`, { hasuploaded })).data,
  markUserAsUploaded: async (requirementid, userid) => 
    (await api.post('/api/requirements/mark-uploaded', { requirementid, userid })).data,
};

// ========================
// Offices API
// ========================
export const officesAPI = {
  getAll: async () => {
    const response = await api.get('/api/offices');
    return response.data.data || response.data; // Handle both { data: [...] } and [...]
  },
  createOffice: async (data) => (await api.post('/api/offices', data)).data,
  updateOffice: async (id, data) => (await api.put(`/api/offices/${id}`, data)).data,
  updateLevel: async (id, accreditationlevel) => (await api.put(`/api/offices/${id}/level`, { accreditationlevel })).data,
  deleteOffice: async (id) => (await api.delete(`/api/offices/${id}`)).data,
  deleteMultipleOffices: async (ids) => (await api.post('/api/offices/delete-multiple', { ids })).data,
  getById: async (id) => (await api.get(`/api/offices/${id}`)).data,
  getOfficeRequirements: async (officeid) => (await api.get(`/api/offices/${officeid}/requirements`)).data,
  addOfficeRequirements: async (officeid, requirementIds) =>
    (await api.post(`/api/offices/${officeid}/requirements`, { requirementIds })).data,
  exportOfficeExcel: async (officeid, officename = 'office') => {
    const response = await api.get(`/api/offices/${officeid}/export`, { responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(response.data);
    const disposition = response.headers?.['content-disposition'] || '';
    const nameMatch = disposition.match(/filename="?([^";]+)"?/i);
    const safeOfficeName = String(officename || 'office')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .trim();

    return {
      url: blobUrl,
      filename: nameMatch?.[1] || `${safeOfficeName || 'office'}_export.xlsx`
    };
  },
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

// ========================
// Personnel Assignments API (Area / Sub-area / Standard hierarchy)
// ========================
export const personnelAssignmentsAPI = {
  getByEvent: async (eventid) => (await api.get(`/api/personnel-assignments/event/${eventid}`)).data,
  getByUser: async (userid, eventid) => {
    const params = eventid ? `?eventid=${eventid}` : '';
    return (await api.get(`/api/personnel-assignments/user/${userid}${params}`)).data;
  },
  getMyAssignments: async () => (await api.get('/api/personnel-assignments/my-assignments')).data,
  assign: async ({ eventid, userIds, areaid, criteriaid, requirementid }) =>
    (await api.post('/api/personnel-assignments/assign', { eventid, userIds, areaid, criteriaid, requirementid })).data,
  syncScope: async ({ userid, eventid, areaIds, criteriaIds, requirementIds }) =>
    (await api.post('/api/personnel-assignments/sync-scope', { userid, eventid, areaIds, criteriaIds, requirementIds })).data,
  remove: async (id) => (await api.delete(`/api/personnel-assignments/${id}`)).data,
  unassign: async ({ eventid, userid, areaid, criteriaid, requirementid }) =>
    (await api.post('/api/personnel-assignments/unassign', { eventid, userid, areaid, criteriaid, requirementid })).data,
};

export default api;
