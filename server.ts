import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
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
} from './src/lib/seedData';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'terminal_db.json');

// Realtime Server-Sent Events (SSE) Client Pool
const sseClients = new Set<Response>();

function broadcastRealtimeEvent(event: Record<string, unknown>) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  });
}

// Server-side State
interface TerminalState {
  containers: typeof initialContainers;
  vessels: typeof initialVessels;
  customers: typeof initialCustomers;
  ports: typeof initialPorts;
  yardLocations: typeof initialYardLocations;
  containerTypes: typeof initialContainerTypes;
  gateInList: typeof initialGateIn;
  gateOutList: typeof initialGateOut;
  yardMovementsList: typeof initialYardMovements;
  loadingList: typeof initialLoadingOperations;
  unloadingList: typeof initialUnloadingOperations;
  deliveryOrdersList: typeof initialDeliveryOrders;
  lastUpdated: string;
}

function getInitialState(): TerminalState {
  return {
    containers: JSON.parse(JSON.stringify(initialContainers)),
    vessels: JSON.parse(JSON.stringify(initialVessels)),
    customers: JSON.parse(JSON.stringify(initialCustomers)),
    ports: JSON.parse(JSON.stringify(initialPorts)),
    yardLocations: JSON.parse(JSON.stringify(initialYardLocations)),
    containerTypes: JSON.parse(JSON.stringify(initialContainerTypes)),
    gateInList: JSON.parse(JSON.stringify(initialGateIn)),
    gateOutList: JSON.parse(JSON.stringify(initialGateOut)),
    yardMovementsList: JSON.parse(JSON.stringify(initialYardMovements)),
    loadingList: JSON.parse(JSON.stringify(initialLoadingOperations)),
    unloadingList: JSON.parse(JSON.stringify(initialUnloadingOperations)),
    deliveryOrdersList: JSON.parse(JSON.stringify(initialDeliveryOrders)),
    lastUpdated: new Date().toISOString(),
  };
}

let dbState: TerminalState = loadState();

function loadState(): TerminalState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.containers)) {
        return parsed as TerminalState;
      }
    }
  } catch (err) {
    console.warn('Could not read terminal_db.json, creating fresh state:', err);
  }
  const state = getInitialState();
  saveState(state);
  return state;
}

function saveState(state: TerminalState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save terminal_db.json:', err);
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Heartbeat for SSE clients every 15s to keep connections healthy across mobile/desktop
  setInterval(() => {
    sseClients.forEach((client) => {
      try {
        client.write(': keep-alive ping\n\n');
      } catch {
        sseClients.delete(client);
      }
    });
  }, 15000);

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'HAI CONTAINER Terminal Operating System Backend',
      timestamp: new Date().toISOString(),
      activeClients: sseClients.size,
      containersCount: dbState.containers.length,
    });
  });

  // SSE Realtime Stream Endpoint
  app.get('/api/realtime', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', activeClients: sseClients.size + 1, timestamp: Date.now() })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Get full current database state
  app.get('/api/state', (_req: Request, res: Response) => {
    res.json(dbState);
  });

  // Mutate database state and broadcast to ALL connected devices
  app.post('/api/mutate', (req: Request, res: Response) => {
    try {
      const { action, payload, clientId } = req.body;

      if (!action) {
        return res.status(400).json({ success: false, error: 'Action parameter is required' });
      }

      let result: unknown = null;

      switch (action) {
        case 'RESET_TO_SEED': {
          dbState = getInitialState();
          saveState(dbState);
          result = { message: 'Database reset to initial seed' };
          break;
        }

        case 'PROCESS_GATE_IN': {
          const { container_number, truck_number, driver, seal_number, condition, customer_name, destination, assigned_yard_location, notes, size, type, weight } = payload;
          const cleanNo = container_number.toUpperCase().trim();

          // Free or check destination slot
          const slot = dbState.yardLocations.find((l) => l.location_code === assigned_yard_location);
          if (slot) {
            slot.status = 'Occupied';
            slot.container_number = cleanNo;
          }

          // Update or add container
          let cnt = dbState.containers.find((c) => c.container_number === cleanNo);
          if (cnt) {
            cnt.status = 'In Yard';
            cnt.location = assigned_yard_location || 'Yard Block A';
            cnt.seal_number = seal_number || cnt.seal_number;
            if (weight) cnt.weight = weight;
          } else {
            cnt = {
              id: `cnt-${Date.now()}`,
              container_number: cleanNo,
              iso_code: size === '20' ? '22G1' : '42G1',
              size: size || '40',
              type: type || 'Dry',
              owner: customer_name || 'PT Samudera Logistik',
              weight: weight || 24000,
              status: 'In Yard',
              location: assigned_yard_location || 'Yard Block A',
              seal_number: seal_number || 'SL-000000',
              created_at: new Date().toISOString(),
            };
            dbState.containers.unshift(cnt);
          }

          const today = new Date();
          const datePrefix = `GI-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
          const count = dbState.gateInList.filter((g) => g.transaction_number.startsWith(datePrefix)).length + 1;
          const transaction_number = `${datePrefix}-${count.toString().padStart(4, '0')}`;

          const newGateIn = {
            id: `gi-${Date.now()}`,
            transaction_number,
            container_number: cleanNo,
            truck_number: truck_number.toUpperCase().trim(),
            driver: driver.trim(),
            date_time: new Date().toISOString(),
            customer_id: payload.customer_id || 'cust-1',
            customer_name: customer_name || 'Customer',
            condition: condition || 'Good',
            seal_number: seal_number || '',
            destination: destination || 'Yard',
            status: 'Completed' as const,
            assigned_yard_location: assigned_yard_location || 'A-01-01-1',
            notes: notes || '',
            created_at: new Date().toISOString(),
          };
          dbState.gateInList.unshift(newGateIn);
          result = newGateIn;
          break;
        }

        case 'PROCESS_GATE_OUT': {
          const { container_number, truck_number, driver, destination, do_number, notes } = payload;
          const cleanNo = container_number.toUpperCase().trim();

          const cnt = dbState.containers.find((c) => c.container_number === cleanNo);
          if (cnt) {
            // Free slot
            if (cnt.location && cnt.location.includes('-')) {
              const loc = dbState.yardLocations.find((l) => l.location_code === cnt.location);
              if (loc) {
                loc.status = 'Available';
                loc.container_number = undefined;
              }
            }
            cnt.status = 'Gate Out';
            cnt.location = 'Keluar Terminal';
          }

          if (do_number) {
            const d = dbState.deliveryOrdersList.find((item) => item.do_number === do_number);
            if (d) d.status = 'Used';
          }

          const today = new Date();
          const datePrefix = `GO-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
          const count = dbState.gateOutList.filter((g) => g.transaction_number.startsWith(datePrefix)).length + 1;
          const transaction_number = `${datePrefix}-${count.toString().padStart(4, '0')}`;

          const newGateOut = {
            id: `go-${Date.now()}`,
            transaction_number,
            container_number: cleanNo,
            truck_number: truck_number.toUpperCase().trim(),
            driver: driver.trim(),
            date_time: new Date().toISOString(),
            destination: destination || 'Depo Marunda Logistics Hub',
            do_number: do_number || undefined,
            status: 'Completed' as const,
            notes: notes || '',
            created_at: new Date().toISOString(),
          };
          dbState.gateOutList.unshift(newGateOut);
          result = newGateOut;
          break;
        }

        case 'PROCESS_YARD_MOVEMENT': {
          const { container_number, destination_location, equipment, operator, notes } = payload;
          const cleanNo = container_number.toUpperCase().trim();
          const destLoc = destination_location.trim();

          const cnt = dbState.containers.find((c) => c.container_number === cleanNo);
          if (!cnt) throw new Error(`Peti kemas ${cleanNo} tidak ditemukan.`);

          const origin = cnt.location;

          // Free old slot
          if (origin && origin.includes('-')) {
            const oldSlot = dbState.yardLocations.find((l) => l.location_code === origin);
            if (oldSlot) {
              oldSlot.status = 'Available';
              oldSlot.container_number = undefined;
            }
          }

          // Occupy new slot
          const newSlot = dbState.yardLocations.find((l) => l.location_code === destLoc);
          if (newSlot) {
            newSlot.status = 'Occupied';
            newSlot.container_number = cleanNo;
          }

          cnt.location = destLoc;
          cnt.status = 'In Yard';

          const today = new Date();
          const datePrefix = `YM-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
          const count = dbState.yardMovementsList.filter((m) => m.movement_number.startsWith(datePrefix)).length + 1;
          const movement_number = `${datePrefix}-${count.toString().padStart(4, '0')}`;

          const newMv = {
            id: `ym-${Date.now()}`,
            movement_number,
            container_number: cleanNo,
            origin_location: origin,
            destination_location: destLoc,
            equipment: equipment || 'RTG Crane 01',
            operator: operator || 'Operator',
            date_time: new Date().toISOString(),
            status: 'Completed' as const,
            notes: notes || '',
            created_at: new Date().toISOString(),
          };
          dbState.yardMovementsList.unshift(newMv);
          result = newMv;
          break;
        }

        case 'PROCESS_LOADING': {
          const { vessel_name, container_number, crane, operator, position } = payload;
          const cleanNo = container_number.toUpperCase().trim();

          const cnt = dbState.containers.find((c) => c.container_number === cleanNo);
          if (cnt) {
            if (cnt.location && cnt.location.includes('-')) {
              const oldSlot = dbState.yardLocations.find((l) => l.location_code === cnt.location);
              if (oldSlot) {
                oldSlot.status = 'Available';
                oldSlot.container_number = undefined;
              }
            }
            cnt.status = 'On Vessel';
            cnt.location = `${vessel_name} - ${position}`;
          }

          const today = new Date();
          const datePrefix = `LD-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
          const count = dbState.loadingList.filter((l) => l.loading_number.startsWith(datePrefix)).length + 1;
          const loading_number = `${datePrefix}-${count.toString().padStart(4, '0')}`;

          const newLoad = {
            id: `ld-${Date.now()}`,
            loading_number,
            vessel_id: payload.vessel_id || 'v-1',
            vessel_name,
            container_number: cleanNo,
            crane: crane || 'Quay Crane 01',
            operator: operator || 'Crane Operator',
            position: position || 'Deck',
            date_time: new Date().toISOString(),
            status: 'Completed' as const,
            created_at: new Date().toISOString(),
          };
          dbState.loadingList.unshift(newLoad);
          result = newLoad;
          break;
        }

        case 'PROCESS_UNLOADING': {
          const { vessel_name, container_number, crane, operator, position, destination_yard_location } = payload;
          const cleanNo = container_number.toUpperCase().trim();
          const targetSlot = destination_yard_location || position || 'A-01-01-1';

          const slot = dbState.yardLocations.find((l) => l.location_code === targetSlot);
          if (slot) {
            slot.status = 'Occupied';
            slot.container_number = cleanNo;
          }

          let cnt = dbState.containers.find((c) => c.container_number === cleanNo);
          if (cnt) {
            cnt.status = 'Discharged';
            cnt.location = targetSlot;
          } else {
            cnt = {
              id: `cnt-${Date.now()}`,
              container_number: cleanNo,
              iso_code: '42G1',
              size: '40',
              type: 'Dry',
              owner: 'Shipping Line',
              weight: 22000,
              status: 'Discharged',
              location: targetSlot,
              seal_number: `SL-${Math.floor(100000 + Math.random() * 900000)}`,
              created_at: new Date().toISOString(),
            };
            dbState.containers.unshift(cnt);
          }

          const today = new Date();
          const datePrefix = `ULD-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
          const count = dbState.unloadingList.filter((u) => u.unloading_number.startsWith(datePrefix)).length + 1;
          const unloading_number = `${datePrefix}-${count.toString().padStart(4, '0')}`;

          const newUnload = {
            id: `uld-${Date.now()}`,
            unloading_number,
            vessel_id: payload.vessel_id || 'v-1',
            vessel_name,
            container_number: cleanNo,
            crane: crane || 'Quay Crane 02',
            operator: operator || 'Crane Operator',
            position: targetSlot,
            date_time: new Date().toISOString(),
            status: 'Completed' as const,
            created_at: new Date().toISOString(),
          };
          dbState.unloadingList.unshift(newUnload);
          result = newUnload;
          break;
        }

        case 'CREATE_CONTAINER': {
          const cleanNo = payload.container_number.toUpperCase().trim();
          if (dbState.containers.some((c) => c.container_number === cleanNo)) {
            throw new Error(`Nomor kontainer ${cleanNo} sudah terdaftar.`);
          }
          const newCnt = {
            ...payload,
            id: `cnt-${Date.now()}`,
            container_number: cleanNo,
            created_at: new Date().toISOString(),
          };
          if (newCnt.location && newCnt.location.includes('-')) {
            const loc = dbState.yardLocations.find((l) => l.location_code === newCnt.location);
            if (loc) {
              loc.status = 'Occupied';
              loc.container_number = cleanNo;
            }
          }
          dbState.containers.unshift(newCnt);
          result = newCnt;
          break;
        }

        case 'UPDATE_CONTAINER': {
          const idx = dbState.containers.findIndex((c) => c.id === payload.id);
          if (idx === -1) throw new Error('Kontainer tidak ditemukan.');
          dbState.containers[idx] = { ...dbState.containers[idx], ...payload.updates };
          result = dbState.containers[idx];
          break;
        }

        case 'DELETE_CONTAINER': {
          const toDelete = dbState.containers.find((c) => c.id === payload.id);
          if (toDelete && toDelete.location && toDelete.location.includes('-')) {
            const loc = dbState.yardLocations.find((l) => l.location_code === toDelete.location);
            if (loc) {
              loc.status = 'Available';
              loc.container_number = undefined;
            }
          }
          dbState.containers = dbState.containers.filter((c) => c.id !== payload.id);
          result = { id: payload.id };
          break;
        }

        case 'CREATE_VESSEL': {
          const newVessel = {
            ...payload,
            id: `vsl-${Date.now()}`,
            created_at: new Date().toISOString(),
          };
          dbState.vessels.unshift(newVessel);
          result = newVessel;
          break;
        }

        case 'UPDATE_VESSEL': {
          const idx = dbState.vessels.findIndex((v) => v.id === payload.id);
          if (idx === -1) throw new Error('Kapal tidak ditemukan.');
          dbState.vessels[idx] = { ...dbState.vessels[idx], ...payload.updates };
          result = dbState.vessels[idx];
          break;
        }

        case 'DELETE_VESSEL': {
          dbState.vessels = dbState.vessels.filter((v) => v.id !== payload.id);
          result = { id: payload.id };
          break;
        }

        case 'CREATE_CUSTOMER': {
          const newCust = {
            ...payload,
            id: `cst-${Date.now()}`,
            created_at: new Date().toISOString(),
          };
          dbState.customers.unshift(newCust);
          result = newCust;
          break;
        }

        case 'UPDATE_CUSTOMER': {
          const idx = dbState.customers.findIndex((c) => c.id === payload.id);
          if (idx === -1) throw new Error('Customer tidak ditemukan.');
          dbState.customers[idx] = { ...dbState.customers[idx], ...payload.updates };
          result = dbState.customers[idx];
          break;
        }

        case 'DELETE_CUSTOMER': {
          dbState.customers = dbState.customers.filter((c) => c.id !== payload.id);
          result = { id: payload.id };
          break;
        }

        case 'CREATE_PORT': {
          const newPort = {
            ...payload,
            id: `prt-${Date.now()}`,
            created_at: new Date().toISOString(),
          };
          dbState.ports.unshift(newPort);
          result = newPort;
          break;
        }

        case 'UPDATE_PORT': {
          const idx = dbState.ports.findIndex((p) => p.id === payload.id);
          if (idx === -1) throw new Error('Pelabuhan tidak ditemukan.');
          dbState.ports[idx] = { ...dbState.ports[idx], ...payload.updates };
          result = dbState.ports[idx];
          break;
        }

        case 'DELETE_PORT': {
          dbState.ports = dbState.ports.filter((p) => p.id !== payload.id);
          result = { id: payload.id };
          break;
        }

        case 'CREATE_YARD_LOCATION': {
          const newLoc = {
            ...payload,
            id: `yd-${Date.now()}`,
          };
          dbState.yardLocations.push(newLoc);
          result = newLoc;
          break;
        }

        case 'UPDATE_YARD_LOCATION': {
          const idx = dbState.yardLocations.findIndex((l) => l.id === payload.id);
          if (idx === -1) throw new Error('Slot yard tidak ditemukan.');
          dbState.yardLocations[idx] = { ...dbState.yardLocations[idx], ...payload.updates };
          result = dbState.yardLocations[idx];
          break;
        }

        case 'DELETE_YARD_LOCATION': {
          dbState.yardLocations = dbState.yardLocations.filter((l) => l.id !== payload.id);
          result = { id: payload.id };
          break;
        }

        case 'CREATE_CONTAINER_TYPE': {
          const newType = {
            ...payload,
            id: `ct-${Date.now()}`,
          };
          dbState.containerTypes.push(newType);
          result = newType;
          break;
        }

        case 'UPDATE_CONTAINER_TYPE': {
          const idx = dbState.containerTypes.findIndex((t) => t.id === payload.id);
          if (idx === -1) throw new Error('Tipe kontainer tidak ditemukan.');
          dbState.containerTypes[idx] = { ...dbState.containerTypes[idx], ...payload.updates };
          result = dbState.containerTypes[idx];
          break;
        }

        case 'DELETE_CONTAINER_TYPE': {
          dbState.containerTypes = dbState.containerTypes.filter((t) => t.id !== payload.id);
          result = { id: payload.id };
          break;
        }

        case 'CREATE_DELIVERY_ORDER': {
          const newDO = {
            ...payload,
            id: `do-${Date.now()}`,
            created_at: new Date().toISOString(),
          };
          dbState.deliveryOrdersList.unshift(newDO);
          result = newDO;
          break;
        }

        case 'UPDATE_DO_STATUS': {
          const idx = dbState.deliveryOrdersList.findIndex((d) => d.id === payload.id);
          if (idx === -1) throw new Error('Delivery Order tidak ditemukan.');
          dbState.deliveryOrdersList[idx].status = payload.status;
          result = dbState.deliveryOrdersList[idx];
          break;
        }

        default:
          return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
      }

      dbState.lastUpdated = new Date().toISOString();
      saveState(dbState);

      // Broadcast mutation to ALL connected devices
      broadcastRealtimeEvent({
        type: 'DATABASE_MUTATION',
        action,
        sourceClientId: clientId || 'anonymous',
        timestamp: Date.now(),
        lastUpdated: dbState.lastUpdated,
      });

      res.json({ success: true, result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HAI CONTAINER] Full-Stack TOS Server listening on port ${PORT}`);
  });
}

startServer();
