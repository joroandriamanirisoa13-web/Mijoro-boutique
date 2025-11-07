import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7"; // ✅ AMPIO ITO

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ✅ VAPID Setup
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL = "mailto:joroandriamanirisoa13@gmail.com";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

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

    // ✅ PAYLOAD
    const payload = JSON.stringify({
      title: "🆕 Nouveau produit Mijoro!",
      body: `${productTitle}${productPrice ? ` - ${productPrice.toLocaleString('fr-MG')} AR` : ""}`,
      icon: "https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg",
      badge: "https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg",
      tag: "new-product-" + (productId || Date.now()),
      data: {
        productId: productId || "new",
        url: productId ? `/?product=${productId}#shop` : "/#shop",
      },
    });

    // ✅ SEND TO ALL
    let sent = 0;
    const sendPromises = subscribers.map(async (sub) => {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: sub.keys,
        };

        await webpush.sendNotification(subscription, payload);
        sent++;
        
        // Log success
        await supabase.from("notification_logs").insert({
          subscription_id: sub.id,
          title: "🆕 Nouveau produit Mijoro!",
          body: `${productTitle}`,
          success: true,
          product_id: productId || null,
        });

        console.log(`✅ Sent to ${sub.endpoint.substring(0, 50)}`);
      } catch (err: any) {
        console.error(`❌ Failed for ${sub.endpoint.substring(0, 30)}:`, err.message);
        
        // Mark as failed + disable if gone
        if (err.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
        }
        
        await supabase.from("notification_logs").insert({
          subscription_id: sub.id,
          title: "🆕 Nouveau produit Mijoro!",
          body: `${productTitle}`,
          success: false,
          error_message: err.message,
          product_id: productId || null,
        });
      }
    });

    await Promise.allSettled(sendPromises);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        total: subscribers.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
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
