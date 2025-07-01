'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Users, Building, TrendingUp, CreditCard } from 'lucide-react';
import { getCounterparties, Counterparty } from '@/lib/mock-data';

export default function CounterpartiesPage() {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [filteredCounterparties, setFilteredCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  useEffect(() => {
    const fetchCounterparties = async () => {
      try {
        const counterpartiesData = await getCounterparties();
        setCounterparties(counterpartiesData);
        setFilteredCounterparties(counterpartiesData);
      } catch (error) {
        console.error('Error fetching counterparties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounterparties();
  }, []);

  useEffect(() => {
    let filtered = counterparties;

    if (searchTerm) {
      filtered = filtered.filter(
        counterparty =>
          counterparty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          counterparty.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
          counterparty.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(counterparty => counterparty.type === typeFilter);
    }

    if (ratingFilter !== 'all') {
      filtered = filtered.filter(counterparty => counterparty.rating === ratingFilter);
    }

    setFilteredCounterparties(filtered);
  }, [counterparties, searchTerm, typeFilter, ratingFilter]);

  const getRatingColor = (rating: Counterparty['rating']) => {
    switch (rating) {
      case 'AAA':
        return 'bg-green-100 text-green-800';
      case 'AA':
        return 'bg-green-100 text-green-700';
      case 'A':
        return 'bg-blue-100 text-blue-800';
      case 'BBB':
        return 'bg-yellow-100 text-yellow-800';
      case 'BB':
        return 'bg-orange-100 text-orange-800';
      case 'B':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: Counterparty['type']) => {
    switch (type) {
      case 'Supplier':
        return 'text-blue-600 bg-blue-50';
      case 'Customer':
        return 'text-green-600 bg-green-50';
      case 'Both':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalCreditLimit = counterparties.reduce((sum, cp) => sum + cp.creditLimit, 0);
  const totalCreditUsed = counterparties.reduce((sum, cp) => sum + cp.creditUsed, 0);
  const totalTrades = counterparties.reduce((sum, cp) => sum + cp.totalTrades, 0);
  const totalVolume = counterparties.reduce((sum, cp) => sum + cp.totalVolume, 0);

  if (loading) {
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
          <h1 className="text-3xl font-bold text-slate-900">Counterparties</h1>
          <p className="text-slate-600 mt-2">Manage your trading partners and relationships</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Counterparty
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Partners</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counterparties.length}</div>
            <p className="text-xs text-slate-500 mt-1">Active relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Credit Limit</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCreditLimit.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Total available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Credit Used</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${totalCreditUsed.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">
              {((totalCreditUsed / totalCreditLimit) * 100).toFixed(1)}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolume.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">{totalTrades} trades</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle>All Counterparties</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search counterparties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Supplier">Supplier</SelectItem>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="AAA">AAA</SelectItem>
                  <SelectItem value="AA">AA</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="BBB">BBB</SelectItem>
                  <SelectItem value="BB">BB</SelectItem>
                  <SelectItem value="B">B</SelectItem>
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
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Country</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Credit Limit</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Credit Used</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Total Trades</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Volume</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCounterparties.map((counterparty) => {
                  const creditUtilization = (counterparty.creditUsed / counterparty.creditLimit) * 100;
                  
                  return (
                    <tr key={counterparty.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-900">{counterparty.name}</div>
                          <div className="text-sm text-slate-500">{counterparty.contactPerson}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getTypeColor(counterparty.type)}>{counterparty.type}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{counterparty.country}</td>
                      <td className="py-3 px-4">
                        <Badge className={getRatingColor(counterparty.rating)}>{counterparty.rating}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700">${counterparty.creditLimit.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700">${counterparty.creditUsed.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{creditUtilization.toFixed(1)}% used</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{counterparty.totalTrades}</td>
                      <td className="py-3 px-4 text-slate-700">{counterparty.totalVolume.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-700">{counterparty.email}</div>
                        <div className="text-xs text-slate-500">{counterparty.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}