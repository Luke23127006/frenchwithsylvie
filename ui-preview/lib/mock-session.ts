import { cookies } from "next/headers";

export async function getPreviewRole() {
  const role = (await cookies()).get("preview_role")?.value;
  return role === "student" || role === "teacher" ? role : null;
}
