// /supabase/functions/miora-ai/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// ✅ AMPIO ITY - IMPORT SUPABASE CLIENT
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
// ✅ SUPABASE CLIENT
const SUPABASE_URL = Deno.env.get("URL_SUPABASE") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ✅ CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

// ✅ FUNCTION HITADY PRODUITS AO SUPABASE
async function searchProducts(query: string, limit: number = 5) {
  try {
    console.log('[Miora Search] 🔍 Searching products:', query);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit);
    
    if (error) {
      console.error('[Miora Search] ❌ Error:', error);
      return [];
    }
    
    console.log('[Miora Search] ✅ Found:', data?.length || 0);
    return data || [];
    
  } catch (err) {
    console.error('[Miora Search] ❌ Exception:', err);
    return [];
  }
}

// ✅ FUNCTION HAHAZO PRODUITS MAIMAIM-POANA
async function getFreeProducts(limit: number = 5) {
  try {
    console.log('[Miora Search] 🎁 Getting free products');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('price', 0)
      .limit(limit);
    
    if (error) {
      console.error('[Miora Search] ❌ Error:', error);
      return [];
    }
    
    console.log('[Miora Search] ✅ Found:', data?.length || 0, 'free products');
    return data || [];
    
  } catch (err) {
    console.error('[Miora Search] ❌ Exception:', err);
    return [];
  }
}

// ✅ FUNCTION HAHAZO PRODUITS ARAKA CATÉGORIE
async function getProductsByCategory(category: string, limit: number = 5) {
  try {
    console.log('[Miora Search] 📂 Getting category:', category);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('category', `%${category}%`)
      .limit(limit);
    
    if (error) {
      console.error('[Miora Search] ❌ Error:', error);
      return [];
    }
    
    console.log('[Miora Search] ✅ Found:', data?.length || 0);
    return data || [];
    
  } catch (err) {
    console.error('[Miora Search] ❌ Exception:', err);
    return [];
  }
}

// ✅ DETECT QUERY TYPE
function detectQueryType(message: string) {
  const msg = message.toLowerCase();
  
  // Product search
  if (/mitady|cherche|search|find/.test(msg)) {
    const match = msg.match(/mitady\s+(.+)|cherche\s+(.+)|search\s+(.+)|find\s+(.+)/i);
    if (match) {
      const query = match[1] || match[2] || match[3] || match[4];
      return { type: 'search', query: query?.trim() };
    }
  }
  
  // Free products
  if (/maimaim.?poana|gratuit|free.*produit/i.test(msg)) {
    return { type: 'free' };
  }
  
  // Category
  if (/ebook/i.test(msg)) return { type: 'category', category: 'ebook' };
  if (/video/i.test(msg)) return { type: 'category', category: 'video' };
  if (/app|jeux/i.test(msg)) return { type: 'category', category: 'apps' };
  
  return null;
}

// ✅ FORMAT PRODUCTS RESPONSE
function formatProductsResponse(products: any[], queryType: string) {
  if (!products || products.length === 0) {
    return "❌ Tsy nahita produit. Manandrama fanontaniana hafa?";
  }
  
  let response = '';
  
  if (queryType === 'search') {
    response = `🔍 **Nahita produit ${products.length}:**\n\n`;
  } else if (queryType === 'free') {
    response = `🎁 **Produits maimaim-poana (${products.length}):**\n\n`;
  } else {
    response = `📦 **Produits (${products.length}):**\n\n`;
  }
  
  products.forEach((p, i) => {
    const price = p.price > 0 ? `${p.price.toLocaleString()} AR` : '✨ MAIMAIM-POANA';
    response += `${i + 1}. **${p.title}**\n`;
    response += `   💰 ${price}\n`;
    if (p.description) {
      const desc = p.description.substring(0, 80);
      response += `   📝 ${desc}${p.description.length > 80 ? '...' : ''}\n`;
    }
    response += `\n`;
  });
  
  response += `\n💡 *Manontany fanampiana bebe kokoa raha ilaina!*`;
  
  return response;
}

serve(async (req) => {
  // ✅ CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // ✅ Health check endpoint
  if (url.pathname === "/" || url.pathname === "" || req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: "online", 
        message: "Miora AI Edge Function Running",
        version: "2.1",
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        features: ["product-search", "supabase-integration", "ai-chat"]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ✅ Main POST endpoint
  if (req.method === "POST") {
    try {
      if (!GROQ_API_KEY) {
        console.error("❌ GROQ_API_KEY tsy misy!");
        return new Response(
          JSON.stringify({ success: false, error: "GROQ_API_KEY tsy configuré" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let requestBody;
      try {
        requestBody = await req.json();
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid JSON" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { message, userId, searchContext } = requestBody;

      // ✅ Validation simple
      if (!message || typeof message !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "message ilaina" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (message.length > 50000) {
        return new Response(
          JSON.stringify({ success: false, error: "Message lava loatra (max 50000 chars)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ==========================================
      // ✅ PRIORITÉ 1: TRAITER SEARCH CONTEXT DU CLIENT
      // ==========================================
      if (searchContext) {
        console.log('[Miora] 🎯 Search context from client:', searchContext);
        
        let products = [];
        
        // Handle different query types
        if (searchContext.type === 'search' && searchContext.query) {
          console.log('[Miora] 🔍 Client search query:', searchContext.query);
          products = await searchProducts(searchContext.query, 5);
        } else if (searchContext.type === 'free') {
          console.log('[Miora] 🎁 Client wants free products');
          products = await getFreeProducts(5);
        } else if (searchContext.type === 'category' && searchContext.category) {
          console.log('[Miora] 📂 Client wants category:', searchContext.category);
          products = await getProductsByCategory(searchContext.category, 5);
        }
        
        // Return products if found
        if (products.length > 0) {
          console.log('[Miora] ✅ Returning', products.length, 'products to client');
          
          const formattedResponse = formatProductsResponse(products, searchContext.type);
          
          return new Response(
            JSON.stringify({
              success: true,
              message: formattedResponse,
              products: products, // ← IMPORTANT: Client affichera visuellement
              model: "product-search-supabase",
              searchType: searchContext.type
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log('[Miora] ⚠️ No products found for search context');
          // Continue to AI below
        }
      }

      // ==========================================
      // ✅ PRIORITÉ 2: DÉTECTION AUTOMATIQUE DANS LE MESSAGE
      // ==========================================
      const queryDetection = detectQueryType(message);

      if (queryDetection) {
        console.log('[Miora] 🎯 Auto-detected query type:', queryDetection.type);
        
        let products = [];
        
        // Handle different query types
        if (queryDetection.type === 'search' && queryDetection.query) {
          products = await searchProducts(queryDetection.query, 5);
        } else if (queryDetection.type === 'free') {
          products = await getFreeProducts(5);
        } else if (queryDetection.type === 'category' && queryDetection.category) {
          products = await getProductsByCategory(queryDetection.category, 5);
        }
        
        // Return formatted products response
        if (products.length > 0) {
          const formattedResponse = formatProductsResponse(products, queryDetection.type);
          
          return new Response(
            JSON.stringify({
              success: true,
              message: formattedResponse,
              products: products,
              model: "product-search-auto",
              searchType: queryDetection.type
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log('[Miora] ⚠️ Auto-detection found no products, using AI');
          // Continue to AI
        }
      }

      // ==========================================
      // ✅ PRIORITÉ 3: APPEL GROQ AI (FALLBACK)
      // ==========================================
      console.log("🔗 Calling Groq API...");
      
      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
              {
                role: "system",
                content: `You are Miora, a helpful AI assistant for Mijoro Boutique. You speak Malagasy, French, and English fluently. You help with design, business, and creative tasks.

IMPORTANT: Si l'utilisateur cherche des produits (mitady, cherche, search), réponds avec:
"🔍 Je cherche dans notre catalogue..."

Si aucun produit trouvé, suggère:
"Essayez: mitady [nom produit], maimaim-poana (gratuit), ebook, video, apps"`,
              },
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!groqRes.ok) {
        const errorText = await groqRes.text();
        console.error("❌ Groq error:", groqRes.status, errorText);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Groq API error",
            status: groqRes.status,
            details: errorText,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await groqRes.json();
      const reply = data?.choices?.[0]?.message?.content || "No response";

      console.log("✅ Success! Response length:", reply.length);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: reply,
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (err) {
      console.error("❌ Server error:", err);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server error",
          details: err.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
});
