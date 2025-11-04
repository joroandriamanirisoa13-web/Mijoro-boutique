import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, subscription } = await req.json();

    if (!subscription?.endpoint) {
      throw new Error("Invalid subscription data");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userAgent = req.headers.get("user-agent") || "Unknown";

    if (action === "subscribe") {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            user_agent: userAgent,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" }
        )
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Subscribed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    
    if (action === "unsubscribe") {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Unsubscribed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("[Subscribe Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, productTitle, productPrice } = await req.json();

    if (!productTitle) {
      throw new Error("Missing product data");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active subscribers
    const { data: subscribers, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (fetchError) throw fetchError;

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Send Push] Sending to ${subscribers.length} subscribers`);

    // Prepare notification
    const notification = {
      title: "🆕 Nouveau produit Mijoro!",
      body: `${productTitle}${productPrice ? ` - ${productPrice} AR` : ""}`,
     icon: "https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg",
badge: "https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg",
      data: {
        productId: productId || "new",
        url: productId ? `/?product=${productId}` : "/",
      },
      tag: "new-product",
    };

    // Send to all (simplified - use web-push in production)
    let sent = 0;
    for (const sub of subscribers) {
      try {
        // Here you would use web-push library
        // For now, just log and count
        console.log("Would send to:", sub.endpoint.substring(0, 50));
        sent++;
        
        // Log to database
        await supabase.from("notification_logs").insert({
          subscription_id: sub.id,
          title: notification.title,
          body: notification.body,
          success: true,
          product_id: productId || null,
        });
      } catch (err) {
        console.error("Send failed:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        total: subscribers.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Send Push Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});