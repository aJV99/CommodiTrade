"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import {
  BarChart3,
  Package,
  TrendingUp,
  Layers,
  Truck,
  Users,
  FileText,
  Settings,
  Home,
  Building2,
} from "lucide-react";

export const sidebarNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Trading", href: "/trading", icon: TrendingUp },
  { name: "Commodities", href: "/commodities", icon: Layers },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Contracts", href: "/contracts", icon: FileText },
  { name: "Shipments", href: "/shipments", icon: Truck },
  { name: "Counterparties", href: "/counterparties", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

type SidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col bg-slate-900 text-slate-200",
        className,
      )}
    >
      <div className="flex h-16 items-center justify-center border-b border-slate-800 px-4">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold text-white">CommodiTrade</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {sidebarNavigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
            <span className="text-sm font-medium text-white">JD</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">John Doe</p>
            <p className="text-xs text-slate-400">Trader</p>
          </div>
        </div>
      </div>
    </div>
  );
}
