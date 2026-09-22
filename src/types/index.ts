export type ContainerStatus =
  | 'Empty'
  | 'Full'
  | 'Gate In'
  | 'In Yard'
  | 'Loading'
  | 'On Vessel'
  | 'Discharged'
  | 'Gate Out'
  | 'Damaged';

export type ContainerSize = '20' | '40' | '45';

export type ContainerTypeCategory =
  | 'Dry'
  | 'Reefer'
  | 'Open Top'
  | 'Flat Rack'
  | 'Tank'
  | 'Dangerous Goods';

export interface Container {
  id: string;
  container_number: string;
  iso_code: string;
  size: ContainerSize;
  type: ContainerTypeCategory;
  owner: string;
  weight: number; // in kg
  tare_weight?: number;
  max_payload?: number;
  status: ContainerStatus;
  location: string;
  seal_number: string;
  created_at: string;
  updated_at?: string;
}

export interface Vessel {
  id: string;
  vessel_name: string;
  imo: string;
  call_sign: string;
  capacity: number; // TEU
  status: 'Expected' | 'Arrived' | 'Berthed' | 'Operation' | 'Departed';
  created_at: string;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export interface Port {
  id: string;
  port_name: string;
  port_code: string;
  country: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export interface YardLocation {
  id: string;
  block: 'Block A' | 'Block B' | 'Block C' | 'Block D';
  row: number;
  bay: number;
  tier: number;
  location_code: string; // e.g. A-02-04-1
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
  container_number?: string;
  max_weight?: number;
  created_at: string;
}

export type ContainerType = ContainerTypeMaster;
export type YardMovement = YardMovementTransaction;

export interface ContainerTypeMaster {
  id: string;
  code: string;
  name: string;
  size: string;
  description: string;
  is_dangerous_goods?: boolean;
  is_reefer?: boolean;
}

export interface GateInTransaction {
  id: string;
  transaction_number: string;
  container_number: string;
  truck_number: string;
  driver: string;
  date_time: string;
  customer_id?: string;
  customer_name: string;
  condition: 'Good' | 'Damaged' | 'Dirty' | 'Seal Intact';
  seal_number: string;
  destination: string;
  status: 'Completed' | 'Pending Inspection' | 'Cancelled';
  assigned_yard_location?: string;
  notes?: string;
  created_at: string;
}

export interface GateOutTransaction {
  id: string;
  transaction_number: string;
  container_number: string;
  truck_number: string;
  driver: string;
  date_time: string;
  destination: string;
  do_number?: string;
  notes?: string;
  status: 'Completed' | 'Cancelled';
  created_at: string;
}

export interface YardMovementTransaction {
  id: string;
  movement_number: string;
  container_number: string;
  origin_location: string;
  destination_location: string;
  equipment: string; // e.g. RTG-01, Reach Stacker 02
  operator: string;
  date_time: string;
  status: 'Completed' | 'In Progress' | 'Cancelled';
  notes?: string;
  created_at: string;
}

export interface LoadingOperation {
  id: string;
  loading_number: string;
  vessel_id: string;
  vessel_name: string;
  container_number: string;
  crane: string; // Quay Crane QC-01
  operator: string;
  date_time: string;
  position: string; // Vessel stowage position e.g. Bay 04 - Row 02 - Tier 82
  status: 'Completed' | 'On Hold' | 'Cancelled';
  created_at: string;
}

export interface UnloadingOperation {
  id: string;
  unloading_number: string;
  vessel_id: string;
  vessel_name: string;
  container_number: string;
  crane: string;
  operator: string;
  date_time: string;
  position: string; // Destination yard location
  status: 'Completed' | 'Cancelled';
  created_at: string;
}

export interface DeliveryOrder {
  id: string;
  do_number: string;
  customer_id: string;
  customer_name: string;
  container_number: string;
  destination: string;
  truck_number: string;
  driver: string;
  date: string;
  expiry_date?: string;
  status: 'Active' | 'Used' | 'Expired';
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'supervisor';
  terminal: string;
  avatar_url?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'yard'
  | 'gate-in'
  | 'gate-out'
  | 'yard-movement'
  | 'loading'
  | 'unloading'
  | 'delivery-order'
  | 'master-container'
  | 'master-vessel'
  | 'master-customer'
  | 'master-port'
  | 'master-yard-location'
  | 'master-container-type'
  | 'reports'
  | 'firebase-status';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface OperationalStats {
  totalContainers: number;
  containersInYard: number;
  gateInToday: number;
  gateOutToday: number;
  containersLoaded: number;
  containersDischarged: number;
  activeVessels: number;
  yardOccupancyRate: number; // percentage
  totalYardCapacity: number;
}
