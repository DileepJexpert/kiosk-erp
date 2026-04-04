"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Heart, Users, Repeat, IndianRupee } from "lucide-react";

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const customers = trpc.customer.list.useQuery({ search: search || undefined });
  const stats = trpc.customer.getStats.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers & Loyalty</h1>
        <p className="text-muted-foreground">Customer loyalty program management</p>
      </div>

      {/* Stats */}
      {stats.data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Total Customers</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.data.totalCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Repeat Customers</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.data.repeatCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-600" />
                <span className="text-sm text-muted-foreground">Repeat Rate</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.data.repeatRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatRupee(stats.data.totalSpend)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Customer Table */}
      <Card>
        <CardContent className="pt-6">
          {customers.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name || "-"}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="text-right">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-sm font-medium">
                        {c.loyaltyPts} pts
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatRupee(c.totalSpend)}</TableCell>
                    <TableCell className="text-right">{c.totalVisits}</TableCell>
                  </TableRow>
                ))}
                {customers.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
