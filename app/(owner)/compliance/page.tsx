"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function CompliancePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [kioskId, setKioskId] = useState("");
  const [docType, setDocType] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const kiosks = trpc.kiosk.list.useQuery();
  const docs = trpc.compliance.list.useQuery();
  const expiring = trpc.compliance.getExpiring.useQuery({ daysAhead: 30 });

  const createDoc = trpc.compliance.create.useMutation({
    onSuccess: () => {
      toast.success("Document added");
      setCreateOpen(false);
      setDocType(""); setDocumentNo(""); setIssuedDate(""); setExpiryDate("");
      docs.refetch();
      expiring.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!kioskId || !docType || !documentNo || !issuedDate || !expiryDate) return;
    createDoc.mutate({
      kioskId,
      type: docType,
      documentNo,
      issueDate: new Date(issuedDate),
      expiryDate: new Date(expiryDate),
    });
  };

  const isExpired = (date: Date | string) => new Date(date) < new Date();
  const isExpiringSoon = (date: Date | string) => {
    const d = new Date(date);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return d <= thirtyDays && d >= new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance & FSSAI</h1>
          <p className="text-muted-foreground">Manage licenses and compliance documents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Add Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Compliance Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Kiosk</Label>
                <Select value={kioskId} onValueChange={setKioskId}>
                  <SelectTrigger><SelectValue placeholder="Select kiosk" /></SelectTrigger>
                  <SelectContent>
                    {kiosks.data?.map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FSSAI">FSSAI License</SelectItem>
                    <SelectItem value="FIRE_SAFETY">Fire Safety</SelectItem>
                    <SelectItem value="TRADE_LICENSE">Trade License</SelectItem>
                    <SelectItem value="HEALTH_PERMIT">Health Permit</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document Number</Label>
                <Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issued Date</Label>
                  <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createDoc.isPending} className="w-full">
                {createDoc.isPending ? "Saving..." : "Save Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expiring Soon Alert */}
      {expiring.data && expiring.data.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Expiring Soon ({expiring.data.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiring.data.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-sm">
                  <span>
                    <strong>{doc.type}</strong> - {doc.kiosk.name} ({doc.documentNo})
                  </span>
                  <Badge className={isExpired(doc.expiryDate) ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                    {isExpired(doc.expiryDate) ? "EXPIRED" : `Expires ${formatDate(doc.expiryDate)}`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            All Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {docs.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kiosk</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Document No</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.data?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.kiosk.name}</TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{doc.documentNo}</TableCell>
                    <TableCell>{formatDate(doc.issueDate)}</TableCell>
                    <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                    <TableCell>
                      {isExpired(doc.expiryDate) ? (
                        <Badge className="bg-red-100 text-red-700">Expired</Badge>
                      ) : isExpiringSoon(doc.expiryDate) ? (
                        <Badge className="bg-amber-100 text-amber-700">Expiring Soon</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">Valid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {docs.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No documents found
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
