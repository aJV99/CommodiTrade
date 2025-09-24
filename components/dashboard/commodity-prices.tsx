"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Commodity {
  id: string;
  name: string;
  type: string;
  unit: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
}

interface CommodityPricesProps {
  commodities: Commodity[];
}

export function CommodityPrices({ commodities }: CommodityPricesProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Market Prices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commodities.map((commodity) => (
            <div
              key={commodity.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-900">
                    {commodity.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {commodity.type}
                  </Badge>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  per {commodity.unit}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-slate-900">
                  ${commodity.currentPrice.toFixed(2)}
                </div>
                <div
                  className={`flex items-center text-sm ${
                    commodity.priceChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {commodity.priceChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {commodity.priceChange >= 0 ? "+" : ""}
                  {commodity.priceChange.toFixed(2)} (
                  {commodity.priceChangePercent >= 0 ? "+" : ""}
                  {commodity.priceChangePercent.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
