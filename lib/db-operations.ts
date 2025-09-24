// Mock database operations that simulate Prisma calls
// In a real application, these would use the actual Prisma client

import {
  Commodity,
  Trade,
  InventoryItem,
  Shipment,
  Counterparty,
  Contract,
  mockCommodities,
  mockTrades,
  mockInventory,
  mockShipments,
  mockCounterparties,
  mockContracts,
} from "./mock-data";

// Trade operations
export async function createTrade(data: Omit<Trade, "id" | "totalValue">) {
  console.log("here");
  const newTrade: Trade = {
    ...data,
    id: `T${String(Date.now()).slice(-6)}`,
    totalValue: data.quantity * data.price,
  };

  // In real app: await prisma.trade.create({ data: newTrade })
  mockTrades.unshift(newTrade);
  console.log(mockTrades);
  return newTrade;
}

export async function updateTrade(id: string, data: Partial<Trade>) {
  const index = mockTrades.findIndex((t) => t.id === id);
  if (index !== -1) {
    mockTrades[index] = { ...mockTrades[index], ...data };
    if (data.quantity || data.price) {
      mockTrades[index].totalValue =
        mockTrades[index].quantity * mockTrades[index].price;
    }
    return mockTrades[index];
  }
  throw new Error("Trade not found");
}

export async function deleteTrade(id: string) {
  const index = mockTrades.findIndex((t) => t.id === id);
  if (index !== -1) {
    const deleted = mockTrades.splice(index, 1)[0];
    return deleted;
  }
  throw new Error("Trade not found");
}

// Inventory operations
export async function createInventoryItem(data: Omit<InventoryItem, "id">) {
  const newItem: InventoryItem = {
    ...data,
    id: `I${String(Date.now()).slice(-6)}`,
  };

  // In real app: await prisma.inventoryItem.create({ data: newItem })
  mockInventory.unshift(newItem);
  return newItem;
}

export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryItem>,
) {
  const index = mockInventory.findIndex((i) => i.id === id);
  if (index !== -1) {
    mockInventory[index] = { ...mockInventory[index], ...data };
    return mockInventory[index];
  }
  throw new Error("Inventory item not found");
}

export async function deleteInventoryItem(id: string) {
  const index = mockInventory.findIndex((i) => i.id === id);
  if (index !== -1) {
    const deleted = mockInventory.splice(index, 1)[0];
    return deleted;
  }
  throw new Error("Inventory item not found");
}

// Contract operations
export async function createContract(
  data: Omit<Contract, "id" | "totalValue" | "remaining">,
) {
  const newContract: Contract = {
    ...data,
    id: `CON${String(Date.now()).slice(-6)}`,
    totalValue: data.quantity * data.price,
    remaining: data.quantity,
  };

  mockContracts.unshift(newContract);
  return newContract;
}

export async function updateContract(id: string, data: Partial<Contract>) {
  const index = mockContracts.findIndex((c) => c.id === id);
  if (index !== -1) {
    mockContracts[index] = { ...mockContracts[index], ...data };
    if (data.quantity || data.price) {
      mockContracts[index].totalValue =
        mockContracts[index].quantity * mockContracts[index].price;
    }
    if (data.executed !== undefined) {
      mockContracts[index].remaining =
        mockContracts[index].quantity - data.executed;
    }
    return mockContracts[index];
  }
  throw new Error("Contract not found");
}

// Shipment operations
export async function createShipment(data: Omit<Shipment, "id">) {
  const newShipment: Shipment = {
    ...data,
    id: `S${String(Date.now()).slice(-6)}`,
  };

  mockShipments.unshift(newShipment);
  return newShipment;
}

export async function updateShipment(id: string, data: Partial<Shipment>) {
  const index = mockShipments.findIndex((s) => s.id === id);
  if (index !== -1) {
    mockShipments[index] = { ...mockShipments[index], ...data };
    return mockShipments[index];
  }
  throw new Error("Shipment not found");
}

// Counterparty operations
export async function createCounterparty(data: Omit<Counterparty, "id">) {
  const newCounterparty: Counterparty = {
    ...data,
    id: `C${String(Date.now()).slice(-6)}`,
  };

  mockCounterparties.unshift(newCounterparty);
  return newCounterparty;
}

export async function updateCounterparty(
  id: string,
  data: Partial<Counterparty>,
) {
  const index = mockCounterparties.findIndex((c) => c.id === id);
  if (index !== -1) {
    mockCounterparties[index] = { ...mockCounterparties[index], ...data };
    return mockCounterparties[index];
  }
  throw new Error("Counterparty not found");
}
