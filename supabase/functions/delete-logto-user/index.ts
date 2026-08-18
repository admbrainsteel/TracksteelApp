import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOGTO_ENDPOINT = "https://logto-bzlued1boxl3t8ewsyn99an9.187.77.227.172.sslip.io";
const APP_ID = "rv73s8it14dkk6pdxegpy";
const APP_SECRET = "mB108PqAEa2pgTqNrBBdnVer12Sgf0pT";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Get Logto M2M Access Token
    const tokenResponse = await fetch(`${LOGTO_ENDPOINT}/oidc/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${APP_ID}:${APP_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        resource: "https://default.logto.app/api",
        scope: "all",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get M2M token: ${errorText}`);
    }

    const { access_token } = await tokenResponse.json();

    // 2. Find User by Email
    const searchResponse = await fetch(`${LOGTO_ENDPOINT}/api/users?search=${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Failed to search user: ${await searchResponse.text()}`);
    }

    const users = await searchResponse.json();
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "User not found in Logto" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const logtoUserId = users[0].id;

    // 3. Delete User in Logto
    const deleteResponse = await fetch(`${LOGTO_ENDPOINT}/api/users/${logtoUserId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete user: ${await deleteResponse.text()}`);
    }

    return new Response(JSON.stringify({ message: "User deleted successfully in Logto" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error deleting Logto user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
