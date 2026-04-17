import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 0;
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    // Update config fields
    const updateFields: Record<string, unknown> = {};
    if (body.name !== undefined) updateFields.name = body.name;
    if (body.endpoint !== undefined) updateFields.endpoint = body.endpoint;
    if (body.api_key !== undefined) updateFields.api_key = body.api_key;
    if (body.enabled !== undefined) updateFields.enabled = body.enabled;
    if (body.is_maintenance !== undefined) updateFields.is_maintenance = body.is_maintenance;
    if (body.group_name !== undefined) updateFields.group_name = body.group_name || null;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("check_configs")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("check_configs")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
