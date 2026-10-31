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
import { Building2, Calculator, CheckCircle2, Phone, UserCheck, Percent, FileCheck } from "lucide-react";
import { toast } from "sonner";

export default function FranchisePage() {
  const [selectedKiosk, setSelectedKiosk] = useState<any>(null);
  const [isAgreementOpen, setIsAgreementOpen] = useState(false);
  const [modelType, setModelType] = useState<"COMPANY_OWNED" | "FOCO" | "FOFO">("COMPANY_OWNED");
  const [royaltyPercent, setRoyaltyPercent] = useState<number>(0);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  const [calcMonth, setCalcMonth] = useState<number>(new Date().getMonth() + 1);
  const [calcYear, setCalcYear] = useState<number>(new Date().getFullYear());

  const kiosks = trpc.franchise.listKiosks.useQuery();

  const updateAgreement = trpc.franchise.updateAgreement.useMutation({
    onSuccess: () => {
      toast.success("Franchise terms updated successfully!");
      setIsAgreementOpen(false);
      kiosks.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const calculateRoyalty = trpc.franchise.calculateMonthRoyalty.useMutation({
    onSuccess: (data: any) => {
      toast.success(
        `Calculated royalty: ${formatRupee(data.payout.royaltyAmount)} across ${data.billCount} bills`
      );
      kiosks.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markPaid = trpc.franchise.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Payout marked as paid!");
      kiosks.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openAgreementDialog = (kiosk: any) => {
    setSelectedKiosk(kiosk);
    setModelType(kiosk.modelType || "COMPANY_OWNED");
    setRoyaltyPercent(kiosk.royaltyPercent || 0);
    setOwnerName(kiosk.franchiseOwnerName || "");
    setOwnerPhone(kiosk.franchiseOwnerPhone || "");
    setIsAgreementOpen(true);
  };

  const handleSaveAgreement = () => {
    if (!selectedKiosk) return;
    updateAgreement.mutate({
      kioskId: selectedKiosk.id,
      modelType,
      royaltyPercent: Number(royaltyPercent) || 0,
      franchiseOwnerName: ownerName.trim() || null,
      franchiseOwnerPhone: ownerPhone.trim() || null,
    });
  };

  const handleCalculateRoyalty = (kioskId: string) => {
    calculateRoyalty.mutate({
      kioskId,
      month: Number(calcMonth),
      year: Number(calcYear),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-orange-600" />
            Franchise & Royalty Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage FOCO and FOFO franchise agreements, calculate automated monthly royalty splits, and track payouts.
          </p>
        </div>
      </div>

      {/* Model explanation pill banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs">
          <span className="font-bold text-slate-800">Company-Owned:</span> 100% brand managed and owned. Zero royalty deductions.
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
          <span className="font-bold text-blue-900">FOCO (Franchise Owned, Co. Operated):</span> Partner owns kiosk asset; brand operates and retains 8-12% management fee.
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs">
          <span className="font-bold text-emerald-900">FOFO (Franchise Owned, Franchise Operated):</span> Partner operates kiosk; pays 5-8% brand royalty on monthly billing.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {kiosks.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading franchise network...</p>
        ) : (
          kiosks.data?.map((kiosk: any) => (
            <Card key={kiosk.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50/60 pb-3 border-b">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold">{kiosk.name}</CardTitle>
                      <Badge
                        variant={
                          kiosk.modelType === "COMPANY_OWNED"
                            ? "secondary"
                            : kiosk.modelType === "FOCO"
                            ? "default"
                            : "outline"
                        }
                      >
                        {kiosk.modelType}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{kiosk.location} • {kiosk.type}</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" onClick={() => openAgreementDialog(kiosk)}>
                      Edit Agreement
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Royalty / Fee Rate:</span>
                    <span className="font-bold text-slate-900 text-base">{kiosk.royaltyPercent}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Franchise Partner:</span>
                    <span className="font-medium text-slate-800">
                      {kiosk.franchiseOwnerName || "Company Managed"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Contact Phone:</span>
                    <span className="font-mono text-slate-700">
                      {kiosk.franchiseOwnerPhone ? `+91 ${kiosk.franchiseOwnerPhone}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-end">
                    {kiosk.modelType !== "COMPANY_OWNED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs"
                        onClick={() => handleCalculateRoyalty(kiosk.id)}
                        disabled={calculateRoyalty.isPending}
                      >
                        <Calculator className="h-3.5 w-3.5 mr-1" />
                        Calc Month Royalty
                      </Button>
                    )}
                  </div>
                </div>

                {/* Historical Payout Ledger */}
                {kiosk.franchisePayouts && kiosk.franchisePayouts.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <span className="text-xs font-semibold uppercase text-muted-foreground block">
                      Recent Royalty Settlements & Payouts
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b text-left">
                            <th className="py-1.5">Period</th>
                            <th className="py-1.5 text-right">Gross Sales</th>
                            <th className="py-1.5 text-right">Royalty Due</th>
                            <th className="py-1.5 text-center">Status</th>
                            <th className="py-1.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kiosk.franchisePayouts.map((payout: any) => (
                            <tr key={payout.id} className="border-b">
                              <td className="py-2 font-medium">
                                {new Date(payout.year, payout.month - 1).toLocaleDateString("en-IN", {
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-2 text-right">{formatRupee(payout.grossSales)}</td>
                              <td className="py-2 text-right font-bold text-orange-600">
                                {formatRupee(payout.royaltyAmount)}
                              </td>
                              <td className="py-2 text-center">
                                <Badge
                                  variant={payout.status === "PAID" ? "default" : "destructive"}
                                  className="text-[10px]"
                                >
                                  {payout.status}
                                </Badge>
                              </td>
                              <td className="py-2 text-right">
                                {payout.status === "PENDING" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => markPaid.mutate({ payoutId: payout.id })}
                                    disabled={markPaid.isPending}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Agreement Dialog */}
      <Dialog open={isAgreementOpen} onOpenChange={setIsAgreementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Franchise Agreement — {selectedKiosk?.name}</DialogTitle>
            <DialogDescription>
              Configure the operating model and royalty percentages for this location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div>
              <Label>Operating Model</Label>
              <Select
                value={modelType}
                onValueChange={(val: any) => setModelType(val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY_OWNED">Company-Owned (100% Brand Owned)</SelectItem>
                  <SelectItem value="FOCO">FOCO (Franchise Owned, Co. Operated)</SelectItem>
                  <SelectItem value="FOFO">FOFO (Franchise Owned, Franchise Operated)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="royalty">Royalty / Brand Fee (%)</Label>
              <Input
                id="royalty"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={royaltyPercent}
                onChange={(e) => setRoyaltyPercent(Number(e.target.value) || 0)}
                className="mt-1"
                placeholder="e.g. 8.0"
              />
            </div>

            <div>
              <Label htmlFor="ownerName">Franchise Partner Name</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="mt-1"
                placeholder="e.g. Rohan Mehra"
              />
            </div>

            <div>
              <Label htmlFor="ownerPhone">Franchise Partner Phone (+91)</Label>
              <Input
                id="ownerPhone"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="mt-1"
                placeholder="10-digit mobile number"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAgreementOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleSaveAgreement}
              disabled={updateAgreement.isPending}
            >
              {updateAgreement.isPending ? "Saving..." : "Save Agreement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
