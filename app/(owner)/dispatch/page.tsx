"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatDate, formatRupee } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Truck, Eye } from "lucide-react";
import { toast } from "sonner";

export default function DispatchPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewDispatch, setViewDispatch] = useState<string | null>(null);
  const [selectedKiosk, setSelectedKiosk] = useState("");
  const [dispatchItems, setDispatchItems] = useState<{ itemId: string; quantity: number; itemName: string }[]>([]);
  const [dispatchNotes, setDispatchNotes] = useState("");
  const utils = trpc.useUtils();

  const dispatches = trpc.dispatch.list.useQuery();
  const kiosks = trpc.kiosk.list.useQuery();

  const templateItems = trpc.dispatch.getTemplateItems.useQuery(
    { kioskId: selectedKiosk },
    { enabled: !!selectedKiosk }
  );

  const allItems = trpc.item.list.useQuery();

  const dispatchDetail = trpc.dispatch.getById.useQuery(
    { id: viewDispatch! },
    { enabled: !!viewDispatch }
  );

  const createDispatch = trpc.dispatch.create.useMutation({
    onSuccess: () => {
      utils.dispatch.list.invalidate();
      setCreateOpen(false);
      setDispatchItems([]);
      setSelectedKiosk("");
      setDispatchNotes("");
      toast.success("Dispatch created successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleKioskSelect = (kioskId: string) => {
    setSelectedKiosk(kioskId);
    setDispatchItems([]);
  };

  // When template items load, pre-fill
  const handlePrefill = () => {
    if (templateItems.data && allItems.data) {
      const items = templateItems.data.map((ti) => {
        const item = allItems.data?.find((i) => i.id === ti.itemId);
        return { itemId: ti.itemId, quantity: ti.quantity, itemName: item?.name || "Unknown" };
      });
      setDispatchItems(items);
    }
  };

  const handleCreate = () => {
    if (!selectedKiosk || dispatchItems.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    createDispatch.mutate({
      kioskId: selectedKiosk,
      date: today,
      items: dispatchItems.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
      ...(dispatchNotes.trim() && { notes: dispatchNotes.trim() }),
    });
  };

  const updateItemQty = (index: number, qty: number) => {
    setDispatchItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(0, qty) } : item))
    );
  };

  const removeItem = (index: number) => {
    setDispatchItems((prev) => prev.filter((_, i) => i !== index));
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-amber-100 text-amber-700 hover:bg-amber-100";
      case "CONFIRMED": return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "RECONCILED": return "bg-green-100 text-green-700 hover:bg-green-100";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Management</h1>
          <p className="text-muted-foreground">Create and manage daily dispatches</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New Dispatch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Dispatch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Kiosk</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedKiosk}
                  onChange={(e) => handleKioskSelect(e.target.value)}
                >
                  <option value="">Choose a kiosk...</option>
                  {kiosks.data?.filter((k) => k.isActive).map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.type}) - {k.location}
                    </option>
                  ))}
                </select>
              </div>

              {selectedKiosk && (
                <>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrefill}
                      disabled={!templateItems.data?.length}
                    >
                      Pre-fill from Template
                    </Button>
                  </div>

                  {dispatchItems.length > 0 && (
                    <div className="space-y-2">
                      <Label>Items</Label>
                      <div className="border rounded-md divide-y">
                        {dispatchItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3">
                            <span className="flex-1 text-sm font-medium">{item.itemName}</span>
                            <Input
                              type="number"
                              className="w-24"
                              value={item.quantity}
                              onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 0)}
                              min={0}
                            />
                            <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add individual item */}
                  <div className="space-y-2">
                    <Label>Add Item</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      onChange={(e) => {
                        const itemId = e.target.value;
                        if (!itemId) return;
                        const item = allItems.data?.find((i) => i.id === itemId);
                        if (item && !dispatchItems.find((d) => d.itemId === itemId)) {
                          setDispatchItems((prev) => [...prev, { itemId, quantity: 1, itemName: item.name }]);
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Add an item...</option>
                      {allItems.data
                        ?.filter((i) => i.isActive && !dispatchItems.find((d) => d.itemId === i.id))
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      name="notes"
                      placeholder="Optional notes for this dispatch"
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreate}
                    disabled={createDispatch.isPending || dispatchItems.length === 0}
                  >
                    {createDispatch.isPending ? "Creating..." : "Create Dispatch"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dispatch List */}
      <Card>
        <CardContent className="pt-6">
          {dispatches.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Kiosk</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.data?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{formatDate(d.date)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{d.kiosk.name}</p>
                        <p className="text-xs text-muted-foreground">{d.kiosk.location}</p>
                      </div>
                    </TableCell>
                    <TableCell>{d.items.length} items</TableCell>
                    <TableCell>
                      <Badge className={statusColor(d.status)}>{d.status}</Badge>
                    </TableCell>
                    <TableCell>{d.createdBy.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setViewDispatch(d.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {dispatches.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No dispatches found. Create your first dispatch.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dispatch Detail */}
      <Dialog open={!!viewDispatch} onOpenChange={(v) => !v && setViewDispatch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispatch Details</DialogTitle>
          </DialogHeader>
          {dispatchDetail.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Kiosk</p>
                  <p className="font-medium">{dispatchDetail.data.kiosk.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(dispatchDetail.data.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={statusColor(dispatchDetail.data.status)}>
                    {dispatchDetail.data.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p className="font-medium">{dispatchDetail.data.createdBy.name}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Items</p>
                <div className="border rounded-md divide-y">
                  {dispatchDetail.data.items.map((item) => (
                    <div key={item.id} className="flex justify-between p-3 text-sm">
                      <span>{item.item.name}</span>
                      <span className="font-medium">
                        {item.quantity} {item.item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
