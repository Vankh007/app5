import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  release_id: string;
  title: string;
  poster_path?: string;
  content_type: 'movie' | 'series';
  notification_type: 'new_upcoming' | 'released';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      release_id,
      title,
      poster_path,
      content_type,
      notification_type
    }: NotificationRequest = await req.json();

    console.log(`Sending ${notification_type} notification for: ${title}`);

    // Get all users with email notifications enabled
    // First get profile IDs with notifications enabled
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email_notifications', true);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users with email notifications enabled');
      return new Response(
        JSON.stringify({ message: 'No users to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user emails from auth.users using service role
    const profileIds = profiles.map(p => p.id);
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw authError;
    }

    // Filter to only users with notifications enabled and who have email addresses
    const users = authUsers.users
      .filter(user => profileIds.includes(user.id) && user.email)
      .map(user => ({
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0] || 'User'
      }));

    if (users.length === 0) {
      console.log('No users with valid email addresses found');
      return new Response(
        JSON.stringify({ message: 'No users to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Prepare email content based on notification type
    const subject = notification_type === 'new_upcoming'
      ? `Coming Soon: ${title}`
      : `Now Available: ${title}`;

    const message = notification_type === 'new_upcoming'
      ? `We're excited to announce that <strong>${title}</strong> is coming soon! Mark your calendar and be ready when it drops.`
      : `Great news! <strong>${title}</strong> is now available to watch. Start streaming now!`;

    const ctaText = notification_type === 'new_upcoming'
      ? 'View Details'
      : 'Watch Now';

    // Send emails to all subscribed users
    const emailPromises = users.map(async (user) => {
      try {
        const emailResponse = await resend.emails.send({
          from: "Releases <onboarding@resend.dev>",
          to: [user.email],
          subject: subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
                .poster { max-width: 300px; width: 100%; height: auto; border-radius: 8px; margin: 20px auto; display: block; }
                .button { display: inline-block; padding: 12px 30px; background: #e50914; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${subject}</h1>
                </div>
                <div class="content">
                  ${poster_path ? `<img src="${poster_path}" alt="${title}" class="poster">` : ''}
                  <h2>${title}</h2>
                  <p>${message}</p>
                  <p><strong>Type:</strong> ${content_type === 'series' ? 'TV Series' : 'Movie'}</p>
                  <center>
                    <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}" class="button">${ctaText}</a>
                  </center>
                </div>
                <div class="footer">
                  <p>You're receiving this email because you've subscribed to release notifications.</p>
                  <p>To unsubscribe, update your preferences in your account settings.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log(`Email sent to ${user.email}:`, emailResponse);
        return { success: true, email: user.email };
      } catch (emailError: any) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
        return { success: false, email: user.email, error: emailError?.message || 'Unknown error' };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    console.log(`Notification complete: ${successful}/${users.length} emails sent`);

    return new Response(
      JSON.stringify({
        message: 'Notifications sent',
        total_users: users.length,
        successful_sends: successful,
        results: results
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in send-release-notification:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
