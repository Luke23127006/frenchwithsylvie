import { z } from "zod";
import { cookies } from "next/headers";
import { verifyToken, TokenPayload } from "./auth";
import { createClient } from "./supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export type ActionContext<T> = {
  input: T;
  user: TokenPayload;
  supabase: SupabaseClient;
};

export type PublicActionContext<T> = {
  input: T;
  supabase: SupabaseClient;
};

export function createSafeAction<S extends z.ZodTypeAny, R>(
  schema: S,
  roles: ("teacher" | "student" | "admin")[],
  handler: (context: ActionContext<z.infer<S>>) => Promise<R>
) {
  return async (input: z.infer<S>): Promise<{ data?: R; error?: string; authError?: string }> => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_token")?.value;
      if (!token) return { error: "Not authenticated", authError: "Not authenticated" };
      
      const user = await verifyToken(token) as TokenPayload | null;
      if (!user) return { error: "Invalid token", authError: "Invalid token" };

      if (roles.length > 0 && !roles.includes(user.role as "teacher" | "student" | "admin")) {
        return { error: "Unauthorized", authError: "Unauthorized" };
      }

      const parsedInput = schema.safeParse(input);
      if (!parsedInput.success) {
        return { error: `Invalid input: ${parsedInput.error.message}` };
      }

      const supabase = await createClient();

      const data = await handler({ input: parsedInput.data, user, supabase });
      return { data };
    } catch (error: any) {
      console.error("Safe action error:", error);
      return { error: error.message || "An unexpected error occurred" };
    }
  };
}

export function createPublicAction<S extends z.ZodTypeAny, R>(
  schema: S,
  handler: (context: PublicActionContext<z.infer<S>>) => Promise<R>
) {
  return async (input: z.infer<S>): Promise<{ data?: R; error?: string }> => {
    try {
      const parsedInput = schema.safeParse(input);
      if (!parsedInput.success) {
        return { error: `Invalid input: ${parsedInput.error.message}` };
      }

      const supabase = await createClient();

      const data = await handler({ input: parsedInput.data, supabase });
      return { data };
    } catch (error: any) {
      console.error("Public action error:", error);
      return { error: error.message || "An unexpected error occurred" };
    }
  };
}
