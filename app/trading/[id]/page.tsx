"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TradeModal } from "@/components/modals/trade-modal";
import { ExecuteTradeModal } from "@/components/modals/execute-trade-modal";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  Package,
  Building,
  User,
  Truck,
  FileText,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  useTradeById,
  useExecuteTrade,
  useCancelTrade,
  useUpdateTrade,
} from "@/lib/hooks/use-trades";
import { useShipments } from "@/lib/hooks/use-shipments";
import { useToast } from "@/hooks/use-toast";
import { TradeStatus } from "@prisma/client";

export default function TradeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tradeId = params.id as string;

  const { toast } = useToast();
  const { data: trade, isLoading, error, refetch } = useTradeById(tradeId);
  const { data: shipments = [] } = useShipments({ tradeId });
  const executeTradeMutation = useExecuteTrade();
  const cancelTradeMutation = useCancelTrade();
  const updateTradeMutation = useUpdateTrade();

  const [isEditTradeOpen, setIsEditTradeOpen] = useState(false);
  const [isExecuteTradeOpen, setIsExecuteTradeOpen] = useState(false);

  const handleEditTradeSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleExecuteTradeSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleCancelTrade = useCallback(async () => {
    try {
      await cancelTradeMutation.mutateAsync(tradeId);
      toast({
        title: "Trade cancelled",
        description:
          "The trade has been cancelled and credit has been released.",
      });
      await refetch();
    } catch (err) {
      console.error("Unable to cancel trade", err);
    }
  }, [cancelTradeMutation, refetch, toast, tradeId]);

  const handleSettleTrade = useCallback(async () => {
    try {
      await updateTradeMutation.mutateAsync({
        id: tradeId,
        data: { status: TradeStatus.SETTLED },
      });
      toast({
        title: "Trade settled",
        description: "The trade has been marked as settled.",
      });
      await refetch();
    } catch (err) {
      console.error("Unable to settle trade", err);
    }
  }, [refetch, toast, tradeId, updateTradeMutation]);

  const handleGenerateReport = useCallback(() => {
    if (!trade) return;

    const headers = [
      "Trade ID",
      "Commodity",
      "Type",
      "Quantity",
      "Price",
      "Total Value",
      "Counterparty",
      "Status",
      "Trade Date",
      "Settlement Date",
    ];

    const tradeRow = [
      trade.id,
      trade.commodity.name,
      trade.type,
      trade.quantity.toString(),
      trade.price.toFixed(2),
      trade.totalValue.toFixed(2),
      trade.counterparty.name,
      trade.status,
      new Date(trade.tradeDate).toISOString(),
      new Date(trade.settlementDate).toISOString(),
    ];

    const shipmentRows = shipments.map((shipment) => [
      shipment.id,
      shipment.trackingNumber,
      shipment.status,
      shipment.quantity.toString(),
      shipment.origin,
      shipment.destination,
      shipment.expectedArrival
        ? new Date(shipment.expectedArrival).toISOString()
        : "",
    ]);

    const shipmentHeader = [
      "\nShipment ID",
      "Tracking",
      "Status",
      "Quantity",
      "Origin",
      "Destination",
      "Expected Arrival",
    ];

    const csvLines = [
      headers.join(","),
      tradeRow.join(","),
      shipmentHeader.join(","),
      ...shipmentRows.map((row) => row.join(",")),
    ];

    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trade-${trade.id}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report generated",
      description: "A CSV download has started.",
    });
  }, [shipments, toast, trade]);

  const shipmentTimelineEvents = useMemo(() => {
    return shipments
      .flatMap((shipment) =>
        (shipment.events ?? []).map((event) => ({
          id: `${shipment.id}-${event.id}`,
          timestamp: event.timestamp,
          status: event.status,
          location: event.location,
          notes: event.notes,
          trackingNumber: shipment.trackingNumber,
        })),
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }, [shipments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Trade Not Found</h2>
          <p className="text-slate-600 mt-2">
            The requested trade could not be found.
          </p>
        </div>
        <p>{error?.message}</p>
        <Button onClick={() => router.push("/trading")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trading
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800";
      case "EXECUTED":
        return "bg-green-100 text-green-800";
      case "SETTLED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "BUY"
      ? "text-green-600 bg-green-50"
      : "text-red-600 bg-red-50";
  };

  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case "PREPARING":
        return "bg-amber-100 text-amber-800";
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "DELAYED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <TradeModal
        mode="edit"
        trade={trade ?? null}
        open={isEditTradeOpen}
        onOpenChange={setIsEditTradeOpen}
        onSuccess={handleEditTradeSuccess}
        isLoading={isLoading && !trade}
      />
      {trade && (
        <ExecuteTradeModal
          trade={trade}
          open={isExecuteTradeOpen}
          onOpenChange={setIsExecuteTradeOpen}
          onSuccess={handleExecuteTradeSuccess}
        />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push("/trading")}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trading
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Trade Details
              </h1>
              <p className="text-slate-600 mt-1">Trade ID: {trade.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getTypeColor(trade.type)} variant="outline">
              {trade.type}
            </Badge>
            <Badge className={getStatusColor(trade.status)}>
              {trade.status}
            </Badge>
          </div>
        </div>

        {/* Main Trade Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trade Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Trade Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Commodity Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Commodity
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">
                        {trade.commodity.name}
                      </div>
                      <div className="text-sm text-slate-600">
                        Type: {trade.commodity.type} • Unit:{" "}
                        {trade.commodity.unit}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Current Market Price:{" "}
                        {formatCurrency(trade.commodity.currentPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`flex items-center text-sm ${
                          trade.commodity.priceChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {trade.commodity.priceChange >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {trade.commodity.priceChange >= 0 ? "+" : ""}
                        {trade.commodity.priceChangePercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Trade Details */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Trade Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-600">Quantity</div>
                        <div className="font-medium">
                          {trade.quantity.toLocaleString()}{" "}
                          {trade.commodity.unit}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-600">
                          Price per Unit
                        </div>
                        <div className="font-medium">
                          {formatCurrency(trade.price)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-600">Location</div>
                        <div className="font-medium">{trade.location}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-600">
                          Total Value
                        </div>
                        <div className="font-medium text-lg">
                          {formatCurrency(trade.totalValue)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-600">Trade Date</div>
                        <div className="font-medium">
                          {formatDate(trade.tradeDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-600">
                          Settlement Date
                        </div>
                        <div className="font-medium">
                          {formatDate(trade.settlementDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Counterparty Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Counterparty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="font-medium text-slate-900 mb-2">
                  {trade.counterparty.name}
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3" />
                    <span>{trade.counterparty.contactPerson}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3 w-3" />
                    <span>{trade.counterparty.country}</span>
                  </div>
                </div>
              </div>

              {/* Trade Actions */}
              <div className="space-y-2">
                <h4 className="font-medium text-slate-900">Actions</h4>
                <div className="space-y-2">
                  {trade.status === "OPEN" && (
                    <>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => setIsExecuteTradeOpen(true)}
                      >
                        Execute Trade
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={() => setIsEditTradeOpen(true)}
                      >
                        Modify Trade
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        size="sm"
                        onClick={handleCancelTrade}
                        disabled={cancelTradeMutation.isPending}
                      >
                        {cancelTradeMutation.isPending
                          ? "Cancelling…"
                          : "Cancel Trade"}
                      </Button>
                    </>
                  )}
                  {trade.status === "EXECUTED" && (
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={handleSettleTrade}
                      disabled={updateTradeMutation.isPending}
                    >
                      {updateTradeMutation.isPending
                        ? "Updating…"
                        : "Mark as Settled"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={handleGenerateReport}
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipments */}
        {shipments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Related Shipments
              </CardTitle>
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
                        Quantity
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">
                        Route
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">
                        Carrier
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">
                        Expected Arrival
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">
                        Tracking
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((shipment) => (
                      <tr
                        key={shipment.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {shipment.id}
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
                          <Badge
                            className={getShipmentStatusColor(shipment.status)}
                          >
                            {shipment.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {formatDate(shipment.expectedArrival)}
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {shipment.trackingNumber}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium text-slate-900">
                    Trade Created
                  </div>
                  <div className="text-sm text-slate-600">
                    {formatDateTime(trade.createdAt)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Trade {trade.id} was created for{" "}
                    {trade.quantity.toLocaleString()} {trade.commodity.unit} of{" "}
                    {trade.commodity.name}
                  </div>
                </div>
              </div>

              {trade.status !== "OPEN" && (
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      trade.status === "EXECUTED"
                        ? "bg-green-600"
                        : trade.status === "CANCELLED"
                          ? "bg-red-600"
                          : "bg-gray-600"
                    }`}
                  ></div>
                  <div>
                    <div className="font-medium text-slate-900">
                      Trade{" "}
                      {trade.status === "EXECUTED"
                        ? "Executed"
                        : trade.status === "CANCELLED"
                          ? "Cancelled"
                          : "Updated"}
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatDateTime(trade.updatedAt)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Trade status changed to {trade.status.toLowerCase()}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium text-slate-900">
                    Target Settlement Date
                  </div>
                  <div className="text-sm text-slate-600">
                    {formatDate(trade.settlementDate)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Planned settlement for this trade
                  </div>
                </div>
              </div>

              {shipments.map((shipment) => (
                <div key={shipment.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-slate-900">
                      Shipment Created
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatDateTime(shipment.createdAt)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Shipment {shipment.id} created for{" "}
                      {shipment.quantity.toLocaleString()} units
                    </div>
                  </div>
                </div>
              ))}

              {shipmentTimelineEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-slate-900">
                      Shipment {event.trackingNumber} updated to{" "}
                      {event.status.replace("_", " ")}
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatDateTime(event.timestamp)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {event.notes ||
                        (event.location
                          ? `Location: ${event.location}`
                          : "Status change recorded")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
