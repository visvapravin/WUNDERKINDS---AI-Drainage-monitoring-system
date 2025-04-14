export interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number;
  satellites: number;
  speed: number;
  timestamp: string;
  airQuality: string;
  waterLevel: number;
  waterFlow: number;
  waterSpeed: number;
  isRaining: boolean;
  prediction: string;
  status: string;
}

export const defaultDevice: Device = {
  id: "No device selected",
  name: "Unnamed Device",
  lat: 0,
  lng: 0,
  altitude: 0,
  satellites: 0,
  speed: 0,
  timestamp: new Date().toISOString(),
  airQuality: "Unknown",
  waterLevel: 0,
  waterFlow: 0,
  waterSpeed: 0,
  isRaining: false,
  prediction: "No prediction available",
  status: "inactive"
}; 