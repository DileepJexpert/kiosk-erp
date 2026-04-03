"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Edit, Package } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["FOOD", "BEVERAGE", "SUPPLY", "PACKAGING"] as const;
const SEASONS = ["WINTER", "SUMMER", "MONSOON", "FESTIVAL", "ALL_YEAR"] as const;

export default function InventoryPage() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [filter, setFilter] = useState<string>("");
  const utils = trpc.useUtils();

  const items = trpc.item.list.useQuery();

  const createItem = trpc.item.create.useMutation({
    onSuccess: () => {
      utils.item.list.invalidate();
      setOpen(false);
      toast.success("Item created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateItem = trpc.item.update.useMutation({
    onSuccess: () => {
      utils.item.list.invalidate();
      setEditItem(null);
      toast.success("Item updated");
    },
    onError: (err) => toast.error(err.message),
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
      seasonTags: seasonCheckboxes.length > 0 ? seasonCheckboxes as any : ["ALL_YEAR"],
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
      seasonTags: seasonCheckboxes.length > 0 ? seasonCheckboxes as any : ["ALL_YEAR"],
      isPerishable: fd.get("isPerishable") === "true",
      isActive: fd.get("isActive") === "true",
    });
  };

  const filteredItems = items.data?.filter((item) =>
    !filter || item.category === filter
  );

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "FOOD": return "bg-orange-100 text-orange-700";
      case "BEVERAGE": return "bg-blue-100 text-blue-700";
      case "SUPPLY": return "bg-gray-100 text-gray-700";
      case "PACKAGING": return "bg-purple-100 text-purple-700";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Manage items, prices, and wastage margins</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Item</DialogTitle></DialogHeader>
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
                  <select name="category" className="w-full border rounded-md px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Perishable</Label>
                  <select name="isPerishable" className="w-full border rounded-md px-3 py-2 text-sm">
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
                      <input type="checkbox" name="seasonTags" value={s} defaultChecked={s === "ALL_YEAR"} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createItem.isPending}>
                {createItem.isPending ? "Creating..." : "Create Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button variant={filter === "" ? "default" : "outline"} size="sm" onClick={() => setFilter("")}>
          All
        </Button>
        {CATEGORIES.map((c) => (
          <Button key={c} variant={filter === c ? "default" : "outline"} size="sm" onClick={() => setFilter(c)}>
            {c}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Sell</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Seasons</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Badge className={`${categoryColor(item.category)} hover:${categoryColor(item.category)}`}>
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatRupee(item.costPrice)}</TableCell>
                    <TableCell className="text-right">
                      {item.sellPrice > 0 ? formatRupee(item.sellPrice) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                        {item.dailyMargin}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.seasonTags.map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={item.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-100"}>
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

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
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
                  <select name="category" defaultValue={editItem.category} className="w-full border rounded-md px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Perishable</Label>
                  <select name="isPerishable" defaultValue={String(editItem.isPerishable)} className="w-full border rounded-md px-3 py-2 text-sm">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Active</Label>
                  <select name="isActive" defaultValue={String(editItem.isActive)} className="w-full border rounded-md px-3 py-2 text-sm">
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
                      <input type="checkbox" name="seasonTags" value={s} defaultChecked={editItem.seasonTags?.includes(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateItem.isPending}>
                {updateItem.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
