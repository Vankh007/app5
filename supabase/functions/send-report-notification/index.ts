import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportNotificationRequest {
  reportId: string;
  status: string;
  adminNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, status, adminNotes }: ReportNotificationRequest = await req.json();

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch report details with user email and content info
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(`
        *,
        content:content_id (
          title
        ),
        episode:episode_id (
          title,
          episode_number
        )
      `)
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      throw new Error(`Report not found: ${reportError?.message}`);
    }

    // Fetch user email from auth.users using service role
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(report.user_id);
    
    if (userError || !userData.user) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Determine the email content based on status
    let subject: string;
    let htmlContent: string;
    const contentTitle = report.content?.title || "the content";
    const episodeInfo = report.episode 
      ? ` (Episode ${report.episode.episode_number}: ${report.episode.title})`
      : "";

    if (status === "resolved") {
      subject = "Your Report Has Been Resolved";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #22c55e;">Report Resolved ✓</h1>
          <p>Hello,</p>
          <p>Thank you for reporting an issue with <strong>${contentTitle}${episodeInfo}</strong>.</p>
          <p>We're pleased to inform you that your report has been reviewed and resolved by our team.</p>
          ${adminNotes ? `
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #4b5563;"><strong>Admin Notes:</strong></p>
              <p style="margin: 10px 0 0 0;">${adminNotes}</p>
            </div>
          ` : ""}
          <p><strong>Report Type:</strong> ${report.report_type}</p>
          <p><strong>Your Description:</strong> ${report.description}</p>
          <p style="margin-top: 30px;">Thank you for helping us maintain quality content!</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
            Best regards,<br>
            The KHMERZOON Team
          </p>
        </div>
      `;
    } else if (status === "rejected") {
      subject = "Update on Your Report";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Report Update</h1>
          <p>Hello,</p>
          <p>Thank you for reporting an issue with <strong>${contentTitle}${episodeInfo}</strong>.</p>
          <p>After careful review, we've determined that this report does not require action at this time.</p>
          ${adminNotes ? `
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #4b5563;"><strong>Admin Notes:</strong></p>
              <p style="margin: 10px 0 0 0;">${adminNotes}</p>
            </div>
          ` : ""}
          <p><strong>Report Type:</strong> ${report.report_type}</p>
          <p><strong>Your Description:</strong> ${report.description}</p>
          <p style="margin-top: 30px;">If you believe this decision was made in error, please feel free to submit a new report with additional details.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
            Best regards,<br>
            The KHMERZOON Team
          </p>
        </div>
      `;
    } else {
      throw new Error(`Invalid status: ${status}`);
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "KHMERZOON <onboarding@resend.dev>",
      to: [userEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: emailResponse 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-report-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
