"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const PROVIDER_TYPES = ["openai", "gemini", "anthropic"] as const;

const DEFAULT_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com",
  gemini: "https://generativelanguage.googleapis.com",
  anthropic: "https://api.anthropic.com",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ChannelFormData {
  name: string;
  type: string;
  model: string;
  endpoint: string;
  api_key: string;
  group_name: string;
  enabled: boolean;
}

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

function getModelFromEditData(editData: any): string {
  const m = editData?.check_models;
  const model = Array.isArray(m) ? m[0] : m;
  return model?.model ?? "";
}

export function ChannelDialog({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: ChannelDialogProps) {
  const isEdit = !!editData;
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState<ChannelFormData>({
    name: "",
    type: "openai",
    model: "",
    endpoint: DEFAULT_ENDPOINTS.openai,
    api_key: "",
    group_name: "",
    enabled: true,
  });

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name ?? "",
        type: editData.type ?? "openai",
        model: getModelFromEditData(editData),
        endpoint: editData.endpoint ?? "",
        api_key: editData.api_key ?? "",
        group_name: editData.group_name ?? "",
        enabled: editData.enabled ?? true,
      });
    } else {
      setForm({
        name: "",
        type: "openai",
        model: "",
        endpoint: DEFAULT_ENDPOINTS.openai,
        api_key: "",
        group_name: "",
        enabled: true,
      });
    }
    setShowKey(false);
  }, [editData, open]);

  function updateField(field: keyof ChannelFormData, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "type" && typeof value === "string" && !isEdit) {
        next.endpoint = DEFAULT_ENDPOINTS[value] ?? "";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEdit
        ? `/api/admin/channels/${editData.id}`
        : "/api/admin/channels";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "操作失败");
      }
      toast.success(isEdit ? "渠道已更新" : "渠道已创建");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑渠道" : "新增渠道"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>渠道名称</Label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="例如：主力 OpenAI"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={form.type}
                onValueChange={(v) => updateField("type", v)}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>模型</Label>
              <Input
                value={form.model}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="例如：gpt-4o-mini"
                required
                disabled={isEdit}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Input
              value={form.endpoint}
              onChange={(e) => updateField("endpoint", e.target.value)}
              placeholder="https://api.openai.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={form.api_key}
                onChange={(e) => updateField("api_key", e.target.value)}
                placeholder="sk-..."
                required={!isEdit}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? "隐藏" : "显示"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>分组（可选）</Label>
            <Input
              value={form.group_name}
              onChange={(e) => updateField("group_name", e.target.value)}
              placeholder="例如：生产环境"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => updateField("enabled", v)}
            />
            <Label>启用检测</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
