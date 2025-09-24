"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";

interface Shipment {
  id: string;
  commodity: {
    name: string;
  };
  quantity: number;
  origin: string;
  destination: string;
  status: string;
  expectedArrival: Date;
  carrier: string;
}

interface PendingShipmentsProps {
  shipments: Shipment[];
}

export function PendingShipments({ shipments }: PendingShipmentsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PREPARING":
        return "bg-yellow-100 text-yellow-800";
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "DELAYED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pendingShipments = shipments.filter((s) => s.status !== "DELIVERED");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Truck className="h-5 w-5 mr-2" />
          Pending Shipments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingShipments.slice(0, 4).map((shipment) => (
            <div
              key={shipment.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {shipment.commodity.name}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {shipment.quantity.toLocaleString()} units
                </div>
                <div className="text-xs text-slate-500">
                  {shipment.origin} → {shipment.destination}
                </div>
                <div className="text-xs text-slate-500">
                  ETA: {new Date(shipment.expectedArrival).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(shipment.status)}>
                  {shipment.status.replace("_", " ")}
                </Badge>
                <div className="text-xs text-slate-500 mt-1">
                  {shipment.carrier}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
