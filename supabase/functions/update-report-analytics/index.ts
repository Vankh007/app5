import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const handler = async (_req: Request): Promise<Response> => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database function to update analytics
    const { error } = await supabase.rpc("update_report_analytics");

    if (error) throw error;

    console.log("Report analytics updated successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Analytics updated" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error updating report analytics:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
