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
    
    if (!subscription || !subscription.endpoint) {
      throw new Error('Invalid subscription');
    }
    
    // Connect Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (action === 'subscribe') {
      // ✅ Insert or update subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          is_active: true
        }, {
          onConflict: 'endpoint'
        });
      
      if (error) throw error;
      
      console.log('[Subscribe] ✓ Subscription saved');
      
      return new Response(
        JSON.stringify({ success: true, message: 'Subscribed successfully' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } else if (action === 'unsubscribe') {
      // ✅ Mark as inactive
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', subscription.endpoint);
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true, message: 'Unsubscribed successfully' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error: any) {
    console.error('[Subscribe] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
