"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Package, Trash2, Camera, Eye } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["FOOD", "BEVERAGE", "SUPPLY", "PACKAGING"] as const;
const SEASONS = ["WINTER", "SUMMER", "MONSOON", "FESTIVAL", "ALL_YEAR"] as const;

export default function InventoryPage() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [filter, setFilter] = useState<string>("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const items = trpc.item.list.useQuery();
  const wasteAudit = trpc.waste.listLogs.useQuery();

  const createItem = trpc.item.create.useMutation({
    onSuccess: () => {
      utils.item.list.invalidate();
      setOpen(false);
      toast.success("Item created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateItem = trpc.item.update.useMutation({
    onSuccess: () => {
      utils.item.list.invalidate();
      setEditItem(null);
      toast.success("Item updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const seasonCheckboxes = fd.getAll("seasonTags") as string[];
    createItem.mutate({
      name: fd.get("name") as string,
      unit: fd.get("unit") as string,
      costPrice: parseFloat(fd.get("costPrice") as string),
      sellPrice: parseFloat(fd.get("sellPrice") as string) || 0,
      category: fd.get("category") as any,
      dailyMargin: parseInt(fd.get("dailyMargin") as string) || 0,
      seasonTags: seasonCheckboxes.length > 0 ? (seasonCheckboxes as any) : ["ALL_YEAR"],
      isPerishable: fd.get("isPerishable") === "true",
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const seasonCheckboxes = fd.getAll("seasonTags") as string[];
    updateItem.mutate({
      id: editItem.id,
      name: fd.get("name") as string,
      unit: fd.get("unit") as string,
      costPrice: parseFloat(fd.get("costPrice") as string),
      sellPrice: parseFloat(fd.get("sellPrice") as string) || 0,
      category: fd.get("category") as any,
      dailyMargin: parseInt(fd.get("dailyMargin") as string) || 0,
      seasonTags: seasonCheckboxes.length > 0 ? (seasonCheckboxes as any) : ["ALL_YEAR"],
      isPerishable: fd.get("isPerishable") === "true",
      isActive: fd.get("isActive") === "true",
    });
  };

  const filteredItems = items.data?.filter(
    (i: any) =>
      i.name.toLowerCase().includes(filter.toLowerCase()) ||
      i.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-orange-600" />
            Inventory & Spoilage Audit
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage catalog items, pricing, margins, and photo-verified food shrinkage logs.
          </p>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-2">
          <TabsTrigger value="catalog">Item Catalog ({items.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="waste" className="gap-2">
            <Trash2 className="h-4 w-4 text-red-500" /> Spoilage Photo Audit ({wasteAudit.data?.totalIncidents || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Catalog */}
        <TabsContent value="catalog" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">All Items</CardTitle>
                <Input
                  placeholder="Filter by name or category..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-56 h-8 text-xs"
                />
              </div>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input name="name" required placeholder="e.g., Veg Momos" />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input name="unit" required placeholder="pcs, kg, plates" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Cost Price (₹)</Label>
                        <Input name="costPrice" type="number" step="0.5" required min="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Sell Price (₹)</Label>
                        <Input name="sellPrice" type="number" step="0.5" defaultValue="0" min="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Daily Margin</Label>
                        <Input name="dailyMargin" type="number" defaultValue="0" min="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <select name="category" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Perishable</Label>
                        <select name="isPerishable" className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Season Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {SEASONS.map((s) => (
                          <label key={s} className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              name="seasonTags"
                              value={s}
                              defaultChecked={s === "ALL_YEAR"}
                            />
                            {s}
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={createItem.isPending}>
                      {createItem.isPending ? "Creating..." : "Create Item"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {items.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Sell Price</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                          <span className="text-xs text-muted-foreground ml-1">/{item.unit}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatRupee(item.costPrice)}</TableCell>
                        <TableCell className="text-right font-bold text-orange-600">
                          {formatRupee(item.sellPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{item.dailyMargin}</TableCell>
                        <TableCell>
                          <Badge className={item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Photo Waste Audit */}
        <TabsContent value="waste" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4 text-red-500" />
                  Audited Shrinkage & Food Waste Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Physical photo proof logged by kiosk operators for damaged, dropped, or curdled stock.
                </CardDescription>
              </div>

              <div className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-right">
                <span className="text-[10px] text-red-700 block uppercase font-bold">Total Loss</span>
                <span className="text-lg font-black text-red-800">
                  {formatRupee(wasteAudit.data?.totalLossAmount || 0)}
                </span>
              </div>
            </CardHeader>

            <CardContent>
              {wasteAudit.isLoading ? (
                <Skeleton className="h-48" />
              ) : wasteAudit.data?.logs?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No food waste incidents logged yet. Zero shrinkage reported!
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Photo Proof</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Kiosk</TableHead>
                      <TableHead>Item & Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Cost Loss</TableHead>
                      <TableHead>Logged By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wasteAudit.data?.logs?.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.photoUrl ? (
                            <button
                              onClick={() => setSelectedPhoto(log.photoUrl)}
                              className="relative group rounded-md overflow-hidden border h-10 w-10 block"
                            >
                              <img
                                src={log.photoUrl}
                                alt="Waste proof"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="h-3.5 w-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No photo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(log.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-xs">{log.kiosk?.name}</TableCell>
                        <TableCell className="text-xs">
                          {log.item?.name} ({log.quantity} {log.item?.unit})
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] text-red-700 border-red-200 bg-red-50">
                            {log.reason.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600 text-xs">
                          {formatRupee(log.costLoss)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.loggedBy?.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Full Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-sm">Audited Food Spoilage Photo Proof</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="rounded-lg overflow-hidden border mt-2">
              <img
                src={selectedPhoto}
                alt="Enlarged waste proof"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editItem && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={editItem.name} required />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input name="unit" defaultValue={editItem.unit} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cost Price (₹)</Label>
                  <Input name="costPrice" type="number" step="0.5" defaultValue={editItem.costPrice} required />
                </div>
                <div className="space-y-2">
                  <Label>Sell Price (₹)</Label>
                  <Input name="sellPrice" type="number" step="0.5" defaultValue={editItem.sellPrice} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Margin</Label>
                  <Input name="dailyMargin" type="number" defaultValue={editItem.dailyMargin} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select name="category" defaultValue={editItem.category} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Perishable</Label>
                  <select name="isPerishable" defaultValue={String(editItem.isPerishable)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Active</Label>
                  <select name="isActive" defaultValue={String(editItem.isActive)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Season Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map((s) => (
                    <label key={s} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        name="seasonTags"
                        value={s}
                        defaultChecked={editItem.seasonTags?.includes(s)}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={updateItem.isPending}>
                {updateItem.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
