"use client";

import React, { Suspense, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Truck, MapPin, Clock, Package } from "lucide-react";
import { ShipmentModal } from "@/components/modals/shipment-modal";
import { useShipments } from "@/lib/hooks/use-shipments";
import { ShipmentStatus } from "@prisma/client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCommodities } from "@/lib/hooks/use-commodities";

export default function ShipmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Loading shipments…
        </div>
      }
    >
      <ShipmentsPageContent />
    </Suspense>
  );
}

function ShipmentsPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">(
    "all",
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const commodityIdFilter = searchParams.get("commodityId") ?? undefined;
  const { data: commodities = [] } = useCommodities();

  const {
    data: shipments = [],
    isLoading,
    refetch,
  } = useShipments({
    commodityId: commodityIdFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      const matchesSearch =
        searchTerm === "" ||
        shipment.commodity.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        shipment.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.trackingNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || shipment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [shipments, searchTerm, statusFilter]);

  const commodityFilterLabel = useMemo(() => {
    if (!commodityIdFilter) return undefined;
    return commodities.find((commodity) => commodity.id === commodityIdFilter)
      ?.name;
  }, [commodities, commodityIdFilter]);

  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case ShipmentStatus.PREPARING:
        return "bg-yellow-100 text-yellow-800";
      case ShipmentStatus.IN_TRANSIT:
        return "bg-blue-100 text-blue-800";
      case ShipmentStatus.DELIVERED:
        return "bg-green-100 text-green-800";
      case ShipmentStatus.DELAYED:
        return "bg-red-100 text-red-800";
      case ShipmentStatus.CANCELLED:
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: ShipmentStatus) => {
    switch (status) {
      case ShipmentStatus.PREPARING:
        return "Preparing";
      case ShipmentStatus.IN_TRANSIT:
        return "In Transit";
      case ShipmentStatus.DELIVERED:
        return "Delivered";
      case ShipmentStatus.DELAYED:
        return "Delayed";
      case ShipmentStatus.CANCELLED:
        return "Cancelled";
      default:
        return status;
    }
  };

  const inTransitShipments = shipments.filter(
    (s) => s.status === ShipmentStatus.IN_TRANSIT,
  );
  const delayedShipments = shipments.filter(
    (s) => s.status === ShipmentStatus.DELAYED,
  );
  const deliveredShipments = shipments.filter(
    (s) => s.status === ShipmentStatus.DELIVERED,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Shipments</h1>
          <p className="text-slate-600 mt-2">
            Track your commodity shipments and deliveries
          </p>
        </div>
        <ShipmentModal onShipmentCreated={refetch} />
      </div>

      {commodityIdFilter && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <span>
            Commodity filter:{" "}
            <span className="font-semibold">
              {commodityFilterLabel ?? "Selected commodity"}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => router.push("/shipments")}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Shipments
            </CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipments.length}</div>
            <p className="text-xs text-slate-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              In Transit
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {inTransitShipments.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Currently moving</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Delayed
            </CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {delayedShipments.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Behind schedule</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Delivered
            </CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {deliveredShipments.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle>All Shipments</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search shipments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ShipmentStatus | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PREPARING">Preparing</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="DELAYED">Delayed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Shipment ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Commodity
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Quantity
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Route
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Carrier
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Tracking
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Departure
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Expected Arrival
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <Link
                        href={`/shipments/${shipment.id}`}
                        className="hover:underline"
                      >
                        {shipment.id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {shipment.commodity.name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {shipment.quantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center space-x-1">
                        <span>{shipment.origin}</span>
                        <span className="text-slate-400">→</span>
                        <span>{shipment.destination}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {shipment.carrier}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {shipment.trackingNumber}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(shipment.status)}>
                        {getStatusLabel(shipment.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {shipment.departureDate
                        ? new Date(shipment.departureDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {shipment.expectedArrival
                        ? new Date(
                            shipment.expectedArrival,
                          ).toLocaleDateString()
                        : "-"}
                      {shipment.actualArrival && (
                        <div className="text-xs text-green-600 mt-1">
                          Delivered:{" "}
                          {new Date(
                            shipment.actualArrival,
                          ).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/shipments/${shipment.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
