"use client";

import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryMovements } from "@/lib/hooks/use-inventory";
import type { InventoryItem, Commodity } from "@prisma/client";
import { cn } from "@/lib/utils";

interface InventoryHistoryDrawerProps {
  inventory: InventoryItem & { commodity: Commodity };
  trigger: React.ReactNode;
}

const movementBadgeClasses: Record<string, string> = {
  IN: "bg-green-100 text-green-700",
  OUT: "bg-amber-100 text-amber-700",
  ADJUSTMENT: "bg-blue-100 text-blue-700",
};

export function InventoryHistoryDrawer({
  inventory,
  trigger,
}: InventoryHistoryDrawerProps) {
  const { data, isLoading } = useInventoryMovements(inventory.id);

  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Movement history</DrawerTitle>
          <DrawerDescription>
            {inventory.commodity.name} — {inventory.warehouse} (
            {inventory.location})
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="px-6 pb-6 max-h-[60vh]">
          <div className="space-y-4">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            )}

            {!isLoading && (!data || data.length === 0) && (
              <div className="text-sm text-muted-foreground">
                No movements recorded yet. Movements created here and via trades
                or shipments will appear instantly.
              </div>
            )}

            {!isLoading && data && data.length > 0 && (
              <ul className="space-y-3">
                {data.map((movement) => {
                  const badgeClass =
                    movementBadgeClasses[movement.type] ??
                    "bg-slate-100 text-slate-700";
                  const delta = movement.quantityDelta;
                  const formattedDelta = `${delta > 0 ? "+" : ""}${delta}`;

                  return (
                    <li
                      key={movement.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          className={cn("uppercase tracking-wide", badgeClass)}
                        >
                          {movement.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(movement.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                        <div>
                          <span className="font-medium text-slate-900">
                            Delta:
                          </span>{" "}
                          <span
                            className={cn(
                              delta >= 0 ? "text-green-600" : "text-red-600",
                            )}
                          >
                            {formattedDelta} {inventory.unit}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-900">
                            On hand:
                          </span>{" "}
                          <span>
                            {movement.resultingQuantity.toLocaleString()}{" "}
                            {inventory.unit}
                          </span>
                        </div>
                        {movement.unitCost !== null && (
                          <div>
                            <span className="font-medium text-slate-900">
                              Unit cost:
                            </span>{" "}
                            <span>${movement.unitCost?.toFixed(2)}</span>
                          </div>
                        )}
                        {movement.unitMarketValue !== null && (
                          <div>
                            <span className="font-medium text-slate-900">
                              Market:
                            </span>{" "}
                            <span>${movement.unitMarketValue?.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      {movement.reason && (
                        <p className="mt-3 text-sm text-slate-700">
                          {movement.reason}
                        </p>
                      )}
                      {(movement.referenceType || movement.referenceId) && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Reference: {movement.referenceType ?? "N/A"}{" "}
                          {movement.referenceId
                            ? `— ${movement.referenceId}`
                            : ""}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
