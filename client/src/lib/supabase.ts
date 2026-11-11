import { createClient } from "@supabase/supabase-js";

// These values are intentionally browser-safe: a project URL and publishable key.
// Never place a service-role key, GitHub token, or YouTube token in this file.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://nzsqrcnvahlxvxcbdibj.supabase.co";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_vV25fprjA_FCAQ-QLwhSqA_R7k46TtX";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type UploadJob = {
  id: string;
  source_url: string | null;
  title: string | null;
  description: string | null;
  status: "draft" | "approved" | "processing" | "uploaded" | "failed" | "archived";
  created_at: string;
  youtube_video_id: string | null;
  last_error: string | null;
};
