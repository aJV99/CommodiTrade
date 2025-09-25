import { beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import {
  applySellLotMovements,
  type InventoryMovementExecutor,
} from "../trades.js";

describe("applySellLotMovements", () => {
  let movementExecutorMock: ReturnType<typeof mock.fn>;
  let movementExecutor: InventoryMovementExecutor;
  beforeEach(() => {
    movementExecutorMock = mock.fn(
      async (..._args: Parameters<InventoryMovementExecutor>) => undefined,
    );
    movementExecutor =
      movementExecutorMock as unknown as InventoryMovementExecutor;
  });

  it("allocates across multiple lots until the trade quantity is satisfied", async () => {
    const trade = { id: "trade-123", quantity: 120, price: 15 };
    const candidateLots = [
      { id: "lot-1", quantity: 80 },
      { id: "lot-2", quantity: 50 },
      { id: "lot-3", quantity: 25 },
    ];

    await applySellLotMovements(trade, candidateLots, movementExecutor, undefined);

    assert.equal(movementExecutorMock.mock.calls.length, 2);

    const firstCall = movementExecutorMock.mock.calls[0].arguments;
    assert.deepStrictEqual(firstCall[0], {
      inventoryId: "lot-1",
      type: "OUT",
      quantity: 80,
      reason: "Trade trade-123 execution",
      referenceType: "TRADE",
      referenceId: "trade-123",
      unitMarketValue: 15,
    });
    assert.strictEqual(firstCall[1], undefined);

    const secondCall = movementExecutorMock.mock.calls[1].arguments;
    assert.deepStrictEqual(secondCall[0], {
      inventoryId: "lot-2",
      type: "OUT",
      quantity: 40,
      reason: "Trade trade-123 execution",
      referenceType: "TRADE",
      referenceId: "trade-123",
      unitMarketValue: 15,
    });
    assert.strictEqual(secondCall[1], undefined);
  });

  it("ignores lots that have no remaining quantity", async () => {
    const trade = { id: "trade-789", quantity: 30, price: 22 };
    const candidateLots = [
      { id: "empty-lot", quantity: 0 },
      { id: "partial-lot", quantity: 30 },
    ];

    await applySellLotMovements(trade, candidateLots, movementExecutor, undefined);

    assert.equal(movementExecutorMock.mock.calls.length, 1);
    const call = movementExecutorMock.mock.calls[0].arguments;
    assert.deepStrictEqual(call[0], {
      inventoryId: "partial-lot",
      type: "OUT",
      quantity: 30,
      reason: "Trade trade-789 execution",
      referenceType: "TRADE",
      referenceId: "trade-789",
      unitMarketValue: 22,
    });
  });

  it("throws if the trade quantity cannot be fully allocated", async () => {
    const trade = { id: "trade-456", quantity: 150, price: 12 };
    const candidateLots = [
      { id: "lot-A", quantity: 60 },
      { id: "lot-B", quantity: 50 },
    ];

    await assert.rejects(
      async () => {
        await applySellLotMovements(
          trade,
          candidateLots,
          movementExecutor,
          undefined,
        );
      },
      /Unable to allocate inventory lots for SELL trade execution/,
    );

    assert.equal(
      movementExecutorMock.mock.calls.length,
      candidateLots.length,
    );
  });
});
