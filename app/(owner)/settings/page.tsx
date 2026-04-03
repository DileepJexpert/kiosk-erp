"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Store, Users, Power } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage kiosks and operators</p>
      </div>

      <Tabs defaultValue="kiosks">
        <TabsList>
          <TabsTrigger value="kiosks" className="gap-2">
            <Store className="h-4 w-4" /> Kiosks
          </TabsTrigger>
          <TabsTrigger value="operators" className="gap-2">
            <Users className="h-4 w-4" /> Operators
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kiosks">
          <KiosksTab />
        </TabsContent>
        <TabsContent value="operators">
          <OperatorsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KiosksTab() {
  const [open, setOpen] = useState(false);
  const [editKiosk, setEditKiosk] = useState<any>(null);
  const utils = trpc.useUtils();
  const kiosks = trpc.kiosk.list.useQuery();
  const operators = trpc.user.list.useQuery({ role: "OPERATOR" });
  const managers = trpc.user.list.useQuery({ role: "MANAGER" });

  const createKiosk = trpc.kiosk.create.useMutation({
    onSuccess: () => {
      utils.kiosk.list.invalidate();
      setOpen(false);
      toast.success("Kiosk created successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateKiosk = trpc.kiosk.update.useMutation({
    onSuccess: () => {
      utils.kiosk.list.invalidate();
      setEditKiosk(null);
      toast.success("Kiosk updated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActive = trpc.kiosk.toggleActive.useMutation({
    onSuccess: () => {
      utils.kiosk.list.invalidate();
      toast.success("Kiosk status updated");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createKiosk.mutate({
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      location: formData.get("location") as string,
      address: (formData.get("address") as string) || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const operatorId = formData.get("operatorId") as string;
    const managerId = formData.get("managerId") as string;
    updateKiosk.mutate({
      id: editKiosk.id,
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      location: formData.get("location") as string,
      address: (formData.get("address") as string) || undefined,
      operatorId: operatorId === "none" ? null : operatorId || undefined,
      managerId: managerId === "none" ? null : managerId || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">All Kiosks</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Kiosk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Kiosk</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g., Momo Point" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input id="type" name="type" required placeholder="e.g., Momo, Juice, Multi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" required placeholder="e.g., Sector 18, Noida" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input id="address" name="address" placeholder="Full address" />
              </div>
              <Button type="submit" className="w-full" disabled={createKiosk.isPending}>
                {createKiosk.isPending ? "Creating..." : "Create Kiosk"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {kiosks.isLoading ? (
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
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kiosks.data?.map((kiosk) => (
                <TableRow key={kiosk.id}>
                  <TableCell className="font-medium">{kiosk.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{kiosk.type}</Badge>
                  </TableCell>
                  <TableCell>{kiosk.location}</TableCell>
                  <TableCell>{kiosk.operator?.name || "—"}</TableCell>
                  <TableCell>{kiosk.manager?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={kiosk.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-100"}>
                      {kiosk.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditKiosk(kiosk)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive.mutate({ id: kiosk.id })}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editKiosk} onOpenChange={(v) => !v && setEditKiosk(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Kiosk</DialogTitle>
            </DialogHeader>
            {editKiosk && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={editKiosk.name} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input name="type" defaultValue={editKiosk.type} required />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input name="location" defaultValue={editKiosk.location} required />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="address" defaultValue={editKiosk.address || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <select name="operatorId" defaultValue={editKiosk.operatorId || "none"} className="w-full border rounded-md px-3 py-2 text-sm">
                    <option value="none">No operator</option>
                    {operators.data?.filter(o => o.isActive).map((op) => (
                      <option key={op.id} value={op.id}>{op.name} ({op.phone})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Manager</Label>
                  <select name="managerId" defaultValue={editKiosk.managerId || "none"} className="w-full border rounded-md px-3 py-2 text-sm">
                    <option value="none">No manager</option>
                    {managers.data?.filter(m => m.isActive).map((mg) => (
                      <option key={mg.id} value={mg.id}>{mg.name} ({mg.phone})</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={updateKiosk.isPending}>
                  {updateKiosk.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function OperatorsTab() {
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const utils = trpc.useUtils();
  const users = trpc.user.list.useQuery();

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      setOpen(false);
      toast.success("User created successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      setEditUser(null);
      toast.success("User updated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUser.mutate({
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as "MANAGER" | "OPERATOR",
      aadhaar: (formData.get("aadhaar") as string) || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateUser.mutate({
      id: editUser.id,
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      aadhaar: (formData.get("aadhaar") as string) || undefined,
      isActive: formData.get("isActive") === "true",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">All Users</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" required placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Phone (10 digits)</Label>
                <Input name="phone" required placeholder="9876543210" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select name="role" className="w-full border rounded-md px-3 py-2 text-sm" defaultValue="OPERATOR">
                  <option value="OPERATOR">Operator</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Aadhaar (optional)</Label>
                <Input name="aadhaar" placeholder="Aadhaar number" />
              </div>
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {users.isLoading ? (
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
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Kiosk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.role === "OWNER" ? "border-purple-300 text-purple-700" :
                      user.role === "MANAGER" ? "border-blue-300 text-blue-700" :
                      "border-green-300 text-green-700"
                    }>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.assignedKiosk?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={user.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-100"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.role !== "OWNER" && (
                      <Button variant="ghost" size="icon" onClick={() => setEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            {editUser && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={editUser.name} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={editUser.phone} required maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label>Aadhaar</Label>
                  <Input name="aadhaar" defaultValue={editUser.aadhaar || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Active</Label>
                  <select name="isActive" defaultValue={String(editUser.isActive)} className="w-full border rounded-md px-3 py-2 text-sm">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
