import { previewData } from "@/lib/mock-data";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const type = request.headers.get("content-type") ?? "";
  if (type !== "application/pdf" && !type.startsWith("audio/") && !type.startsWith("video/webm")) {
    return new Response("Select a PDF or audio file.", { status: 415 });
  }
  const bytes = await request.arrayBuffer();
  previewData.files.set(id, { bytes, type });
  return new Response(null, { status: 204 });
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const file = previewData.files.get(id);
  if (!file) return new Response(null, { status: 404 });
  return new Response(file.bytes, { headers: { "Content-Type": file.type, "X-Content-Type-Options": "nosniff" } });
}
