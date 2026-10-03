import { timingSafeEqual } from "node:crypto";
import { cleanupFeedbackFiles } from "@/lib/feedback-server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  await cleanupFeedbackFiles();
  return Response.json({ success: true });
}
