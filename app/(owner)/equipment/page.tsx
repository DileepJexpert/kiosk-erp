"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Plus, AlertCircle, CheckCircle, ShieldCheck, Clock, Hammer } from "lucide-react";
import { toast } from "sonner";

export default function EquipmentPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);

  // Form states for adding equipment
  const [kioskId, setKioskId] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [amcExpiry, setAmcExpiry] = useState("");

  // Form states for logging maintenance
  const [issue, setIssue] = useState("");
  const [cost, setCost] = useState("");
  const [technician, setTechnician] = useState("");

  const kiosks = trpc.kiosk.list.useQuery();
  const equipment = trpc.equipment.list.useQuery();

  const createEquipment = trpc.equipment.create.useMutation({
    onSuccess: () => {
      toast.success("Equipment registered successfully!");
      setIsAddOpen(false);
      resetAddForm();
      equipment.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const logMaintenance = trpc.equipment.logMaintenance.useMutation({
    onSuccess: () => {
      toast.success("Maintenance ticket logged!");
      setIsLogOpen(false);
      resetLogForm();
      equipment.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resolveMaintenance = trpc.equipment.resolveMaintenance.useMutation({
    onSuccess: () => {
      toast.success("Ticket resolved & equipment marked operational!");
      equipment.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetAddForm = () => {
    setName("");
    setBrand("");
    setSerialNumber("");
    setPurchaseDate("");
    setWarrantyExpiry("");
    setAmcExpiry("");
  };

  const resetLogForm = () => {
    setIssue("");
    setCost("");
    setTechnician("");
  };

  const handleCreateEquipment = () => {
    if (!kioskId || !name) {
      toast.error("Please select a kiosk and enter an equipment name");
      return;
    }
    createEquipment.mutate({
      kioskId,
      name,
      brand: brand || undefined,
      serialNumber: serialNumber || undefined,
      purchaseDate: purchaseDate || undefined,
      warrantyExpiry: warrantyExpiry || undefined,
      amcExpiry: amcExpiry || undefined,
    });
  };

  const handleLogMaintenance = () => {
    if (!selectedEquipment || !issue) {
      toast.error("Please describe the maintenance issue");
      return;
    }
    logMaintenance.mutate({
      equipmentId: selectedEquipment.id,
      issue,
      cost: Number(cost) || 0,
      technician: technician || undefined,
      markUnderRepair: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-orange-600" />
            Equipment & Preventive AMC Tracker
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor tea boilers, deep fryers, and chillers across kiosks. Track warranty, AMC renewals, and repair costs.
          </p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Equipment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipment.isLoading ? (
          <p className="text-sm text-muted-foreground col-span-3">Loading equipment roster...</p>
        ) : equipment.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-3">No equipment registered yet.</p>
        ) : (
          equipment.data?.map((item: any) => (
            <Card key={item.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-base font-bold">{item.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {item.kiosk.name} • {item.brand || "Standard Model"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      item.status === "OPERATIONAL"
                        ? "default"
                        : item.status === "NEEDS_REPAIR"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {item.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial No:</span>
                    <span className="font-mono">{item.serialNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Warranty:</span>
                    <span className={item.isWarrantyExpired ? "text-red-500 font-medium" : "text-emerald-700"}>
                      {item.warrantyExpiry
                        ? item.isWarrantyExpired
                          ? "Expired"
                          : `Valid till ${new Date(item.warrantyExpiry).toLocaleDateString("en-IN")}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AMC Contract:</span>
                    <span
                      className={`font-medium ${
                        item.isAmcExpired
                          ? "text-red-600"
                          : item.amcDaysRemaining && item.amcDaysRemaining <= 30
                          ? "text-amber-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {item.amcExpiry
                        ? item.isAmcExpired
                          ? "Expired"
                          : `${item.amcDaysRemaining} days left`
                        : "No AMC"}
                    </span>
                  </div>
                </div>

                {item.logs && item.logs.length > 0 && (
                  <div className="text-xs space-y-1 pt-1 border-t">
                    <span className="text-muted-foreground font-semibold">Latest Ticket:</span>
                    <p className="text-slate-800 line-clamp-1">{item.logs[0].issue}</p>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{item.logs[0].status}</span>
                      {item.logs[0].cost > 0 && <span>{formatRupee(item.logs[0].cost)}</span>}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setSelectedEquipment(item);
                      setIsLogOpen(true);
                    }}
                  >
                    <Hammer className="h-3.5 w-3.5 mr-1" /> Log Issue
                  </Button>
                  {item.status === "NEEDS_REPAIR" && item.logs[0]?.status === "OPEN" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() =>
                        resolveMaintenance.mutate({
                          logId: item.logs[0].id,
                          cost: item.logs[0].cost || 0,
                        })
                      }
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Fixed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Equipment Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Equipment</DialogTitle>
            <DialogDescription>Add a machine, fryer, or appliance to monitor maintenance.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Assigned Kiosk</Label>
              <Select value={kioskId} onValueChange={setKioskId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Kiosk" />
                </SelectTrigger>
                <SelectContent>
                  {kiosks.data?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name} ({k.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="eqName">Equipment Name</Label>
              <Input
                id="eqName"
                placeholder="e.g. Commercial Tea Maker 10L"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="brand">Brand / Model</Label>
                <Input
                  id="brand"
                  placeholder="e.g. ChaiMaster"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="serial">Serial Number</Label>
                <Input
                  id="serial"
                  placeholder="e.g. SN-8839"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="warranty">Warranty Expiry</Label>
                <Input
                  id="warranty"
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="amc">AMC Renewal Date</Label>
                <Input
                  id="amc"
                  type="date"
                  value={amcExpiry}
                  onChange={(e) => setAmcExpiry(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleCreateEquipment}
              disabled={createEquipment.isPending}
            >
              {createEquipment.isPending ? "Registering..." : "Save Equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Maintenance Issue Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Maintenance / Breakdown</DialogTitle>
            <DialogDescription>
              Record an issue for {selectedEquipment?.name} at {selectedEquipment?.kiosk?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label htmlFor="issueDesc">Issue Description</Label>
              <textarea
                id="issueDesc"
                rows={3}
                placeholder="e.g. Thermostat not heating, power trip, coil burnt..."
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full mt-1 p-2 text-sm border rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="repairCost">Estimated Cost (₹)</Label>
                <Input
                  id="repairCost"
                  type="number"
                  placeholder="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tech">Technician / Agency</Label>
                <Input
                  id="tech"
                  placeholder="e.g. Ramesh Electricals"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleLogMaintenance}
              disabled={logMaintenance.isPending}
            >
              {logMaintenance.isPending ? "Logging..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
