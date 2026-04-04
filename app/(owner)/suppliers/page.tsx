"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

export default function SuppliersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  // Purchase form
  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<
    { itemId: string; quantity: number; unitCost: number }[]
  >([]);

  const suppliers = trpc.supplier.list.useQuery();
  const purchases = trpc.supplier.listPurchases.useQuery();
  const items = trpc.item.list.useQuery();
  const stock = trpc.supplier.getStock.useQuery();

  const createSupplier = trpc.supplier.create.useMutation({
    onSuccess: () => {
      toast.success("Supplier created");
      setCreateOpen(false);
      setName(""); setPhone(""); setAddress(""); setGstNumber("");
      suppliers.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const createPurchase = trpc.supplier.createPurchase.useMutation({
    onSuccess: () => {
      toast.success("Purchase recorded");
      setPurchaseOpen(false);
      setPurchaseItems([]);
      purchases.refetch();
      stock.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const addPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, { itemId: "", quantity: 1, unitCost: 0 }]);
  };

  const handleCreatePurchase = () => {
    if (!purchaseSupplierId || purchaseItems.length === 0) return;
    const validItems = purchaseItems.filter((i) => i.itemId && i.quantity > 0 && i.unitCost > 0);
    if (validItems.length === 0) return;

    const dateObj = new Date(purchaseDate);
    dateObj.setHours(0, 0, 0, 0);

    createPurchase.mutate({
      supplierId: purchaseSupplierId,
      date: dateObj,
      invoiceNo: invoiceNo || undefined,
      items: validItems,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers & Purchases</h1>
          <p className="text-muted-foreground">Manage suppliers, purchases, and stock</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Add Supplier</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Supplier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div>
                  <Label>GST Number</Label>
                  <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                </div>
                <Button
                  onClick={() => createSupplier.mutate({ name, phone: phone || undefined, address: address || undefined, gstNumber: gstNumber || undefined })}
                  disabled={!name || createSupplier.isPending}
                  className="w-full"
                >
                  {createSupplier.isPending ? "Saving..." : "Save Supplier"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
            <DialogTrigger asChild>
              <Button>Record Purchase</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Purchase</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Supplier</Label>
                  <Select value={purchaseSupplierId} onValueChange={setPurchaseSupplierId}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.data?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Invoice No</Label>
                    <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Items</Label>
                    <Button size="sm" variant="outline" onClick={addPurchaseItem}>
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {purchaseItems.map((pi, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Select
                            value={pi.itemId}
                            onValueChange={(v) => {
                              const updated = [...purchaseItems];
                              updated[idx].itemId = v;
                              setPurchaseItems(updated);
                            }}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.data?.map((item) => (
                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={pi.quantity || ""}
                            onChange={(e) => {
                              const updated = [...purchaseItems];
                              updated[idx].quantity = parseInt(e.target.value) || 0;
                              setPurchaseItems(updated);
                            }}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Cost"
                            value={pi.unitCost || ""}
                            onChange={(e) => {
                              const updated = [...purchaseItems];
                              updated[idx].unitCost = parseFloat(e.target.value) || 0;
                              setPurchaseItems(updated);
                            }}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {purchaseItems.length > 0 && (
                    <p className="text-sm font-medium mt-2 text-right">
                      Total: {formatRupee(purchaseItems.reduce((s, i) => s + i.quantity * i.unitCost, 0))}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleCreatePurchase}
                  disabled={createPurchase.isPending}
                  className="w-full"
                >
                  {createPurchase.isPending ? "Saving..." : "Save Purchase"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="stock">Central Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {suppliers.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead>Purchases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.data?.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.phone || "-"}</TableCell>
                        <TableCell className="text-sm">{s.gstNumber || "-"}</TableCell>
                        <TableCell>{s._count.purchases}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {purchases.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.data?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.date)}</TableCell>
                        <TableCell className="font-medium">{p.supplier.name}</TableCell>
                        <TableCell>{p.invoiceNo || "-"}</TableCell>
                        <TableCell>{p.items.length} items</TableCell>
                        <TableCell className="text-right font-medium">{formatRupee(p.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Central Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stock.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stock.data?.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.item.name}</TableCell>
                        <TableCell>{s.item.unit}</TableCell>
                        <TableCell className="text-right font-medium">{s.quantity}</TableCell>
                      </TableRow>
                    ))}
                    {stock.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No stock records. Record a purchase to add stock.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
