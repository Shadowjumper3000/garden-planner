export interface Garden {
  id: string;
  name: string;
  rows: number;
  columns: number;
  plants: PlantPlacement[];
  soilData: SoilData;
  createdAt: string;
}

export interface PlantPlacement {
  plantId: string;
  position: {
    row: number;
    col: number;
  };
  plantedDate: string;
}

export interface SoilData {
  cells: SoilCell[][];
  lastUpdated: string;
}

export interface SoilCell {
  moisture: number; // 0-100%
  nitrogen: number; // 0-100%
  phosphorus: number; // 0-100%
  potassium: number; // 0-100%
  ph: number; // 0-14 scale
}

export interface SoilHistoryEntry {
  recordedAt: string;
  cells: SoilCell[][];
  /** Pre-computed average used by the scroll wheel gauge */
  avgMoisture?: number;
  avgNitrogen?: number;
  avgPhosphorus?: number;
  avgPotassium?: number;
}

export interface Plant {
  id: string;
  name: string;
  imageUrl?: string;
  description: string;
  creatorId?: string;
  isEditable?: boolean;
  nutrients: {
    nitrogenImpact: number; // -10 to 10 scale, negative means consumption
    phosphorusImpact: number;
    potassiumImpact: number;
  };
  compatiblePlants: string[];
  companionBenefits?: string;
  growthCycle: {
    germination: number; // days
    maturity: number; // days
    harvest: number; // days
  };
}

export interface PlantRelationship {
  id: string;
  plantAId: string;
  plantBId: string;
  /** 'beneficial' | 'neutral' | 'harmful' */
  relationshipType: string;
  benefitDescription: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // 'user' or 'admin'
  gardens: string[]; // ids of gardens
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface PlantingEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  plantId: string;
  gardenId: string;
  type: 'planting' | 'harvest' | 'maintenance';
  color?: string;
}

export interface Notification {
  id: string;
  type: 'watering' | 'harvest' | 'maintenance' | 'system';
  title: string;
  body: string;
  gardenId?: string;
  plantId?: string;
  scheduledAt?: string;
  readAt?: string;
  createdAt: string;
}

export type NutrientType = 'nitrogen' | 'phosphorus' | 'potassium';

