import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ✅ FIXED: Alaina ny private key avy any amin'ny env
const VAPID_PUBLIC_KEY = "BL8QmGLYoAXQnhXStyuriTFZF_hsIMkHpuxwmRUaCVVRWuyRN5cICB8smSeorTEGQ-3welHD9lFHDma7b--l5Ic";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

// ✅ AJOUTEZ: Import web-push library
import webpush from "npm:web-push@3.6.6";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Send Push] Request received');
    
    const { productId, productTitle, productPrice } = await req.json();
    
    if (!productTitle) {
      throw new Error('Missing productTitle');
    }
    
    // ✅ Setup web-push
    webpush.setVapidDetails(
      'mailto:joroandriamanirisoa13@gmail.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    
    // Connect Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // ✅ Fetch ACTIVE subscriptions only
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);
    
    if (fetchError) throw fetchError;
    
    console.log('[Send Push] Found', subscriptions?.length || 0, 'active subscribers');
    
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscribers' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Build notification payload
    const priceText = productPrice > 0 ? `${productPrice} AR` : 'Gratuit';
    const notificationPayload = {
      title: '🆕 Nouveau produit!',
      body: `${productTitle}\n💰 ${priceText}`,
      icon: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg',
      badge: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg',
      tag: 'new-product-' + productId,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        productId: productId,
        url: '/?product=' + productId + '#shop'
      },
      actions: [
        { action: 'view', title: '👀 Voir' },
        { action: 'dismiss', title: 'Fermer' }
      ]
    };
    
    // ✅ Send using web-push library
    let sent = 0;
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // ✅ Parse subscription object
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh
            }
          };
          
          // ✅ Send using web-push
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload)
          );
          
          sent++;
          console.log('[Send Push] ✓ Sent to:', sub.endpoint.substring(0, 50));
          return { success: true };
          
        } catch (err) {
          console.error('[Send Push] ❌ Failed:', err);
          
          // ✅ Deactivate invalid subscriptions
          if (err.statusCode === 404 || err.statusCode === 410 || err.statusCode === 401) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('endpoint', sub.endpoint);
            console.log('[Send Push] Deactivated invalid subscription');
          }
          
          return { success: false, error: err.message };
        }
      })
    );
    
    console.log('[Send Push] ✓ Sent to', sent, '/', subscriptions.length);
    
    return new Response(
      JSON.stringify({
        success: true,
        sent: sent,
        total: subscriptions.length,
        details: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error('[Send Push] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});