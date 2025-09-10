'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import {
  useCommodityById,
  useCommodityPriceHistory,
} from '@/lib/hooks/use-commodities';
import { CommodityModal } from '@/components/modals/commodity-modal';
import { UpdatePriceModal } from '@/components/modals/update-price-modal';
import { DeleteCommodityModal } from '@/components/modals/delete-commodity-modal';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

export default function CommodityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [days, setDays] = useState(30);

  const { data: commodity, isLoading, error, refetch } = useCommodityById(id);
  const { data: priceData } = useCommodityPriceHistory(id, days);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !commodity) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-2xl font-bold">Commodity Not Found</h2>
        <Button onClick={() => router.push('/commodities')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Commodities
        </Button>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'AGRICULTURAL':
        return 'bg-green-100 text-green-800';
      case 'ENERGY':
        return 'bg-yellow-100 text-yellow-800';
      case 'METALS':
        return 'bg-gray-100 text-gray-800';
      case 'LIVESTOCK':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const priceChangePositive = commodity.priceChange >= 0;

  const priceHistory = priceData?.history ?? [];

  const inventoryTotal = commodity.inventory.reduce((sum, i) => sum + i.quantity, 0);
  const contractTotal = commodity.contracts.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.push('/commodities')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">{commodity.name}</h1>
        </div>
        <div className="flex space-x-2">
          <CommodityModal
            commodity={commodity}
            onCommodityUpdated={refetch}
            trigger={<Button variant="outline" size="sm">Edit</Button>}
          />
          <UpdatePriceModal
            commodityId={id}
            currentPrice={commodity.currentPrice}
            onPriceUpdated={refetch}
            trigger={<Button variant="outline" size="sm">Update Price</Button>}
          />
          <DeleteCommodityModal
            commodityId={id}
            commodityName={commodity.name}
            onCommodityDeleted={() => router.push('/commodities')}
            trigger={<Button variant="destructive" size="sm">Delete</Button>}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Badge className={getTypeColor(commodity.type)}>{commodity.type}</Badge>
            <span className="text-slate-700">Unit: {commodity.unit}</span>
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(commodity.currentPrice)}
            <span
              className={`ml-2 text-sm font-medium ${
                priceChangePositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {priceChangePositive ? <TrendingUp className="inline h-4 w-4" /> : <TrendingDown className="inline h-4 w-4" />}
              {commodity.priceChangePercent.toFixed(2)}%
            </span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-600">Trades</div>
              <div className="text-lg font-semibold">{commodity.trades.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Inventory Qty</div>
              <div className="text-lg font-semibold">{inventoryTotal}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Contract Qty</div>
              <div className="text-lg font-semibold">{contractTotal}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Shipments</div>
              <div className="text-lg font-semibold">{commodity.shipments.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Price History</CardTitle>
          <div className="flex space-x-2 mt-4 sm:mt-0">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ price: { label: 'Price', color: 'hsl(var(--chart-1))' } }}
            className="h-80 w-full"
          >
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[ 'auto', 'auto' ]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="var(--color-price)"
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {commodity.trades.length === 0 ? (
              <p className="text-slate-600">No trades found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Quantity</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commodity.trades.slice(0,5).map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        {new Date(t.tradeDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">{t.quantity}</td>
                      <td className="py-2 px-3">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {commodity.inventory.length === 0 ? (
              <p className="text-slate-600">No inventory items.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Warehouse</th>
                    <th className="text-left py-2 px-3">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {commodity.inventory.slice(0,5).map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="py-2 px-3">{i.warehouse}</td>
                      <td className="py-2 px-3">{i.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contracts</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {commodity.contracts.length === 0 ? (
              <p className="text-slate-600">No contracts.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Counterparty</th>
                    <th className="text-left py-2 px-3">Quantity</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commodity.contracts.slice(0,5).map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 px-3">{c.counterparty.name}</td>
                      <td className="py-2 px-3">{c.quantity}</td>
                      <td className="py-2 px-3">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipments</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {commodity.shipments.length === 0 ? (
              <p className="text-slate-600">No shipments.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Tracking #</th>
                    <th className="text-left py-2 px-3">Quantity</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commodity.shipments.slice(0,5).map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 px-3">{s.trackingNumber}</td>
                      <td className="py-2 px-3">{s.quantity}</td>
                      <td className="py-2 px-3">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex space-x-2">
        <Button asChild>
          <Link href={`/trading?commodityId=${id}`}>New Trade</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/inventory`}>Add Inventory</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/shipments`}>Schedule Shipment</Link>
        </Button>
      </div>
    </div>
  );
}

