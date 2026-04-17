import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("check_configs")
      .select(
        "id, name, type, model_id, endpoint, api_key, enabled, is_maintenance, group_name, created_at, check_models(id, type, model, template_id, check_request_templates(id, name, type, request_header, metadata))"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

interface CreateChannelBody {
  name: string;
  type: "openai" | "gemini" | "anthropic";
  model: string;
  endpoint: string;
  api_key: string;
  group_name?: string;
  enabled?: boolean;
  template_id?: string;
  request_header?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body: CreateChannelBody = await request.json();
    const { name, type, model, endpoint, api_key, group_name, enabled = true } = body;

    if (!name || !type || !model || !endpoint || !api_key) {
      return NextResponse.json(
        { error: "缺少必填字段: name, type, model, endpoint, api_key" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Resolve or create template
    let templateId = body.template_id;
    if (!templateId) {
      const templateName = `${type}-default`;
      const { data: existing } = await supabase
        .from("check_request_templates")
        .select("id")
        .eq("name", templateName)
        .eq("type", type)
        .single();

      if (existing) {
        templateId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from("check_request_templates")
          .insert({
            name: templateName,
            type,
            request_header: body.request_header ?? null,
            metadata: body.metadata ?? null,
          })
          .select("id")
          .single();
        if (error) {
          return NextResponse.json({ error: `创建模板失败: ${error.message}` }, { status: 500 });
        }
        templateId = created.id;
      }
    }

    // 2. Resolve or create model
    const { data: existingModel } = await supabase
      .from("check_models")
      .select("id")
      .eq("type", type)
      .eq("model", model)
      .eq("template_id", templateId)
      .single();

    let modelId: string;
    if (existingModel) {
      modelId = existingModel.id;
    } else {
      const { data: createdModel, error } = await supabase
        .from("check_models")
        .insert({ type, model, template_id: templateId })
        .select("id")
        .single();
      if (error) {
        return NextResponse.json({ error: `创建模型失败: ${error.message}` }, { status: 500 });
      }
      modelId = createdModel.id;
    }

    // 3. Create config
    const { data: config, error } = await supabase
      .from("check_configs")
      .insert({
        name,
        type,
        model_id: modelId,
        endpoint,
        api_key,
        enabled,
        group_name: group_name || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `创建渠道失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(config, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
