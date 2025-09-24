# Trades & Commodities Roadmap

This document captures the current state of the trading and commodity flows and prioritised follow-up work to reach a production-ready experience.

## Current Enhancements

- **Trade lifecycle controls wired** – Executing, cancelling and settling a trade now call the real mutations and surface success/error toasts. The detail view refreshes automatically so downstream widgets (inventory, shipments) stay accurate.
- **Modal behaviour corrected** – Dialogs now open in the viewport centre with body scroll locked, fixing the jump-to-corner animation and accidental background scrolling.

## High-Impact Next Steps

1. **Edit trade workflow**
   - Reuse the existing `TradeModal` with pre-filled data when `editTradeId` is present in the query string.
   - Validate credit reuse deltas when quantity/price change and roll back the delta on cancel.
2. **Bulk actions on trade list**
   - Add row selection plus multi-execute/cancel for eligible trades.
   - Surface aggregated metrics (selected total volume/value) to aid risk checks.
3. **Commodity analytics**
   - Persist daily price history instead of generating mock data in `getCommodityPriceHistory`.
   - Add volatility, moving-average and spread visualisations to the commodity detail chart.
4. **Counterparty & risk integration**
   - Show counterparty credit usage and limits inline on both trade list rows and detail pages.
   - Block execution if settling would breach inventory availability or contractual commitments.
5. **Inventory alignment**
   - Display live inventory lots linked to each trade (pre/post execution) and support manual lot selection when executing SELL orders.
   - Trigger valuation recalculation when commodity prices change via the Update Price modal.

## Data & Hook Improvements

- Expand `getTrades`/`useTrades` filters to include partial ID search, date presets and pagination cursors.
- Introduce optimistic updates for status changes to keep the UI snappy while backend confirms.
- Extract a shared `useTradeLifecycle` helper that wraps execute/cancel/settle mutations with consistent toast messaging.

## QA & Observability

- Add Playwright smoke tests covering: creating a trade, executing it, verifying inventory adjustments, and updating commodity prices.
- Emit domain logs (tradeId, operation, duration) around `executeTrade` and `updateCommodityPrice` to aid debugging in staging.
