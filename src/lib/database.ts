import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { firestoreDb } from './firebase';
import {
  Container,
  Vessel,
  Customer,
  Port,
  YardLocation,
  ContainerTypeMaster,
  GateInTransaction,
  GateOutTransaction,
  YardMovementTransaction,
  LoadingOperation,
  UnloadingOperation,
  DeliveryOrder,
  OperationalStats,
} from '../types';
import {
  initialContainers,
  initialVessels,
  initialCustomers,
  initialPorts,
  initialYardLocations,
  initialContainerTypes,
  initialGateIn,
  initialGateOut,
  initialYardMovements,
  initialLoadingOperations,
  initialUnloadingOperations,
  initialDeliveryOrders,
} from './seedData';

type Listener = () => void;

class FirebaseFirestoreDatabaseStore {
  private containers: Container[] = [];
  private vessels: Vessel[] = [];
  private customers: Customer[] = [];
  private ports: Port[] = [];
  private yardLocations: YardLocation[] = [];
  private containerTypes: ContainerTypeMaster[] = [];
  private gateInList: GateInTransaction[] = [];
  private gateOutList: GateOutTransaction[] = [];
  private yardMovementsList: YardMovementTransaction[] = [];
  private loadingList: LoadingOperation[] = [];
  private unloadingList: UnloadingOperation[] = [];
  private deliveryOrdersList: DeliveryOrder[] = [];

  private listeners: Set<Listener> = new Set();
  private firebaseConnected: boolean = false;
  private isSeeding: boolean = false;

  constructor() {
    // 1. Initialize local state immediately from seed so UI renders instantly
    this.containers = [...initialContainers];
    this.vessels = [...initialVessels];
    this.customers = [...initialCustomers];
    this.ports = [...initialPorts];
    this.yardLocations = [...initialYardLocations];
    this.containerTypes = [...initialContainerTypes];
    this.gateInList = [...initialGateIn];
    this.gateOutList = [...initialGateOut];
    this.yardMovementsList = [...initialYardMovements];
    this.loadingList = [...initialLoadingOperations];
    this.unloadingList = [...initialUnloadingOperations];
    this.deliveryOrdersList = [...initialDeliveryOrders];
    this.syncYardOccupancy();

    // 2. Connect Firestore Realtime Snapshots
    this.initFirestoreRealtime();
  }

  public isRealtimeConnected(): boolean {
    return this.firebaseConnected;
  }

  public isFirebaseConnected(): boolean {
    return this.firebaseConnected;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Database listener error:', err);
      }
    });
  }

  private syncYardOccupancy() {
    const occupiedLocations = new Map<string, string>();
    this.containers.forEach((c) => {
      if ((c.status === 'In Yard' || c.status === 'Gate In' || c.status === 'Discharged') && c.location) {
        occupiedLocations.set(c.location, c.container_number);
      }
    });

    this.yardLocations.forEach((loc) => {
      if (occupiedLocations.has(loc.location_code)) {
        loc.status = 'Occupied';
        loc.container_number = occupiedLocations.get(loc.location_code);
      } else if (loc.status === 'Occupied' && !loc.container_number) {
        loc.status = 'Available';
      }
    });
  }

  /**
   * Initializes real-time Firestore listeners on all operational and master collections
   */
  private initFirestoreRealtime() {
    try {
      // 1. Containers Collection
      const containersCol = collection(firestoreDb, 'containers');
      onSnapshot(
        containersCol,
        (snapshot) => {
          this.firebaseConnected = true;
          if (snapshot.empty && !this.isSeeding) {
            // Seed Firestore on initial load
            this.seedAllCollectionsToFirestore();
            return;
          }
          if (!snapshot.empty) {
            const list: Container[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ ...(docSnap.data() as Container), id: docSnap.id });
            });
            this.containers = list;
            this.syncYardOccupancy();
            this.notifyListeners();
          }
        },
        (error) => {
          console.warn('Firestore containers snapshot error:', error);
        }
      );

      // 2. Vessels Collection
      onSnapshot(collection(firestoreDb, 'vessels'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Vessel[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as Vessel), id: docSnap.id }));
          this.vessels = list;
          this.notifyListeners();
        }
      });

      // 3. Customers Collection
      onSnapshot(collection(firestoreDb, 'customers'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Customer[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as Customer), id: docSnap.id }));
          this.customers = list;
          this.notifyListeners();
        }
      });

      // 4. Ports Collection
      onSnapshot(collection(firestoreDb, 'ports'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Port[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as Port), id: docSnap.id }));
          this.ports = list;
          this.notifyListeners();
        }
      });

      // 5. Yard Locations Collection
      onSnapshot(collection(firestoreDb, 'yard_locations'), (snapshot) => {
        if (!snapshot.empty) {
          const list: YardLocation[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as YardLocation), id: docSnap.id }));
          this.yardLocations = list;
          this.syncYardOccupancy();
          this.notifyListeners();
        }
      });

      // 6. Container Types Collection
      onSnapshot(collection(firestoreDb, 'container_types'), (snapshot) => {
        if (!snapshot.empty) {
          const list: ContainerTypeMaster[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as ContainerTypeMaster), id: docSnap.id }));
          this.containerTypes = list;
          this.notifyListeners();
        }
      });

      // 7. Gate In Transactions
      onSnapshot(collection(firestoreDb, 'gate_in_transactions'), (snapshot) => {
        if (!snapshot.empty) {
          const list: GateInTransaction[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as GateInTransaction), id: docSnap.id }));
          this.gateInList = list.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
          this.notifyListeners();
        }
      });

      // 8. Gate Out Transactions
      onSnapshot(collection(firestoreDb, 'gate_out_transactions'), (snapshot) => {
        if (!snapshot.empty) {
          const list: GateOutTransaction[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as GateOutTransaction), id: docSnap.id }));
          this.gateOutList = list.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
          this.notifyListeners();
        }
      });

      // 9. Yard Movements
      onSnapshot(collection(firestoreDb, 'yard_movements'), (snapshot) => {
        if (!snapshot.empty) {
          const list: YardMovementTransaction[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as YardMovementTransaction), id: docSnap.id }));
          this.yardMovementsList = list.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
          this.notifyListeners();
        }
      });

      // 10. Loading Operations
      onSnapshot(collection(firestoreDb, 'loading_operations'), (snapshot) => {
        if (!snapshot.empty) {
          const list: LoadingOperation[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as LoadingOperation), id: docSnap.id }));
          this.loadingList = list.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
          this.notifyListeners();
        }
      });

      // 11. Unloading Operations
      onSnapshot(collection(firestoreDb, 'unloading_operations'), (snapshot) => {
        if (!snapshot.empty) {
          const list: UnloadingOperation[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as UnloadingOperation), id: docSnap.id }));
          this.unloadingList = list.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
          this.notifyListeners();
        }
      });

      // 12. Delivery Orders
      onSnapshot(collection(firestoreDb, 'delivery_orders'), (snapshot) => {
        if (!snapshot.empty) {
          const list: DeliveryOrder[] = [];
          snapshot.forEach((docSnap) => list.push({ ...(docSnap.data() as DeliveryOrder), id: docSnap.id }));
          this.deliveryOrdersList = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          this.notifyListeners();
        }
      });
    } catch (err) {
      console.warn('Error setting up Firestore realtime listeners:', err);
    }
  }

  /**
   * Seed all initial terminal data into Firebase Firestore
   */
  public async seedAllCollectionsToFirestore(): Promise<void> {
    if (this.isSeeding) return;
    this.isSeeding = true;
    try {
      const batch = writeBatch(firestoreDb);

      initialContainers.forEach((c) => {
        batch.set(doc(firestoreDb, 'containers', c.id), c);
      });
      initialVessels.forEach((v) => {
        batch.set(doc(firestoreDb, 'vessels', v.id), v);
      });
      initialCustomers.forEach((c) => {
        batch.set(doc(firestoreDb, 'customers', c.id), c);
      });
      initialPorts.forEach((p) => {
        batch.set(doc(firestoreDb, 'ports', p.id), p);
      });
      initialYardLocations.forEach((y) => {
        batch.set(doc(firestoreDb, 'yard_locations', y.id), y);
      });
      initialContainerTypes.forEach((t) => {
        batch.set(doc(firestoreDb, 'container_types', t.id), t);
      });
      initialGateIn.forEach((g) => {
        batch.set(doc(firestoreDb, 'gate_in_transactions', g.id), g);
      });
      initialGateOut.forEach((g) => {
        batch.set(doc(firestoreDb, 'gate_out_transactions', g.id), g);
      });
      initialYardMovements.forEach((m) => {
        batch.set(doc(firestoreDb, 'yard_movements', m.id), m);
      });
      initialLoadingOperations.forEach((l) => {
        batch.set(doc(firestoreDb, 'loading_operations', l.id), l);
      });
      initialUnloadingOperations.forEach((u) => {
        batch.set(doc(firestoreDb, 'unloading_operations', u.id), u);
      });
      initialDeliveryOrders.forEach((d) => {
        batch.set(doc(firestoreDb, 'delivery_orders', d.id), d);
      });

      await batch.commit();
      this.firebaseConnected = true;
    } catch (err) {
      console.warn('Failed to seed Firestore batch:', err);
    } finally {
      this.isSeeding = false;
    }
  }

  public async resetToSeed(): Promise<void> {
    this.containers = [...initialContainers];
    this.vessels = [...initialVessels];
    this.customers = [...initialCustomers];
    this.ports = [...initialPorts];
    this.yardLocations = [...initialYardLocations];
    this.containerTypes = [...initialContainerTypes];
    this.gateInList = [...initialGateIn];
    this.gateOutList = [...initialGateOut];
    this.yardMovementsList = [...initialYardMovements];
    this.loadingList = [...initialLoadingOperations];
    this.unloadingList = [...initialUnloadingOperations];
    this.deliveryOrdersList = [...initialDeliveryOrders];
    this.syncYardOccupancy();
    this.notifyListeners();
    await this.seedAllCollectionsToFirestore();
  }

  // ==========================================
  // MASTER: CONTAINERS
  // ==========================================
  public async getContainers(): Promise<Container[]> {
    return [...this.containers];
  }

  public async getContainerByNumber(containerNumber: string): Promise<Container | undefined> {
    const clean = containerNumber.toUpperCase().trim();
    return this.containers.find((c) => c.container_number.toUpperCase() === clean);
  }

  public async createContainer(data: Omit<Container, 'id' | 'created_at'>): Promise<Container> {
    const cleanNumber = data.container_number.toUpperCase().trim();
    if (this.containers.some((c) => c.container_number.toUpperCase() === cleanNumber)) {
      throw new Error(`Nomor kontainer ${cleanNumber} sudah terdaftar.`);
    }

    const id = `cnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newContainer: Container = {
      ...data,
      id,
      container_number: cleanNumber,
      created_at: new Date().toISOString(),
    };

    // 1. Optimistic local update
    this.containers.unshift(newContainer);
    this.syncYardOccupancy();
    this.notifyListeners();

    // 2. Persist to Firestore
    try {
      await setDoc(doc(firestoreDb, 'containers', id), newContainer);
    } catch (err) {
      console.warn('Firestore write error (createContainer):', err);
    }

    return newContainer;
  }

  public async updateContainer(id: string, updates: Partial<Container>): Promise<Container> {
    const index = this.containers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Kontainer tidak ditemukan.');

    if (updates.container_number) {
      const cleanNo = updates.container_number.toUpperCase().trim();
      const duplicate = this.containers.find((c) => c.id !== id && c.container_number.toUpperCase() === cleanNo);
      if (duplicate) {
        throw new Error(`Nomor kontainer ${cleanNo} sudah digunakan oleh kontainer lain.`);
      }
      updates.container_number = cleanNo;
    }

    const updated: Container = {
      ...this.containers[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.containers[index] = updated;
    this.syncYardOccupancy();
    this.notifyListeners();

    try {
      await updateDoc(doc(firestoreDb, 'containers', id), updates as Record<string, any>);
    } catch (err) {
      console.warn('Firestore write error (updateContainer):', err);
    }

    return updated;
  }

  public async deleteContainer(id: string): Promise<boolean> {
    const index = this.containers.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.containers.splice(index, 1);
    this.syncYardOccupancy();
    this.notifyListeners();

    try {
      await deleteDoc(doc(firestoreDb, 'containers', id));
    } catch (err) {
      console.warn('Firestore write error (deleteContainer):', err);
    }

    return true;
  }

  // ==========================================
  // MASTER: VESSELS
  // ==========================================
  public async getVessels(): Promise<Vessel[]> {
    return [...this.vessels];
  }

  public async createVessel(data: Omit<Vessel, 'id' | 'created_at'>): Promise<Vessel> {
    const id = `vsl-${Date.now()}`;
    const newVessel: Vessel = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.vessels.unshift(newVessel);
    this.notifyListeners();

    try {
      await setDoc(doc(firestoreDb, 'vessels', id), newVessel);
    } catch (err) {
      console.warn('Firestore write error (createVessel):', err);
    }

    return newVessel;
  }

  public async updateVessel(id: string, updates: Partial<Vessel>): Promise<Vessel> {
    const index = this.vessels.findIndex((v) => v.id === id);
    if (index === -1) throw new Error('Kapal tidak ditemukan.');

    const updated = { ...this.vessels[index], ...updates };
    this.vessels[index] = updated;
    this.notifyListeners();

    try {
      await updateDoc(doc(firestoreDb, 'vessels', id), updates as Record<string, any>);
    } catch (err) {
      console.warn('Firestore write error (updateVessel):', err);
    }

    return updated;
  }

  public async deleteVessel(id: string): Promise<boolean> {
    const index = this.vessels.findIndex((v) => v.id === id);
    if (index === -1) return false;

    this.vessels.splice(index, 1);
    this.notifyListeners();

    try {
      await deleteDoc(doc(firestoreDb, 'vessels', id));
    } catch (err) {
      console.warn('Firestore write error (deleteVessel):', err);
    }

    return true;
  }

  // ==========================================
  // MASTER: CUSTOMERS
  // ==========================================
  public async getCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  public async createCustomer(data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const id = `cust-${Date.now()}`;
    const newCust: Customer = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.customers.unshift(newCust);
    this.notifyListeners();

    try {
      await setDoc(doc(firestoreDb, 'customers', id), newCust);
    } catch (err) {
      console.warn('Firestore write error (createCustomer):', err);
    }

    return newCust;
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Pelanggan tidak ditemukan.');

    const updated = { ...this.customers[index], ...updates };
    this.customers[index] = updated;
    this.notifyListeners();

    try {
      await updateDoc(doc(firestoreDb, 'customers', id), updates as Record<string, any>);
    } catch (err) {
      console.warn('Firestore write error (updateCustomer):', err);
    }

    return updated;
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.customers.splice(index, 1);
    this.notifyListeners();

    try {
      await deleteDoc(doc(firestoreDb, 'customers', id));
    } catch (err) {
      console.warn('Firestore write error (deleteCustomer):', err);
    }

    return true;
  }

  // ==========================================
  // MASTER: PORTS
  // ==========================================
  public async getPorts(): Promise<Port[]> {
    return [...this.ports];
  }

  public async createPort(data: Omit<Port, 'id' | 'created_at'>): Promise<Port> {
    const id = `port-${Date.now()}`;
    const newPort: Port = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.ports.unshift(newPort);
    this.notifyListeners();

    try {
      await setDoc(doc(firestoreDb, 'ports', id), newPort);
    } catch (err) {
      console.warn('Firestore write error (createPort):', err);
    }

    return newPort;
  }

  public async updatePort(id: string, updates: Partial<Port>): Promise<Port> {
    const index = this.ports.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Pelabuhan tidak ditemukan.');

    const updated = { ...this.ports[index], ...updates };
    this.ports[index] = updated;
    this.notifyListeners();

    try {
      await updateDoc(doc(firestoreDb, 'ports', id), updates as Record<string, any>);
    } catch (err) {
      console.warn('Firestore write error (updatePort):', err);
    }

    return updated;
  }

  public async deletePort(id: string): Promise<boolean> {
    const index = this.ports.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.ports.splice(index, 1);
    this.notifyListeners();

    try {
      await deleteDoc(doc(firestoreDb, 'ports', id));
    } catch (err) {
      console.warn('Firestore write error (deletePort):', err);
    }

    return true;
  }

  // ==========================================
  // MASTER: YARD LOCATIONS
  // ==========================================
  public async getYardLocations(): Promise<YardLocation[]> {
    return [...this.yardLocations];
  }

  public async createYardLocation(data: Omit<YardLocation, 'id' | 'created_at'>): Promise<YardLocation> {
    const id = `loc-${Date.now()}`;
    const newLoc: YardLocation = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.yardLocations.push(newLoc);
    this.notifyListeners();

    try {
      await setDoc(doc(firestoreDb, 'yard_locations', id), newLoc);
    } catch (err) {
      console.warn('Firestore write error (createYardLocation):', err);
    }

    return newLoc;
  }

  public async updateYardLocation(id: string, updates: Partial<YardLocation>): Promise<YardLocation> {
    const index = this.yardLocations.findIndex((y) => y.id === id);
    if (index === -1) throw new Error('Lokasi yard tidak ditemukan.');

    const updated = { ...this.yardLocations[index], ...updates };
    this.yardLocations[index] = updated;
    this.notifyListeners();

    try {
      await updateDoc(doc(firestoreDb, 'yard_locations', id), updates as Record<string, any>);
    } catch (err) {
      console.warn('Firestore write error (updateYardLocation):', err);
    }

    return updated;
  }

  public async deleteYardLocation(id: string): Promise<boolean> {
    const index = this.yardLocations.findIndex((y) => y.id === id);
    if (index === -1) return false;

    this.yardLocations.splice(index, 1);
    this.notifyListeners();

    try {
      await deleteDoc(doc(firestoreDb, 'yard_locations', id));
    } catch (err) {
      console.warn('Firestore write error (deleteYardLocation):', err);
    }

    return true;
  }

  // ==========================================
  // MASTER: CONTAINER TYPES
  // ==========================================
  public async getContainerTypes(): Promise<ContainerTypeMaster[]> {
    return [...this.containerTypes];
  }

  public async createContainerType(data: Omit<ContainerTypeMaster, 'id'>): Promise<ContainerTypeMaster> {
    const id = `type-${Date.now()}`;
    const newType: ContainerTypeMaster = { ...data, id };

    this.containerTypes.push(newType);
    this.notifyListeners();

    try {
      await setDoc(doc(firestoreDb, 'container_types', id), newType);
    } catch (err) {
      console.warn('Firestore write error (createContainerType):', err);
    }

    return newType;
  }

  public async updateContainerType(id: string, updates: Partial<ContainerTypeMaster>): Promise<ContainerTypeMaster> {
    const index = this.containerTypes.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Tipe kontainer tidak ditemukan.');

    const updated = { ...this.containerTypes[index], ...updates };
    this.containerTypes[index] = updated;
    this.notifyListeners();

    try {
      await updateDoc(doc(firestoreDb, 'container_types', id), updates as Record<string, any>);
    } catch (err) {
      console.warn('Firestore write error (updateContainerType):', err);
    }

    return updated;
  }

  public async deleteContainerType(id: string): Promise<boolean> {
    const index = this.containerTypes.findIndex((t) => t.id === id);
    if (index === -1) return false;

    this.containerTypes.splice(index, 1);
    this.notifyListeners();

    try {
      await deleteDoc(doc(firestoreDb, 'container_types', id));
    } catch (err) {
      console.warn('Firestore write error (deleteContainerType):', err);
    }

    return true;
  }

  // ==========================================
  // TRANSACTION: GATE IN
  // ==========================================
  public async getGateInTransactions(): Promise<GateInTransaction[]> {
    return [...this.gateInList];
  }

  public async processGateIn(data: {
    container_number: string;
    truck_number: string;
    driver: string;
    customer_name?: string;
    condition?: 'Good' | 'Damaged' | 'Dirty' | 'Seal Intact';
    seal_number?: string;
    destination?: string;
    assigned_yard_location?: string;
    notes?: string;
    size?: '20' | '40' | '45';
    type?: 'Dry' | 'Reefer' | 'Open Top' | 'Flat Rack' | 'Tank' | 'Dangerous Goods';
    weight?: number;
  }): Promise<GateInTransaction> {
    const cleanNumber = data.container_number.toUpperCase().trim();
    let container = this.containers.find((c) => c.container_number.toUpperCase() === cleanNumber);

    const targetLocation = data.assigned_yard_location || 'A-01-01-1';

    // Check yard slot
    const yardLoc = this.yardLocations.find((l) => l.location_code === targetLocation);
    if (yardLoc && yardLoc.status === 'Occupied' && yardLoc.container_number !== cleanNumber) {
      throw new Error(`Slot yard ${targetLocation} sudah terisi kontainer ${yardLoc.container_number}.`);
    }

    if (container) {
      container.status = 'In Yard';
      container.location = targetLocation;
      if (data.seal_number) container.seal_number = data.seal_number;
      if (data.weight) container.weight = data.weight;
      if (data.size) container.size = data.size;
      if (data.type) container.type = data.type;
    } else {
      container = {
        id: `cnt-${Date.now()}`,
        container_number: cleanNumber,
        iso_code: data.size === '20' ? '22G1' : '42G1',
        size: data.size || '40',
        type: data.type || 'Dry',
        owner: data.customer_name || 'Maersk Line',
        weight: data.weight || 24000,
        tare_weight: data.size === '20' ? 2200 : 3800,
        max_payload: 28200,
        status: 'In Yard',
        location: targetLocation,
        seal_number: data.seal_number || `SL-${Math.floor(100000 + Math.random() * 900000)}`,
        created_at: new Date().toISOString(),
      };
      this.containers.unshift(container);
    }

    if (yardLoc) {
      yardLoc.status = 'Occupied';
      yardLoc.container_number = cleanNumber;
    }

    const today = new Date();
    const datePrefix = `GI-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    const todayCount = this.gateInList.filter((g) => g.transaction_number.startsWith(datePrefix)).length + 1;
    const transaction_number = `${datePrefix}-${todayCount.toString().padStart(4, '0')}`;

    const newGateIn: GateInTransaction = {
      id: `gi-${Date.now()}`,
      transaction_number,
      container_number: cleanNumber,
      truck_number: data.truck_number.toUpperCase().trim(),
      driver: data.driver.trim(),
      date_time: new Date().toISOString(),
      customer_id: 'cust-1',
      customer_name: data.customer_name || container.owner,
      condition: data.condition || 'Good',
      seal_number: data.seal_number || container.seal_number,
      destination: data.destination || 'Yard Stacking',
      status: 'Completed',
      assigned_yard_location: targetLocation,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    this.gateInList.unshift(newGateIn);
    this.syncYardOccupancy();
    this.notifyListeners();

    // Persist to Firestore
    try {
      await Promise.all([
        setDoc(doc(firestoreDb, 'gate_in_transactions', newGateIn.id), newGateIn),
        setDoc(doc(firestoreDb, 'containers', container.id), container),
        yardLoc ? setDoc(doc(firestoreDb, 'yard_locations', yardLoc.id), yardLoc) : Promise.resolve(),
      ]);
    } catch (err) {
      console.warn('Firestore write error (processGateIn):', err);
    }

    return newGateIn;
  }

  // ==========================================
  // TRANSACTION: GATE OUT
  // ==========================================
  public async getGateOutTransactions(): Promise<GateOutTransaction[]> {
    return [...this.gateOutList];
  }

  public async processGateOut(data: {
    container_number: string;
    truck_number: string;
    driver: string;
    destination: string;
    do_number?: string;
    notes?: string;
  }): Promise<GateOutTransaction> {
    const cleanNumber = data.container_number.toUpperCase().trim();
    const container = this.containers.find((c) => c.container_number.toUpperCase() === cleanNumber);
    if (!container) {
      throw new Error(`Kontainer ${cleanNumber} tidak ditemukan di database.`);
    }

    // Free yard slot
    if (container.location && container.location.includes('-')) {
      const yardLoc = this.yardLocations.find((l) => l.location_code === container.location);
      if (yardLoc) {
        yardLoc.status = 'Available';
        yardLoc.container_number = undefined;
        try {
          await setDoc(doc(firestoreDb, 'yard_locations', yardLoc.id), yardLoc);
        } catch {
          // ignore
        }
      }
    }

    container.status = 'Gate Out';
    container.location = 'Keluar Terminal';

    // Mark DO as Used if present
    if (data.do_number) {
      const doObj = this.deliveryOrdersList.find((d) => d.do_number === data.do_number);
      if (doObj) {
        doObj.status = 'Used';
        try {
          await setDoc(doc(firestoreDb, 'delivery_orders', doObj.id), doObj);
        } catch {
          // ignore
        }
      }
    }

    const today = new Date();
    const datePrefix = `GO-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    const todayCount = this.gateOutList.filter((g) => g.transaction_number.startsWith(datePrefix)).length + 1;
    const transaction_number = `${datePrefix}-${todayCount.toString().padStart(4, '0')}`;

    const newGateOut: GateOutTransaction = {
      id: `go-${Date.now()}`,
      transaction_number,
      container_number: cleanNumber,
      truck_number: data.truck_number.toUpperCase().trim(),
      driver: data.driver.trim(),
      date_time: new Date().toISOString(),
      destination: data.destination,
      do_number: data.do_number,
      notes: data.notes,
      status: 'Completed',
      created_at: new Date().toISOString(),
    };

    this.gateOutList.unshift(newGateOut);
    this.syncYardOccupancy();
    this.notifyListeners();

    try {
      await Promise.all([
        setDoc(doc(firestoreDb, 'gate_out_transactions', newGateOut.id), newGateOut),
        setDoc(doc(firestoreDb, 'containers', container.id), container),
      ]);
    } catch (err) {
      console.warn('Firestore write error (processGateOut):', err);
    }

    return newGateOut;
  }

  // ==========================================
  // TRANSACTION: YARD MOVEMENT
  // ==========================================
  public async getYardMovements(): Promise<YardMovementTransaction[]> {
    return [...this.yardMovementsList];
  }

  public async processYardMovement(data: {
    container_number: string;
    destination_location: string;
    equipment: string;
    operator: string;
    notes?: string;
  }): Promise<YardMovementTransaction> {
    const cleanNumber = data.container_number.toUpperCase().trim();
    const container = this.containers.find((c) => c.container_number.toUpperCase() === cleanNumber);
    if (!container) {
      throw new Error(`Kontainer ${cleanNumber} tidak ditemukan.`);
    }

    const originLocation = container.location;
    const destLocation = data.destination_location;

    if (originLocation === destLocation) {
      throw new Error('Lokasi tujuan sama dengan lokasi saat ini.');
    }

    const destSlot = this.yardLocations.find((l) => l.location_code === destLocation);
    if (destSlot && destSlot.status === 'Occupied' && destSlot.container_number !== cleanNumber) {
      throw new Error(`Slot ${destLocation} sudah terisi kontainer ${destSlot.container_number}.`);
    }

    const originSlot = this.yardLocations.find((l) => l.location_code === originLocation);
    if (originSlot) {
      originSlot.status = 'Available';
      originSlot.container_number = undefined;
    }

    if (destSlot) {
      destSlot.status = 'Occupied';
      destSlot.container_number = cleanNumber;
    }

    container.location = destLocation;
    container.status = 'In Yard';

    const today = new Date();
    const datePrefix = `YM-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    const todayCount = this.yardMovementsList.filter((m) => m.movement_number.startsWith(datePrefix)).length + 1;
    const movement_number = `${datePrefix}-${todayCount.toString().padStart(4, '0')}`;

    const newMovement: YardMovementTransaction = {
      id: `ym-${Date.now()}`,
      movement_number,
      container_number: cleanNumber,
      origin_location: originLocation,
      destination_location: destLocation,
      equipment: data.equipment,
      operator: data.operator,
      date_time: new Date().toISOString(),
      status: 'Completed',
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    this.yardMovementsList.unshift(newMovement);
    this.syncYardOccupancy();
    this.notifyListeners();

    try {
      await Promise.all([
        setDoc(doc(firestoreDb, 'yard_movements', newMovement.id), newMovement),
        setDoc(doc(firestoreDb, 'containers', container.id), container),
        originSlot ? setDoc(doc(firestoreDb, 'yard_locations', originSlot.id), originSlot) : Promise.resolve(),
        destSlot ? setDoc(doc(firestoreDb, 'yard_locations', destSlot.id), destSlot) : Promise.resolve(),
      ]);
    } catch (err) {
      console.warn('Firestore write error (processYardMovement):', err);
    }

    return newMovement;
  }

  // ==========================================
  // TRANSACTION: LOADING (Yard to Vessel)
  // ==========================================
  public async getLoadingOperations(): Promise<LoadingOperation[]> {
    return [...this.loadingList];
  }

  public async processLoading(data: {
    vessel_id?: string;
    vessel_name?: string;
    container_number: string;
    crane: string;
    operator: string;
    position: string;
  }): Promise<LoadingOperation> {
    const cleanNumber = data.container_number.toUpperCase().trim();
    const container = this.containers.find((c) => c.container_number.toUpperCase() === cleanNumber);
    if (!container) {
      throw new Error(`Kontainer ${cleanNumber} tidak ditemukan.`);
    }

    const vessel =
      this.vessels.find((v) => (data.vessel_id && v.id === data.vessel_id) || (data.vessel_name && v.vessel_name === data.vessel_name)) ||
      this.vessels[0];
    if (!vessel) throw new Error('Kapal tujuan tidak valid.');

    // Free previous yard slot
    let oldSlot: YardLocation | undefined;
    if (container.location && container.location.includes('-')) {
      oldSlot = this.yardLocations.find((l) => l.location_code === container.location);
      if (oldSlot) {
        oldSlot.status = 'Available';
        oldSlot.container_number = undefined;
      }
    }

    container.status = 'On Vessel';
    container.location = `${vessel.vessel_name} - ${data.position}`;

    const today = new Date();
    const datePrefix = `LD-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    const todayCount = this.loadingList.filter((l) => l.loading_number.startsWith(datePrefix)).length + 1;
    const loading_number = `${datePrefix}-${todayCount.toString().padStart(4, '0')}`;

    const newLoading: LoadingOperation = {
      id: `ld-${Date.now()}`,
      loading_number,
      vessel_id: vessel.id,
      vessel_name: vessel.vessel_name,
      container_number: cleanNumber,
      crane: data.crane,
      operator: data.operator,
      position: data.position,
      date_time: new Date().toISOString(),
      status: 'Completed',
      created_at: new Date().toISOString(),
    };

    this.loadingList.unshift(newLoading);
    this.syncYardOccupancy();
    this.notifyListeners();

    try {
      await Promise.all([
        setDoc(doc(firestoreDb, 'loading_operations', newLoading.id), newLoading),
        setDoc(doc(firestoreDb, 'containers', container.id), container),
        oldSlot ? setDoc(doc(firestoreDb, 'yard_locations', oldSlot.id), oldSlot) : Promise.resolve(),
      ]);
    } catch (err) {
      console.warn('Firestore write error (processLoading):', err);
    }

    return newLoading;
  }

  // ==========================================
  // TRANSACTION: UNLOADING (Vessel to Yard)
  // ==========================================
  public async getUnloadingOperations(): Promise<UnloadingOperation[]> {
    return [...this.unloadingList];
  }

  public async processUnloading(data: {
    vessel_id?: string;
    vessel_name?: string;
    container_number: string;
    crane: string;
    operator: string;
    destination_yard_location?: string;
    position?: string;
    size?: '20' | '40' | '45';
    type?: 'Dry' | 'Reefer' | 'Open Top' | 'Flat Rack' | 'Tank' | 'Dangerous Goods';
    weight?: number;
    seal_number?: string;
  }): Promise<UnloadingOperation> {
    const cleanNumber = data.container_number.toUpperCase().trim();
    const vessel =
      this.vessels.find((v) => (data.vessel_id && v.id === data.vessel_id) || (data.vessel_name && v.vessel_name === data.vessel_name)) ||
      this.vessels[0];
    if (!vessel) throw new Error('Kapal tidak ditemukan.');

    const targetLoc = data.destination_yard_location || data.position || 'A-01-01-1';

    const yardLoc = this.yardLocations.find((l) => l.location_code === targetLoc);
    if (yardLoc && yardLoc.status === 'Occupied' && yardLoc.container_number !== cleanNumber) {
      throw new Error(`Slot yard ${targetLoc} sudah terisi kontainer ${yardLoc.container_number}.`);
    }
    if (yardLoc) {
      yardLoc.status = 'Occupied';
      yardLoc.container_number = cleanNumber;
    }

    let container = this.containers.find((c) => c.container_number.toUpperCase() === cleanNumber);
    if (container) {
      container.status = 'Discharged';
      container.location = targetLoc;
    } else {
      container = {
        id: `cnt-${Date.now()}`,
        container_number: cleanNumber,
        iso_code: data.size === '20' ? '22G1' : '42G1',
        size: data.size || '40',
        type: data.type || 'Dry',
        owner: (vessel as any).shipping_line || vessel.call_sign || 'Ocean Carrier',
        weight: data.weight || 22000,
        status: 'Discharged',
        location: targetLoc,
        seal_number: data.seal_number || `SL-${Math.floor(100000 + Math.random() * 900000)}`,
        created_at: new Date().toISOString(),
      };
      this.containers.unshift(container);
    }

    const today = new Date();
    const datePrefix = `ULD-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    const todayCount = this.unloadingList.filter((u) => u.unloading_number.startsWith(datePrefix)).length + 1;
    const unloading_number = `${datePrefix}-${todayCount.toString().padStart(4, '0')}`;

    const newUnloading: UnloadingOperation = {
      id: `uld-${Date.now()}`,
      unloading_number,
      vessel_id: vessel.id,
      vessel_name: vessel.vessel_name,
      container_number: cleanNumber,
      crane: data.crane,
      operator: data.operator,
      position: targetLoc,
      date_time: new Date().toISOString(),
      status: 'Completed',
      created_at: new Date().toISOString(),
    };

    this.unloadingList.unshift(newUnloading);
    this.syncYardOccupancy();
    this.notifyListeners();

    try {
      await Promise.all([
        setDoc(doc(firestoreDb, 'unloading_operations', newUnloading.id), newUnloading),
        setDoc(doc(firestoreDb, 'containers', container.id), container),
        yardLoc ? setDoc(doc(firestoreDb, 'yard_locations', yardLoc.id), yardLoc) : Promise.resolve(),
      ]);
    } catch (err) {
      console.warn('Firestore write error (processUnloading):', err);
    }

    return newUnloading;
  }

  // ==========================================
  // TRANSACTION: DELIVERY ORDER
  // ==========================================
  public async getDeliveryOrders(): Promise<DeliveryOrder[]> {
    return [...this.deliveryOrdersList];
  }

  public async createDeliveryOrder(data: Omit<DeliveryOrder, 'id' | 'created_at'>): Promise<DeliveryOrder> {
    const id = `do-${Date.now()}`;
    const newDO: DeliveryOrder = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };

    this.deliveryOrdersList.unshift(newDO);
    this.notifyListeners();

    try {
      await setDoc(doc(firestoreDb, 'delivery_orders', id), newDO);
    } catch (err) {
      console.warn('Firestore write error (createDeliveryOrder):', err);
    }

    return newDO;
  }

  public async updateDeliveryOrder(id: string, updates: Partial<DeliveryOrder>): Promise<DeliveryOrder> {
    const index = this.deliveryOrdersList.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Delivery order tidak ditemukan.');

    const updated = { ...this.deliveryOrdersList[index], ...updates };
    this.deliveryOrdersList[index] = updated;
    this.notifyListeners();

    try {
      await updateDoc(doc(firestoreDb, 'delivery_orders', id), updates as Record<string, any>);
    } catch (err) {
      console.warn('Firestore write error (updateDeliveryOrder):', err);
    }

    return updated;
  }

  // ==========================================
  // OPERATIONAL STATS
  // ==========================================
  public async getOperationalStats(): Promise<OperationalStats> {
    const totalContainers = this.containers.length;
    const containersInYard = this.containers.filter(
      (c) => c.status === 'In Yard' || c.status === 'Gate In' || c.status === 'Discharged'
    ).length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const gateInToday = this.gateInList.filter((g) => g.date_time.startsWith(todayStr)).length;
    const gateOutToday = this.gateOutList.filter((g) => g.date_time.startsWith(todayStr)).length;

    const containersLoaded = this.loadingList.length;
    const containersDischarged = this.unloadingList.length;
    const activeVessels = this.vessels.filter((v) => v.status === 'Berthed' || v.status === 'Operation' || v.status === 'Arrived').length;

    const totalYardCapacity = this.yardLocations.length || 80;
    const yardOccupancyRate = totalYardCapacity > 0 ? Math.min(100, Math.round((containersInYard / totalYardCapacity) * 100)) : 0;

    return {
      totalContainers,
      containersInYard,
      gateInToday,
      gateOutToday,
      containersLoaded,
      containersDischarged,
      activeVessels,
      yardOccupancyRate,
      totalYardCapacity,
    };
  }

  public async getStats(): Promise<OperationalStats> {
    return this.getOperationalStats();
  }

  public async getGateInList(): Promise<GateInTransaction[]> {
    return this.getGateInTransactions();
  }

  public async getGateOutList(): Promise<GateOutTransaction[]> {
    return this.getGateOutTransactions();
  }
}

export const db = new FirebaseFirestoreDatabaseStore();
