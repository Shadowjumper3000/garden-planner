import axios from 'axios';
import { Garden, Plant, SoilData, User } from '../types';

// Check if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development';

// In Docker environment, the backend is available via the container name
// The Nginx proxy will handle routing requests to the backend
const API_BASE_URL = isDevelopment 
  ? '/api' // In dev, Nginx proxies /api to the backend container
  : '/api'; // In production, also use /api which Nginx will proxy

console.log('Using API base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json', // Explicitly request JSON responses
  },
  // Add timeout to avoid hanging requests
  timeout: 10000,
});

// Add request interceptor for auth
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('garden_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle HTML responses
api.interceptors.response.use(
  (response) => {
    // Check if the response is HTML (usually means we got redirected to a login page)
    if (response.data && typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      console.error('API returned HTML instead of JSON. You might be redirected to a login page.');
      // Convert to an error to trigger the error handler
      return Promise.reject(new Error('API returned HTML instead of JSON. You might need to log in again.'));
    }
    return response;
  },
  (error) => {
    // Enhance error messages for network issues
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('Network error connecting to backend:', error);
      const enhancedError = new Error(
        `Cannot connect to the backend server at ${API_BASE_URL}. ` +
        'Please ensure the backend service is running and accessible through Nginx.'
      );
      enhancedError.name = 'BackendConnectionError';
      return Promise.reject(enhancedError);
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('garden_token');
    localStorage.removeItem('garden_user');
  }
};

// Garden APIs
export const gardenAPI = {
  getAll: async (): Promise<Garden[]> => {
    const response = await api.get('/gardens');
    return response.data;
  },
  
  getById: async (id: string): Promise<Garden> => {
    const response = await api.get(`/gardens/${id}`);
    return response.data;
  },
  
  create: async (garden: Omit<Garden, 'id' | 'createdAt' | 'soilData' | 'plants'>): Promise<Garden> => {
    const response = await api.post('/gardens', garden);
    return response.data;
  },
  
  update: async (id: string, garden: Partial<Omit<Garden, 'id' | 'createdAt' | 'soilData' | 'plants'>>): Promise<Garden> => {
    const response = await api.put(`/gardens/${id}`, garden);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/gardens/${id}`);
  },
  
  updateSoil: async (id: string, soilData: SoilData): Promise<Garden> => {
    const response = await api.patch(`/gardens/${id}/soil`, { soilData });
    return response.data;
  },
  
  addPlant: async (gardenId: string, plantPlacement: Omit<Garden['plants'][0], 'id'>): Promise<Garden> => {
    // Format the data according to the backend AddPlantRequest structure
    const formattedData = {
      plantId: plantPlacement.plantId,
      date: plantPlacement.plantedDate ? new Date(plantPlacement.plantedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      position: {
        row: plantPlacement.position.row,
        col: plantPlacement.position.col
      }
    };
    
    const response = await api.post(`/gardens/${gardenId}/plants`, formattedData);
    return response.data;
  },
  
  removePlant: async (gardenId: string, row: number, col: number): Promise<Garden> => {
    // Use a more RESTful URL structure with query parameters
    const response = await api.delete(`/gardens/${gardenId}/plants?row=${row}&col=${col}`);
    return response.data;
  }
};

// Plant APIs
export const plantAPI = {
  getAll: async (): Promise<Plant[]> => {
    const response = await api.get('/plants');
    return response.data;
  },
  
  getById: async (id: string): Promise<Plant> => {
    const response = await api.get(`/plants/${id}`);
    return response.data;
  },
  
  create: async (plant: Omit<Plant, 'id' | 'creatorId' | 'isEditable'>): Promise<Plant> => {
    const response = await api.post('/plants', plant);
    // Plant creation will now be logged in activity log on the backend
    return response.data;
  },
  
  update: async (id: string, plant: Partial<Omit<Plant, 'id' | 'creatorId' | 'isEditable'>>): Promise<Plant> => {
    // This will only work if the user is the creator
    const response = await api.put(`/plants/${id}`, plant);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    // This will only work if the user is the creator
    await api.delete(`/plants/${id}`);
  },
  
  // New method to copy a plant (creating a new plant based on an existing one)
  copyPlant: async (id: string, modifications?: Partial<Omit<Plant, 'id' | 'creatorId' | 'isEditable'>>): Promise<Plant> => {
    // Create a copy that will belong to the current user
    const response = await api.post(`/plants/${id}/copy`, modifications || {});
    return response.data;
  },
  
  // Get plants created by the user
  getMyPlants: async (): Promise<Plant[]> => {
    const response = await api.get('/plants/my-plants');
    return response.data;
  },
  
  // Get recent plants the user has interacted with
  getRecentPlants: async (): Promise<Plant[]> => {
    const response = await api.get('/plants/recent');
    return response.data;
  },
  
  // Get shared plants (created by other users)
  getSharedPlants: async (): Promise<Plant[]> => {
    const response = await api.get('/plants/shared');
    return response.data;
  }
};

// Admin APIs
export const adminAPI = {
  getUsers: async (page: number = 1, pageSize: number = 10, search?: string): Promise<any> => {
    try {
      let url = `/admin/users?page=${page}&pageSize=${pageSize}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      // Debug logging for auth token
      const token = localStorage.getItem('garden_token');
      console.log('Auth token exists:', !!token);
      if (token) {
        // Log the first few characters of the token for debugging (don't log the whole token)
        console.log('Token starts with:', token.substring(0, 10) + '...');
      }

      const response = await api.get(url);
      console.log('Raw API response:', response);
      
      // Ensure we return a proper data structure even if the response is unexpected
      const data = response.data || {};
      return {
        users: Array.isArray(data.users) ? data.users : [],
        total: typeof data.total === 'number' ? data.total : 0,
        page: typeof data.page === 'number' ? data.page : page,
        pageSize: typeof data.pageSize === 'number' ? data.pageSize : pageSize
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      // Return default structure on error
      return {
        users: [],
        total: 0,
        page: page,
        pageSize: pageSize
      };
    }
  },
  
  getUserActivities: async (page: number = 1, pageSize: number = 10, filters?: { activityType?: string, userId?: string }): Promise<any> => {
    try {
      let url = `/admin/activities?page=${page}&pageSize=${pageSize}`;
      if (filters) {
        if (filters.activityType) {
          url += `&activityType=${encodeURIComponent(filters.activityType)}`;
        }
        if (filters.userId) {
          url += `&userId=${encodeURIComponent(filters.userId)}`;
        }
      }
      const response = await api.get(url);
      // Ensure we return a proper data structure even if the response is unexpected
      const data = response.data || {};
      return {
        activities: Array.isArray(data.activities) ? data.activities : [],
        total: typeof data.total === 'number' ? data.total : 0,
        page: typeof data.page === 'number' ? data.page : page,
        pageSize: typeof data.pageSize === 'number' ? data.pageSize : pageSize
      };
    } catch (error) {
      console.error('Error fetching user activities:', error);
      // Return default structure on error
      return {
        activities: [],
        total: 0,
        page: page,
        pageSize: pageSize
      };
    }
  },
  
  getMetrics: async (): Promise<any> => {
    try {
      const response = await api.get('/admin/metrics');
      // Ensure we return a proper data structure even if the response is unexpected
      const data = response.data || {};
      return {
        systemStats: Array.isArray(data.systemStats) ? data.systemStats : [],
        dailyMetrics: Array.isArray(data.dailyMetrics) ? data.dailyMetrics : []
      };
    } catch (error) {
      console.error('Error fetching metrics:', error);
      // Return default structure on error
      return {
        systemStats: [],
        dailyMetrics: []
      };
    }
  },
  
  getDailyMetrics: async (startDate?: string, endDate?: string, metricTypes?: string[]): Promise<any> => {
    let url = '/admin/metrics/daily';
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (metricTypes && metricTypes.length) {
      metricTypes.forEach(type => params.append('metricType', type));
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    try {
      const response = await api.get(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching daily metrics:', error);
      return [];
    }
  },
  
  getSystemStats: async (): Promise<any> => {
    try {
      const response = await api.get('/admin/metrics/system');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return [];
    }
  },
  
  setUserRole: async (userId: string, role: 'user' | 'admin'): Promise<any> => {
    try {
      const response = await api.put(`/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },
  
  generateDailyMetrics: async (): Promise<any> => {
    try {
      const response = await api.post('/admin/metrics/generate');
      return response.data;
    } catch (error) {
      console.error('Error generating daily metrics:', error);
      throw error;
    }
  }
};
