// components/voyage/types.ts

export interface FlightHUDState {
  speed: number; // units per second
  maxSpeed: number;
  boost: number; // 0 to 100
  isBoosting: boolean;
  heat: number; // 0 to 100
  heatWarning: boolean;
  shipPos: [number, number, number];
  shipHeading: number; // radians (yaw)
  nearestObjectId: string;
  nearestObjectName: string;
  nearestObjectDist: number;
  canScan: boolean;
  isScanning: boolean;
  scanProgress: number; // 0 to 1
}

export interface TouchInputState {
  thrust: number; // -1 to 1
  steer: number; // -1 to 1
  pitch: number; // -1 to 1
  boost: boolean;
  brake: boolean;
  scan: boolean;
}
