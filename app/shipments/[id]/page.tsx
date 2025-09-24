"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShipmentStatus } from "@prisma/client";
import { useShipment, useAddShipmentEvent } from "@/lib/hooks/use-shipments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { ShipmentEditModal } from "@/components/modals/edit-shipment-modal";

export default function ShipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: shipment, isLoading, error, refetch } = useShipment(id);
  const addEventMutation = useAddShipmentEvent();
  const [eventData, setEventData] = useState({
    status: "",
    location: "",
    notes: "",
  });

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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addEventMutation.mutateAsync({
        id,
        data: {
          status: eventData.status
            ? (eventData.status as ShipmentStatus)
            : undefined,
          location: eventData.location || undefined,
          notes: eventData.notes || undefined,
        },
      });
      setEventData({ status: "", location: "", notes: "" });
      refetch();
    } catch (err) {
      console.error("Error adding event:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-2xl font-bold">Shipment Not Found</h2>
        <Button onClick={() => router.push("/shipments")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shipments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.push("/shipments")}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">
            Shipment {shipment.id}
          </h1>
          <Badge className={getStatusColor(shipment.status)}>
            {shipment.status}
          </Badge>
        </div>
        <ShipmentEditModal shipment={shipment} onShipmentUpdated={refetch} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            Commodity:{" "}
            <span className="font-medium">{shipment.commodity.name}</span>
          </div>
          <div>
            Quantity:{" "}
            <span className="font-medium">
              {shipment.quantity.toLocaleString()}
            </span>
          </div>
          <div>
            Route:{" "}
            <span className="font-medium">
              {shipment.origin} → {shipment.destination}
            </span>
          </div>
          <div>
            Carrier: <span className="font-medium">{shipment.carrier}</span>
          </div>
          <div>
            Tracking:{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-sm">
              {shipment.trackingNumber}
            </code>
          </div>
          <div>
            Departure:{" "}
            <span className="font-medium">
              {shipment.departureDate
                ? new Date(shipment.departureDate).toLocaleDateString()
                : "-"}
            </span>
          </div>
          <div>
            Expected Arrival:{" "}
            <span className="font-medium">
              {shipment.expectedArrival
                ? new Date(shipment.expectedArrival).toLocaleDateString()
                : "-"}
            </span>
          </div>
          {shipment.actualArrival && (
            <div>
              Actual Arrival:{" "}
              <span className="font-medium">
                {new Date(shipment.actualArrival).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipment Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={eventData.status}
                  onValueChange={(v) =>
                    setEventData((prev) => ({ ...prev, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">No change</SelectItem>
                    <SelectItem value="PREPARING">Preparing</SelectItem>
                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="DELAYED">Delayed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={eventData.location}
                  onChange={(e) =>
                    setEventData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="Current location"
                />
              </div>
              <div className="space-y-2 col-span-3">
                <Label>Notes</Label>
                <Textarea
                  value={eventData.notes}
                  onChange={(e) =>
                    setEventData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Add notes"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={addEventMutation.isPending}>
                {addEventMutation.isPending ? "Saving..." : "Add Event"}
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            {shipment.events.map((event) => (
              <div key={event.id} className="border-b pb-2">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(event.status)}>
                    {event.status}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                {event.location && (
                  <div className="text-sm text-slate-700 mt-1">
                    Location: {event.location}
                  </div>
                )}
                {event.notes && (
                  <div className="text-sm text-slate-700 mt-1">
                    {event.notes}
                  </div>
                )}
              </div>
            ))}
            {shipment.events.length === 0 && (
              <div className="text-sm text-slate-500">No events yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
