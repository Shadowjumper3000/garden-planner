import axios from 'axios';
import { Garden, Plant, SoilData, User } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' // In production, use relative path which will be handled by the server
  : 'http://localhost:8000/api'; // Updated port to match our docker-compose backend port

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
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
    const response = await api.delete(`/gardens/${gardenId}/plants`, { 
      data: { position: { row, col } }
    });
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
  
  create: async (plant: Omit<Plant, 'id'>): Promise<Plant> => {
    const response = await api.post('/plants', plant);
    return response.data;
  },
  
  update: async (id: string, plant: Partial<Omit<Plant, 'id'>>): Promise<Plant> => {
    const response = await api.put(`/plants/${id}`, plant);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/plants/${id}`);
  }
};
