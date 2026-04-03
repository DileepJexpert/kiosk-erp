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
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";

export default function TemplatesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newItems, setNewItems] = useState<{ itemId: string; defaultQty: number }[]>([]);
  const utils = trpc.useUtils();

  const templates = trpc.template.list.useQuery();
  const allItems = trpc.item.list.useQuery();
  const seasons = trpc.template.listSeasons.useQuery();
  const kiosks = trpc.kiosk.list.useQuery();

  const createTemplate = trpc.template.create.useMutation({
    onSuccess: () => {
      utils.template.list.invalidate();
      setCreateOpen(false);
      setNewItems([]);
      toast.success("Template created");
    },
    onError: (err) => toast.error(err.message),
  });

  const assignTemplate = trpc.kiosk.assignTemplate.useMutation({
    onSuccess: () => {
      utils.kiosk.list.invalidate();
      toast.success("Template assigned");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createTemplate.mutate({
      name: fd.get("name") as string,
      kioskType: fd.get("kioskType") as string,
      seasonId: (fd.get("seasonId") as string) || undefined,
      items: newItems.filter((i) => i.defaultQty > 0),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Templates</h1>
          <p className="text-muted-foreground">Manage seasonal menu templates for kiosks</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Menu Template</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input name="name" required placeholder="e.g., Winter Momo Kit" />
                </div>
                <div className="space-y-2">
                  <Label>Kiosk Type</Label>
                  <Input name="kioskType" required placeholder="e.g., Momo, Juice, Multi" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Season (optional)</Label>
                <select name="seasonId" className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="">No season</option>
                  {seasons.data?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Add Items</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  onChange={(e) => {
                    const itemId = e.target.value;
                    if (itemId && !newItems.find((i) => i.itemId === itemId)) {
                      setNewItems((prev) => [...prev, { itemId, defaultQty: 100 }]);
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">Select item to add...</option>
                  {allItems.data?.filter((i) => i.isActive && !newItems.find((n) => n.itemId === i.id)).map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                  ))}
                </select>
              </div>
              {newItems.length > 0 && (
                <div className="border rounded-md divide-y">
                  {newItems.map((ni, idx) => {
                    const item = allItems.data?.find((i) => i.id === ni.itemId);
                    return (
                      <div key={idx} className="flex items-center gap-3 p-3">
                        <span className="flex-1 text-sm">{item?.name}</span>
                        <Input
                          type="number"
                          className="w-24"
                          value={ni.defaultQty}
                          onChange={(e) => {
                            setNewItems((prev) =>
                              prev.map((item, i) => i === idx ? { ...item, defaultQty: parseInt(e.target.value) || 0 } : item)
                            );
                          }}
                          min={1}
                        />
                        <Button variant="ghost" size="sm" onClick={() => setNewItems((prev) => prev.filter((_, i) => i !== idx))}>
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createTemplate.isPending || newItems.length === 0}>
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates grid */}
      {templates.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.data?.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {template.name}
                  </CardTitle>
                  <Badge variant="outline">{template.kioskType}</Badge>
                </div>
                {template.season && (
                  <p className="text-xs text-muted-foreground">{template.season.name}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {template.items.map((ti) => (
                    <div key={ti.id} className="flex justify-between text-sm">
                      <span>{ti.item.name}</span>
                      <span className="text-muted-foreground">{ti.defaultQty} {ti.item.unit}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Used by: {template.activeKiosks.length} kiosk(s)
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {kiosks.data?.filter((k) => k.isActive && k.type === template.kioskType).map((k) => (
                      <Button
                        key={k.id}
                        variant={k.activeTemplateId === template.id ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => assignTemplate.mutate({
                          kioskId: k.id,
                          templateId: k.activeTemplateId === template.id ? null : template.id,
                        })}
                      >
                        {k.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
