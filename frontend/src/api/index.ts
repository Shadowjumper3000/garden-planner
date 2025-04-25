import axios from 'axios';
import { Garden, Plant, SoilData, User } from '../types';

// For demo purposes, we'll use a mock API base URL
const API_BASE_URL = 'https://api.gardenplanner.example';

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
    // For demo, simulating API response
    if (email && password) {
      // In a real app, this would be an actual API call
      console.log('Login attempt with:', email);
      // Using a simple check to determine if it's a returning user
      // In a real app, this would be determined by the backend
      const isReturningUser = localStorage.getItem('returning_' + email) === 'true';
      return {
        user: { 
          id: '1', 
          name: 'Garden Lover', 
          email, 
          // Only include garden IDs for returning users
          gardens: isReturningUser ? ['1', '2'] : [] 
        },
        token: 'mock_jwt_token_123',
      };
    }
    throw new Error('Invalid credentials');
  },
  
  register: async (name: string, email: string, password: string) => {
    // For demo, simulating API response
    console.log('Register attempt with:', name, email);
    return {
      user: { id: '1', name, email, gardens: [] },
      token: 'mock_jwt_token_123',
    };
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
  
  updateSoil: async (id: string, soilData: SoilData): Promise<Garden> => {
    const response = await api.patch(`/gardens/${id}/soil`, { soilData });
    return response.data;
  },
  
  addPlant: async (gardenId: string, plantPlacement: Omit<Garden['plants'][0], 'id'>): Promise<Garden> => {
    const response = await api.post(`/gardens/${gardenId}/plants`, plantPlacement);
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
  }
};

// Mock data generator for demo purposes
export const getMockGardens = (): Garden[] => {
  return [
    {
      id: '1',
      name: 'Veggie Patch',
      rows: 8,
      columns: 10,
      plants: [],
      soilData: {
        cells: Array(8).fill(Array(10).fill({
          moisture: Math.random() * 100,
          nitrogen: Math.random() * 100,
          phosphorus: Math.random() * 100,
          potassium: Math.random() * 100,
          ph: 6 + Math.random() * 2,
        })),
        lastUpdated: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Herb Garden',
      rows: 4,
      columns: 6,
      plants: [],
      soilData: {
        cells: Array(4).fill(Array(6).fill({
          moisture: Math.random() * 100,
          nitrogen: Math.random() * 100,
          phosphorus: Math.random() * 100,
          potassium: Math.random() * 100,
          ph: 6 + Math.random() * 2,
        })),
        lastUpdated: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    }
  ];
};

export const getMockPlants = (): Plant[] => {
  return [
    {
      id: "1",
      name: "Tomato",
      imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655",
      description: "A popular garden vegetable that produces red, juicy fruits.",
      nutrients: {
        nitrogenImpact: -8,
        phosphorusImpact: -5,
        potassiumImpact: -7
      },
      compatiblePlants: ["2", "5"],
      growthCycle: {
        germination: 7,
        maturity: 60,
        harvest: 90
      }
    },
    {
      id: "2",
      name: "Basil",
      imageUrl: "https://images.unsplash.com/photo-1601307636238-a6f43c0f1ec3",
      description: "Aromatic herb that pairs well with tomatoes, both in the garden and in cooking.",
      nutrients: {
        nitrogenImpact: -2,
        phosphorusImpact: -1,
        potassiumImpact: -2
      },
      compatiblePlants: ["1", "3"],
      growthCycle: {
        germination: 5,
        maturity: 30,
        harvest: 45
      }
    },
    {
      id: "3",
      name: "Carrot",
      imageUrl: "https://images.unsplash.com/photo-1598170845035-39f9d320a885",
      description: "Root vegetable that grows well in loose, sandy soil.",
      nutrients: {
        nitrogenImpact: -4,
        phosphorusImpact: -3,
        potassiumImpact: -5
      },
      compatiblePlants: ["2", "4"],
      growthCycle: {
        germination: 10,
        maturity: 70,
        harvest: 80
      }
    },
    {
      id: "4",
      name: "Lettuce",
      imageUrl: "https://images.unsplash.com/photo-1558401395-38de5d87a34e",
      description: "Leafy green that grows quickly and can be harvested multiple times.",
      nutrients: {
        nitrogenImpact: -3,
        phosphorusImpact: -1,
        potassiumImpact: -2
      },
      compatiblePlants: ["3", "5"],
      growthCycle: {
        germination: 3,
        maturity: 45,
        harvest: 50
      }
    },
    {
      id: "5",
      name: "Green Beans",
      imageUrl: "https://images.unsplash.com/photo-1567253577618-1dbf84855b91",
      description: "Legume that fixes nitrogen in the soil, beneficial for garden rotation.",
      nutrients: {
        nitrogenImpact: 5,
        phosphorusImpact: -2,
        potassiumImpact: -3
      },
      compatiblePlants: ["1", "4"],
      growthCycle: {
        germination: 8,
        maturity: 55,
        harvest: 60
      }
    }
  ];
};
