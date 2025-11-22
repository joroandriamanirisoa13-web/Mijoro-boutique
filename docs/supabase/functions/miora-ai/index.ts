import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

// Supabase client
const SUPABASE_URL = Deno.env.get("URL_SUPABASE") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

// Utility: sanitize user-provided search text
function sanitizeText(input: string) {
  if (!input) return "";
  // remove quotes/newlines and trim
  return input.replace(/["'`\\]/g, '').replace(/\s+/g, ' ').trim();
}

// Search products in Supabase (safe-ish)
async function searchProducts(query: string, limit: number = 5) {
  try {
    const safeQuery = sanitizeText(query);
    console.log('[Miora Search] 🔍 Searching products:', safeQuery);

    if (!safeQuery) return [];

    // select useful fields only
    const { data, error } = await supabase
      .from('products')
      .select('id,title,price,description,is_free,category,stock,slug')
      .or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
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

// Get free products (price = 0 OR is_free = true)
async function getFreeProducts(limit: number = 5) {
  try {
    console.log('[Miora Search] 🎁 Getting free products');

    // Use OR to match price eq 0 or is_free true
    const { data, error } = await supabase
      .from('products')
      .select('id,title,price,description,is_free,category,stock,slug')
      .or('(price.eq.0,is_free.eq.true)')
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

// Get products by category
async function getProductsByCategory(category: string, limit: number = 5) {
  try {
    const safeCat = sanitizeText(category);
    console.log('[Miora Search] 📂 Getting category:', safeCat);

    if (!safeCat) return [];

    const { data, error } = await supabase
      .from('products')
      .select('id,title,price,description,is_free,category,stock,slug')
      .ilike('category', `%${safeCat}%`)
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

// Detect query type from message (improve as needed)
function detectQueryType(message: string) {
  const msg = (message || "").toLowerCase();

  // Search keywords
  if (/mitady|cherche|search|find|te-hikaroka|mila/i.test(msg)) {
    const match = msg.match(/mitady\s+(.+)|cherche\s+(.+)|search\s+(.+)|find\s+(.+)/i);
    if (match) {
      const query = match[1] || match[2] || match[3] || match[4];
      return { type: 'search', query: query?.trim() };
    }
    return { type: 'search', query: msg };
  }

  // Free products
  if (/maimaim.?poana|maimaimpoana|gratuit|free|tsy\s+mandoa|aza\s+mandoa/i.test(msg)) {
    return { type: 'free' };
  }

  // Category hints
  if (/ebook/i.test(msg)) return { type: 'category', category: 'ebook' };
  if (/video/i.test(msg)) return { type: 'category', category: 'video' };
  if (/app|jeux|jeu/i.test(msg)) return { type: 'category', category: 'apps' };

  return null;
}

// Normalize products for frontend (add add_to_cart payload + short_description)
function normalizeProducts(products: any[]) {
  return (products || []).map((p: any) => {
    const priceNumber = p?.price !== undefined ? Number(p.price) : 0;
    const isFree = p?.is_free === true || priceNumber === 0;
    const short_description = p?.description ? String(p.description).slice(0, 140) : '';
    return {
      id: p.id,
      title: p.title,
      price: priceNumber,
      priceText: isFree ? '✨ MAIMAIM-POANA' : `${priceNumber.toLocaleString()} AR`,
      is_free: isFree,
      short_description,
      category: p.category || null,
      stock: p.stock ?? null,
      slug: p.slug ?? null,
      // frontend should POST this payload to /api/cart or dispatch event
      add_to_cart_payload: { productId: p.id, qty: 1 }
    };
  });
}

// Build human-friendly message while keeping consistency
function buildHumanMessage(products: any[], queryType: string) {
  if (!products || products.length === 0) {
    return "❌ Tsy nahita produit. Manandrama fanontaniana hafa toy ny: mitady [nom produit], maimaim-poana (gratuit), ebook, video, apps";
  }

  let header = '';
  if (queryType === 'search') header = `🔍 Nahita produit ${products.length}:`;
  else if (queryType === 'free') header = `🎁 Produits maimaim-poana (${products.length}):`;
  else header = `📦 Produits (${products.length}):`;

  let body = products.map((p, i) => {
    return `${i + 1}. ${p.title} — ${p.priceText}\n   ${p.short_description || ''}`.trim();
  }).join('\n\n');

  return `${header}\n\n${body}\n\n💡 Azonao atao ny manoratra \"Ajouter au panier\" na tsindrio ny bouton ao amin'ny chat.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Health check
  if (url.pathname === "/" || url.pathname === "" || req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: "online",
        message: "Miora AI Edge Function Running",
        version: "2.2",
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        features: ["product-search", "supabase-integration", "ai-chat", "normalized-output"]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method === "POST") {
    try {
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

      // PRIORITÉ 1: use explicit searchContext from client
      if (searchContext) {
        console.log('[Miora] 🎯 Search context from client:', searchContext);

        let products = [];

        if (searchContext.type === 'search' && searchContext.query) {
          products = await searchProducts(searchContext.query, 10);
        } else if (searchContext.type === 'free') {
          products = await getFreeProducts(10);
        } else if (searchContext.type === 'category' && searchContext.category) {
          products = await getProductsByCategory(searchContext.category, 10);
        }

        if ((products || []).length > 0) {
          const normalized = normalizeProducts(products);
          const human = buildHumanMessage(normalized, searchContext.type || 'search');

          return new Response(
            JSON.stringify({
              success: true,
              message: human,
              products: normalized,
              model: "product-search-supabase",
              searchType: searchContext.type,
              addToCartEndpointHint: {
                method: "POST",
                url: "/api/cart", // frontend should adapt if different
                bodyExample: { userId: userId || null, productId: "<id>", qty: 1 }
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log('[Miora] ⚠️ No products found for client searchContext');
          // continue to auto-detect or fallback
        }
      }

      // PRIORITÉ 2: auto-detect from message
      const queryDetection = detectQueryType(message);

      if (queryDetection) {
        console.log('[Miora] 🎯 Auto-detected query type:', queryDetection);

        let products = [];

        if (queryDetection.type === 'search' && queryDetection.query) {
          products = await searchProducts(queryDetection.query, 10);
        } else if (queryDetection.type === 'free') {
          products = await getFreeProducts(10);
        } else if (queryDetection.type === 'category' && queryDetection.category) {
          products = await getProductsByCategory(queryDetection.category, 10);
        }

        if ((products || []).length > 0) {
          const normalized = normalizeProducts(products);
          const human = buildHumanMessage(normalized, queryDetection.type);

          return new Response(
            JSON.stringify({
              success: true,
              message: human,
              products: normalized,
              model: "product-search-auto",
              searchType: queryDetection.type,
              addToCartEndpointHint: {
                method: "POST",
                url: "/api/cart",
                bodyExample: { userId: userId || null, productId: "<id>", qty: 1 }
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log('[Miora] ⚠️ Auto-detection found no products, will fallback to AI if available');
        }
      }

      // PRIORITÉ 3: Groq AI fallback (only if key available)
      if (!GROQ_API_KEY) {
        console.warn("⚠️ GROQ_API_KEY not set; skipping Groq fallback. Returning suggestion message.");
        // Provide helpful suggestion so frontend user is guided
        return new Response(
          JSON.stringify({
            success: true,
            message: "Tsy nahita vokatra tao amin'ny catalogue izahay amin'izao fotoana izao. Azafady andramo: mitady [nom produit], maimaim-poana (gratuit), ebook, video, apps",
            products: [],
            model: "no-groq-key",
            note: "Set GROQ_API_KEY to enable AI fallback responses."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
                content: `You are Miora, a helpful AI assistant for Mijoro Boutique. You speak Malagasy, French, and English.
When the user asks about products, try to answer briefly. IMPORTANT: if you identify product listing intent, try to output a JSON array of products in this exact format:

{"products": [{"id":"<id-or-sku>","title":"...","price":0,"is_free":true,"short_description":"...","add_to_cart_payload":{"productId":"...","qty":1}}], "message":"short human-friendly message"}

If you cannot produce product data, return a simple helpful message in Malagasy or French suggesting how to search.
`
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

      // Try parsing structured JSON if the model returned it
      let parsed = null;
      try {
        parsed = JSON.parse(reply);
      } catch (_) {
        // not JSON - keep raw reply
      }

      if (parsed && parsed.products) {
        // normalize modeled products a bit (best-effort)
        const modeled = Array.isArray(parsed.products) ? parsed.products : [];
        const normalized = normalizeProducts(modeled);
        const human = parsed.message || buildHumanMessage(normalized, 'ai');

        return new Response(
          JSON.stringify({
            success: true,
            message: human,
            products: normalized,
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            searchType: "ai_fallback"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // fallback to raw reply
      return new Response(
        JSON.stringify({
          success: true,
          message: reply,
          model: "meta-llama/llama-4-scout-17b-16e-instruct"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (err) {
      console.error("❌ Server error:", err);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server error",
          details: err?.message || String(err),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
});