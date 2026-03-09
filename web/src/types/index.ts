export interface Garden {
  id: string;
  name: string;
  widthM: number;
  heightM: number;
  plants: PlantPlacement[];
  soilData: SoilData;
  createdAt: string;
}

export interface PlantPlacement {
  id: string;
  plantId: string;
  x: number;       // left edge in metres
  y: number;       // top edge in metres
  widthM: number;
  heightM: number;
  plantedDate: string;
}

export interface SoilData {
  cells: SoilCell[];
  resolution: number;  // cell size in metres (0.5)
  lastUpdated: string;
}

export interface SoilCell {
  x: number;       // top-left corner in metres
  y: number;
  moisture: number;    // 0–100 %
  nitrogen: number;    // 0–100 %
  phosphorus: number;  // 0–100 %
  potassium: number;   // 0–100 %
  ph: number;          // 0–14 scale
}

export interface SoilHistoryEntry {
  recordedAt: string;
  cells: SoilCell[];
  /** Pre-computed averages used by the scroll wheel gauge */
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
  creatorId?: number | null;
  isEditable?: boolean;
  size: {
    widthM: number;    // default footprint width in metres
    heightM: number;   // default footprint height in metres
  };
  nutrients: {
    nitrogenImpact: number;    // -10 to 10 scale
    phosphorusImpact: number;
    potassiumImpact: number;
  };
  compatiblePlants: string[];     // companion plant IDs
  companionBenefits?: string;
  growthCycle: {
    germination: number; // days
    maturity: number;    // days
    harvest: number;     // days
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

