"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { MoreHorizontal, Plus, LogOut, Copy } from "lucide-react";
import { ChannelDialog } from "./channel-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 3)}***${key.slice(-4)}`;
}

function getModelName(channel: any): string {
  const m = channel.check_models;
  const model = Array.isArray(m) ? m[0] : m;
  return model?.model ?? "-";
}

export function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/channels");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setChannels(data);
    } catch {
      toast.error("加载渠道列表失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  async function handleToggle(id: string, enabled: boolean) {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled } : c))
    );
    try {
      const res = await fetch(`/api/admin/channels/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(enabled ? "已启用" : "已暂停");
    } catch {
      setChannels((prev) =>
        prev.map((c) => (c.id === id ? { ...c, enabled: !enabled } : c))
      );
      toast.error("操作失败");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/channels/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("已删除");
      setDeleteTarget(null);
      fetchChannels();
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  function handleCopyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("已复制 API Key");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">渠道管理</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setEditData(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              新增渠道
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-12">加载中...</p>
        ) : channels.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            暂无渠道，点击「新增渠道」开始配置
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((ch) => (
                  <TableRow key={ch.id}>
                    <TableCell className="font-medium">{ch.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ch.type}</Badge>
                    </TableCell>
                    <TableCell>{getModelName(ch)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {ch.endpoint}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs font-mono">
                        {maskApiKey(ch.api_key)}
                        <button
                          onClick={() => handleCopyKey(ch.api_key)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {ch.group_name || "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={ch.enabled}
                        onCheckedChange={(v) => handleToggle(ch.id, v)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditData(ch);
                              setDialogOpen(true);
                            }}
                          >
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(ch)}
                          >
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <ChannelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchChannels}
        editData={editData}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        channelName={deleteTarget?.name ?? ""}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
