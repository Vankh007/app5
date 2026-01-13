import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting upcoming releases status update...');

    // Get all upcoming releases that have passed their release date
    const { data: upcomingReleases, error: fetchError } = await supabase
      .from('upcoming_releases')
      .select('*')
      .eq('status', 'upcoming')
      .lte('release_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching upcoming releases:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${upcomingReleases?.length || 0} releases to update`);

    if (!upcomingReleases || upcomingReleases.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No releases to update', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to 'released' for all eligible releases
    const { data: updatedReleases, error: updateError } = await supabase
      .from('upcoming_releases')
      .update({ status: 'released' })
      .eq('status', 'upcoming')
      .lte('release_date', new Date().toISOString())
      .select();

    if (updateError) {
      console.error('Error updating releases:', updateError);
      throw updateError;
    }

    console.log(`Successfully updated ${updatedReleases?.length || 0} releases to 'released'`);

    // Trigger notification edge function for newly released items
    if (updatedReleases && updatedReleases.length > 0) {
      for (const release of updatedReleases) {
        try {
          await supabase.functions.invoke('send-release-notification', {
            body: {
              release_id: release.id,
              title: release.title,
              poster_path: release.poster_path,
              content_type: release.content_type,
              notification_type: 'released'
            }
          });
          console.log(`Notification sent for release: ${release.title}`);
        } catch (notifError) {
          console.error(`Failed to send notification for ${release.title}:`, notifError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Status update completed',
        updated_count: updatedReleases?.length || 0,
        releases: updatedReleases
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in update-upcoming-status:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
