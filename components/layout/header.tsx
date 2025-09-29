"use client";

import React from "react";
import { Bell, Menu, Search, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Sidebar } from "./sidebar";

export function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-2">
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[18rem] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <Sidebar
              onNavigate={() => setIsMobileNavOpen(false)}
              className="w-full"
            />
          </SheetContent>
        </Sheet>
        <span className="text-lg font-semibold text-card-foreground lg:hidden">
          CommodiTrade
        </span>
      </div>

      <div className="flex flex-1 items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            placeholder="Search trades, contracts, commodities..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
          <span className="sr-only">Account</span>
        </Button>
      </div>
    </header>
  );
}
