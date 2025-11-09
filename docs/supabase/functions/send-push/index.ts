import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ✅ VAPID Keys
const VAPID_PUBLIC_KEY = "BL8QmGLYoAXQnhXStyuriTFZF_hsIMkHpuxwmRUaCVVRWuyRN5cICB8smSeorTEGQ-3welHD9lFHDma7b--l5Ic";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Send Push] 📨 Request received');
    
    // ✅ Parse request body
    const { productId, productTitle, productPrice, productType } = await req.json();
    
    console.log('[Send Push] Product:', {
      id: productId,
      title: productTitle,
      price: productPrice,
      type: productType || 'numeric (default)'
    });
    
    if (!productTitle) {
      throw new Error('Missing productTitle');
    }
    
    // ✅ Setup web-push with VAPID
    webpush.setVapidDetails(
      'mailto:joroandriamanirisoa13@gmail.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    
    // ✅ Connect to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // ✅ Fetch ACTIVE subscriptions only
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('[Send Push] ❌ Fetch error:', fetchError);
      throw fetchError;
    }
    
    console.log('[Send Push] 👥 Found', subscriptions?.length || 0, 'active subscribers');
    
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          total: 0,
          message: 'No active subscribers' 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // ✅ Build notification with dynamic type
    const type = productType || 'numeric';
    const emoji = type === 'physical' ? '📦' : '💻';
    const typeLabel = type === 'physical' ? 'produit physique' : 'produit numérique';
    const priceText = productPrice > 0 ? `${productPrice} AR` : 'Gratuit';
    
    const notificationPayload = {
      title: `${emoji} Nouveau ${typeLabel}!`,
      body: `${productTitle}\n💰 ${priceText}`,
      icon: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg',
      badge: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg',
      tag: 'new-product-' + productId,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        productId: productId,
        productType: type,
        url: '/?product=' + productId + '#shop'
      },
      actions: [
        { action: 'view', title: '👀 Voir le produit' },
        { action: 'dismiss', title: '✖ Fermer' }
      ]
    };
    
    console.log('[Send Push] 📢 Notification payload:', {
      title: notificationPayload.title,
      body: notificationPayload.body,
      type: type
    });
    
    // ✅ Send notifications with web-push
    let sent = 0;
    let failed = 0;
    let deactivated = 0;
    
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
          
          // ✅ Send notification
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationPayload)
          );
          
          sent++;
          console.log('[Send Push] ✅ Sent to:', sub.endpoint.substring(0, 60) + '...');
          return { success: true, endpoint: sub.endpoint };
          
        } catch (err: any) {
          failed++;
          console.error('[Send Push] ❌ Failed for:', sub.endpoint.substring(0, 60), err.message);
          
          // ✅ Deactivate invalid/expired subscriptions
          if (err.statusCode === 404 || err.statusCode === 410 || err.statusCode === 401) {
            try {
              await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('endpoint', sub.endpoint);
              
              deactivated++;
              console.log('[Send Push] 🗑️ Deactivated invalid subscription');
            } catch (deactivateErr) {
              console.error('[Send Push] Failed to deactivate:', deactivateErr);
            }
          }
          
          return { 
            success: false, 
            endpoint: sub.endpoint, 
            error: err.message,
            statusCode: err.statusCode 
          };
        }
      })
    );
    
    // ✅ Summary
    console.log('[Send Push] 📊 Summary:');
    console.log('  ✅ Sent:', sent);
    console.log('  ❌ Failed:', failed);
    console.log('  🗑️ Deactivated:', deactivated);
    console.log('  📊 Total:', subscriptions.length);
    
    // ✅ Return response
    return new Response(
      JSON.stringify({
        success: true,
        sent: sent,
        failed: failed,
        deactivated: deactivated,
        total: subscriptions.length,
        productType: type,
        message: `Notification ${emoji} ${typeLabel} envoyée à ${sent} abonné(s)`,
        details: results.map(r => ({
          status: r.status,
          value: r.status === 'fulfilled' ? r.value : r.reason
        }))
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
    
  } catch (error: any) {
    console.error('[Send Push] 💥 Critical error:', error);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});