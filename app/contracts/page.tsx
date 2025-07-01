'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, Calendar, DollarSign } from 'lucide-react';
import { getContracts, Contract } from '@/lib/mock-data';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const contractsData = await getContracts();
        setContracts(contractsData);
        setFilteredContracts(contractsData);
      } catch (error) {
        console.error('Error fetching contracts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  useEffect(() => {
    let filtered = contracts;

    if (searchTerm) {
      filtered = filtered.filter(
        contract =>
          contract.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.counterparty.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(contract => contract.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(contract => contract.type === typeFilter);
    }

    setFilteredContracts(filtered);
  }, [contracts, searchTerm, statusFilter, typeFilter]);

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: Contract['type']) => {
    return type === 'Purchase' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50';
  };

  const totalContractValue = contracts.reduce((sum, contract) => sum + contract.totalValue, 0);
  const activeContracts = contracts.filter(c => c.status === 'Active');
  const totalExecuted = contracts.reduce((sum, contract) => sum + (contract.executed * contract.price), 0);

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
          <h1 className="text-3xl font-bold text-slate-900">Contracts</h1>
          <p className="text-slate-600 mt-2">Manage your commodity purchase and sale contracts</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalContractValue.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">All contracts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts.length}</div>
            <p className="text-xs text-slate-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Executed Value</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExecuted.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Completed trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg. Contract Size</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${contracts.length > 0 ? Math.round(totalContractValue / contracts.length).toLocaleString() : '0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Per contract</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle>All Contracts</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Sale">Sale</SelectItem>
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
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Contract ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Commodity</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Counterparty</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Quantity</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Price</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Total Value</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">End Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => {
                  const progressPercent = (contract.executed / contract.quantity) * 100;
                  
                  return (
                    <tr key={contract.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{contract.id}</td>
                      <td className="py-3 px-4 text-slate-700">{contract.commodity}</td>
                      <td className="py-3 px-4 text-slate-700">{contract.counterparty}</td>
                      <td className="py-3 px-4">
                        <Badge className={getTypeColor(contract.type)}>{contract.type}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{contract.quantity.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-700">${contract.price.toFixed(2)}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        ${contract.totalValue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-600">{progressPercent.toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {contract.executed.toLocaleString()} / {contract.quantity.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(contract.status)}>{contract.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{contract.endDate}</td>
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