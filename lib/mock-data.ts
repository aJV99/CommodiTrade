// Mock data functions to simulate database operations
export interface Commodity {
  id: string;
  name: string;
  type: 'Agricultural' | 'Energy' | 'Metals' | 'Livestock';
  unit: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
}

export interface Trade {
  id: string;
  commodityId: string;
  commodity: string;
  type: 'Buy' | 'Sell';
  quantity: number;
  price: number;
  totalValue: number;
  counterparty: string;
  status: 'Open' | 'Executed' | 'Settled' | 'Cancelled';
  tradeDate: string;
  settlementDate: string;
  location: string;
}

export interface InventoryItem {
  id: string;
  commodity: string;
  quantity: number;
  unit: string;
  warehouse: string;
  location: string;
  quality: string;
  lastUpdated: string;
  costBasis: number;
  marketValue: number;
}

export interface Shipment {
  id: string;
  tradeId: string;
  commodity: string;
  quantity: number;
  origin: string;
  destination: string;
  status: 'Preparing' | 'In Transit' | 'Delivered' | 'Delayed';
  departureDate: string;
  expectedArrival: string;
  actualArrival?: string;
  carrier: string;
  trackingNumber: string;
}

export interface Counterparty {
  id: string;
  name: string;
  type: 'Supplier' | 'Customer' | 'Both';
  country: string;
  creditLimit: number;
  creditUsed: number;
  rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B';
  totalTrades: number;
  totalVolume: number;
  lastTradeDate: string;
  contactPerson: string;
  email: string;
  phone: string;
}

export interface Contract {
  id: string;
  commodity: string;
  counterparty: string;
  type: 'Purchase' | 'Sale';
  quantity: number;
  price: number;
  totalValue: number;
  startDate: string;
  endDate: string;
  deliveryTerms: string;
  paymentTerms: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  executed: number;
  remaining: number;
}

// Mock data
export const mockCommodities: Commodity[] = [
  { id: '1', name: 'Wheat', type: 'Agricultural', unit: 'MT', currentPrice: 285.50, priceChange: 12.30, priceChangePercent: 4.5 },
  { id: '2', name: 'Crude Oil', type: 'Energy', unit: 'BBL', currentPrice: 78.45, priceChange: -2.15, priceChangePercent: -2.7 },
  { id: '3', name: 'Gold', type: 'Metals', unit: 'OZ', currentPrice: 2034.70, priceChange: 15.80, priceChangePercent: 0.8 },
  { id: '4', name: 'Copper', type: 'Metals', unit: 'LB', currentPrice: 3.89, priceChange: 0.07, priceChangePercent: 1.8 },
  { id: '5', name: 'Corn', type: 'Agricultural', unit: 'BU', currentPrice: 6.75, priceChange: -0.12, priceChangePercent: -1.7 },
  { id: '6', name: 'Natural Gas', type: 'Energy', unit: 'MMBTU', currentPrice: 2.85, priceChange: 0.18, priceChangePercent: 6.7 },
  { id: '7', name: 'Silver', type: 'Metals', unit: 'OZ', currentPrice: 25.40, priceChange: 0.95, priceChangePercent: 3.9 },
  { id: '8', name: 'Soybeans', type: 'Agricultural', unit: 'BU', currentPrice: 14.25, priceChange: 0.45, priceChangePercent: 3.3 },
];

export const mockTrades: Trade[] = [
  { id: 'T001', commodityId: '1', commodity: 'Wheat', type: 'Buy', quantity: 1000, price: 285.50, totalValue: 285500, counterparty: 'Global Grains Ltd', status: 'Executed', tradeDate: '2024-01-15', settlementDate: '2024-01-20', location: 'Chicago' },
  { id: 'T002', commodityId: '2', commodity: 'Crude Oil', type: 'Sell', quantity: 500, price: 78.45, totalValue: 39225, counterparty: 'Energy Corp', status: 'Open', tradeDate: '2024-01-14', settlementDate: '2024-01-19', location: 'Houston' },
  { id: 'T003', commodityId: '3', commodity: 'Gold', type: 'Buy', quantity: 100, price: 2034.70, totalValue: 203470, counterparty: 'Precious Metals Inc', status: 'Settled', tradeDate: '2024-01-13', settlementDate: '2024-01-18', location: 'New York' },
  { id: 'T004', commodityId: '4', commodity: 'Copper', type: 'Sell', quantity: 2000, price: 3.89, totalValue: 7780, counterparty: 'Industrial Metals Co', status: 'Executed', tradeDate: '2024-01-12', settlementDate: '2024-01-17', location: 'London' },
  { id: 'T005', commodityId: '5', commodity: 'Corn', type: 'Buy', quantity: 1500, price: 6.75, totalValue: 10125, counterparty: 'Agri Partners', status: 'Open', tradeDate: '2024-01-11', settlementDate: '2024-01-16', location: 'Chicago' },
];

export const mockInventory: InventoryItem[] = [
  { id: 'I001', commodity: 'Wheat', quantity: 5000, unit: 'MT', warehouse: 'Warehouse A', location: 'Chicago', quality: 'Grade A', lastUpdated: '2024-01-15', costBasis: 280.00, marketValue: 285.50 },
  { id: 'I002', commodity: 'Corn', quantity: 3000, unit: 'BU', warehouse: 'Warehouse B', location: 'Chicago', quality: 'Grade 1', lastUpdated: '2024-01-14', costBasis: 6.50, marketValue: 6.75 },
  { id: 'I003', commodity: 'Copper', quantity: 1000, unit: 'LB', warehouse: 'Warehouse C', location: 'London', quality: 'Grade A', lastUpdated: '2024-01-13', costBasis: 3.75, marketValue: 3.89 },
  { id: 'I004', commodity: 'Gold', quantity: 50, unit: 'OZ', warehouse: 'Vault A', location: 'New York', quality: '99.9%', lastUpdated: '2024-01-12', costBasis: 2000.00, marketValue: 2034.70 },
  { id: 'I005', commodity: 'Soybeans', quantity: 2500, unit: 'BU', warehouse: 'Warehouse D', location: 'Chicago', quality: 'Grade 1', lastUpdated: '2024-01-11', costBasis: 13.80, marketValue: 14.25 },
];

export const mockShipments: Shipment[] = [
  { id: 'S001', tradeId: 'T001', commodity: 'Wheat', quantity: 1000, origin: 'Chicago', destination: 'New York', status: 'In Transit', departureDate: '2024-01-16', expectedArrival: '2024-01-18', carrier: 'Rail Express', trackingNumber: 'RE123456' },
  { id: 'S002', tradeId: 'T003', commodity: 'Gold', quantity: 100, origin: 'London', destination: 'New York', status: 'Delivered', departureDate: '2024-01-14', expectedArrival: '2024-01-15', actualArrival: '2024-01-15', carrier: 'Secure Transport', trackingNumber: 'ST789012' },
  { id: 'S003', tradeId: 'T004', commodity: 'Copper', quantity: 2000, origin: 'Chile', destination: 'London', status: 'Preparing', departureDate: '2024-01-20', expectedArrival: '2024-02-05', carrier: 'Ocean Freight', trackingNumber: 'OF345678' },
  { id: 'S004', tradeId: 'T005', commodity: 'Corn', quantity: 1500, origin: 'Iowa', destination: 'Chicago', status: 'In Transit', departureDate: '2024-01-17', expectedArrival: '2024-01-19', carrier: 'Truck Lines', trackingNumber: 'TL901234' },
];

export const mockCounterparties: Counterparty[] = [
  { id: 'C001', name: 'Global Grains Ltd', type: 'Supplier', country: 'USA', creditLimit: 1000000, creditUsed: 285500, rating: 'AA', totalTrades: 45, totalVolume: 25000, lastTradeDate: '2024-01-15', contactPerson: 'John Smith', email: 'john@globalgrains.com', phone: '+1-555-0101' },
  { id: 'C002', name: 'Energy Corp', type: 'Customer', country: 'USA', creditLimit: 2000000, creditUsed: 750000, rating: 'AAA', totalTrades: 67, totalVolume: 50000, lastTradeDate: '2024-01-14', contactPerson: 'Sarah Johnson', email: 'sarah@energycorp.com', phone: '+1-555-0102' },
  { id: 'C003', name: 'Precious Metals Inc', type: 'Both', country: 'UK', creditLimit: 5000000, creditUsed: 1200000, rating: 'AA', totalTrades: 23, totalVolume: 5000, lastTradeDate: '2024-01-13', contactPerson: 'David Brown', email: 'david@preciousmetals.co.uk', phone: '+44-20-1234-5678' },
  { id: 'C004', name: 'Industrial Metals Co', type: 'Customer', country: 'Germany', creditLimit: 1500000, creditUsed: 420000, rating: 'A', totalTrades: 34, totalVolume: 15000, lastTradeDate: '2024-01-12', contactPerson: 'Hans Mueller', email: 'hans@industrialmetals.de', phone: '+49-30-1234-5678' },
  { id: 'C005', name: 'Agri Partners', type: 'Supplier', country: 'Canada', creditLimit: 800000, creditUsed: 156000, rating: 'AA', totalTrades: 28, totalVolume: 18000, lastTradeDate: '2024-01-11', contactPerson: 'Marie Dubois', email: 'marie@agripartners.ca', phone: '+1-416-555-0103' },
];

export const mockContracts: Contract[] = [
  { id: 'CON001', commodity: 'Wheat', counterparty: 'Global Grains Ltd', type: 'Purchase', quantity: 5000, price: 285.50, totalValue: 1427500, startDate: '2024-01-01', endDate: '2024-12-31', deliveryTerms: 'FOB Chicago', paymentTerms: 'Net 30', status: 'Active', executed: 1000, remaining: 4000 },
  { id: 'CON002', commodity: 'Crude Oil', counterparty: 'Energy Corp', type: 'Sale', quantity: 10000, price: 78.45, totalValue: 784500, startDate: '2024-01-01', endDate: '2024-06-30', deliveryTerms: 'FOB Houston', paymentTerms: 'Net 15', status: 'Active', executed: 2500, remaining: 7500 },
  { id: 'CON003', commodity: 'Copper', counterparty: 'Industrial Metals Co', type: 'Sale', quantity: 8000, price: 3.89, totalValue: 31120, startDate: '2023-07-01', endDate: '2024-06-30', deliveryTerms: 'CIF London', paymentTerms: 'Net 30', status: 'Active', executed: 6000, remaining: 2000 },
  { id: 'CON004', commodity: 'Corn', counterparty: 'Agri Partners', type: 'Purchase', quantity: 15000, price: 6.75, totalValue: 101250, startDate: '2024-01-01', endDate: '2024-12-31', deliveryTerms: 'FOB Chicago', paymentTerms: 'Net 45', status: 'Active', executed: 1500, remaining: 13500 },
];

// Mock API functions
export async function getCommodities(): Promise<Commodity[]> {
  return Promise.resolve(mockCommodities);
}

export async function getTrades(): Promise<Trade[]> {
  return Promise.resolve(mockTrades);
}

export async function getInventory(): Promise<InventoryItem[]> {
  return Promise.resolve(mockInventory);
}

export async function getShipments(): Promise<Shipment[]> {
  return Promise.resolve(mockShipments);
}

export async function getCounterparties(): Promise<Counterparty[]> {
  return Promise.resolve(mockCounterparties);
}

export async function getContracts(): Promise<Contract[]> {
  return Promise.resolve(mockContracts);
}

export async function getDashboardStats() {
  return Promise.resolve({
    totalPortfolioValue: 2450000,
    totalTrades: mockTrades.length,
    activeTrades: mockTrades.filter(t => t.status === 'Open').length,
    totalInventoryValue: mockInventory.reduce((sum, item) => sum + (item.quantity * item.marketValue), 0),
    pendingShipments: mockShipments.filter(s => s.status !== 'Delivered').length,
    topPerformingCommodity: 'Natural Gas',
    totalCounterparties: mockCounterparties.length,
    activeContracts: mockContracts.filter(c => c.status === 'Active').length,
  });
}