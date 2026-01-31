import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SpendingData {
  totalMonth: number;
  totalPreviousMonth: number;
  topCategories: { name: string; amount: number }[];
  person1Paid: number;
  person2Paid: number;
  expenseCount: number;
  uniqueDays: number;
  uniqueCategories: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get couple_id from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const coupleId = user.app_metadata?.couple_id;
    if (!coupleId) {
      return new Response(JSON.stringify({ error: "No couple_id found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch expenses and profiles
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const minLearningDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [expensesRes, profilesRes, tagsRes] = await Promise.all([
      supabaseClient.from('expenses').select('*').eq('couple_id', coupleId),
      supabaseClient.from('profiles').select('*').eq('couple_id', coupleId),
      supabaseClient.from('tags').select('*').eq('couple_id', coupleId),
    ]);

    const expenses = expensesRes.data || [];
    const profiles = profilesRes.data || [];
    const tags = tagsRes.data || [];

    // Check learning progress
    const uniqueDays = new Set(expenses.map(e => e.expense_date)).size;
    const uniqueCategories = new Set(expenses.filter(e => e.tag_id).map(e => e.tag_id)).size;
    const hasEnoughData = uniqueDays >= 7 && expenses.length >= 5 && uniqueCategories >= 2;

    if (!hasEnoughData) {
      return new Response(JSON.stringify({
        success: true,
        learning: true,
        progress: {
          days: uniqueDays,
          expenses: expenses.length,
          categories: uniqueCategories,
          minDays: 7,
          minExpenses: 5,
          minCategories: 2,
        },
        insights: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate spending data
    const thisMonthExpenses = expenses.filter(e => e.expense_date >= startOfMonth);
    const prevMonthExpenses = expenses.filter(e => 
      e.expense_date >= startOfPrevMonth && e.expense_date <= endOfPrevMonth
    );

    const totalMonth = thisMonthExpenses.reduce((sum, e) => sum + e.total_amount, 0);
    const totalPreviousMonth = prevMonthExpenses.reduce((sum, e) => sum + e.total_amount, 0);

    // Group by category
    const categoryTotals: Record<string, number> = {};
    thisMonthExpenses.forEach(e => {
      const tagId = e.tag_id || 'outros';
      categoryTotals[tagId] = (categoryTotals[tagId] || 0) + e.total_amount;
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tagId, amount]) => {
        const tag = tags.find(t => t.id === tagId);
        return { name: tag?.name || 'Outros', amount };
      });

    // Calculate who paid more
    const person1Expenses = thisMonthExpenses.filter(e => e.paid_by === 1);
    const person2Expenses = thisMonthExpenses.filter(e => e.paid_by === 2);
    const person1Paid = person1Expenses.reduce((sum, e) => sum + e.total_amount, 0);
    const person2Paid = person2Expenses.reduce((sum, e) => sum + e.total_amount, 0);

    // Generate insights using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const person1Name = profiles.find(p => p.position === 1)?.name || 'Pessoa 1';
    const person2Name = profiles.find(p => p.position === 2)?.name || 'Pessoa 2';
    const trend = totalPreviousMonth > 0 
      ? ((totalMonth - totalPreviousMonth) / totalPreviousMonth * 100).toFixed(0) 
      : 'N/A';

    const prompt = `Você é um assistente financeiro simpático para casais brasileiros.

Dados do casal:
- Total gasto esse mês: R$ ${totalMonth.toFixed(2)}
- Total mês anterior: R$ ${totalPreviousMonth.toFixed(2)}
- Tendência: ${trend}%
- Categorias mais usadas: ${topCategories.map(c => `${c.name} (R$ ${c.amount.toFixed(2)})`).join(', ')}
- ${person1Name} pagou: R$ ${person1Paid.toFixed(2)} (${totalMonth > 0 ? ((person1Paid / totalMonth) * 100).toFixed(0) : 0}%)
- ${person2Name} pagou: R$ ${person2Paid.toFixed(2)} (${totalMonth > 0 ? ((person2Paid / totalMonth) * 100).toFixed(0) : 0}%)
- Total de ${thisMonthExpenses.length} gastos esse mês

Gere 3 insights curtos (máx 80 caracteres cada) em português brasileiro.
Seja amigável, use emojis, evite ser crítico demais. Personalize com os nomes.

Responda APENAS em JSON válido neste formato:
[
  { "type": "celebration", "message": "...", "priority": 8 },
  { "type": "tip", "message": "...", "priority": 5 },
  { "type": "alert", "message": "...", "priority": 3 }
]`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você gera insights financeiros em JSON. Responda APENAS com o array JSON, sem markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    let insights = [];
    try {
      // Try to parse the JSON from the response
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      insights = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      insights = [
        { type: "tip", message: "Continue registrando seus gastos! 📊", priority: 5 }
      ];
    }

    // Save insights to database (optional - for history)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete old insights
    await serviceClient
      .from('ai_insights')
      .delete()
      .eq('couple_id', coupleId)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Insert new insights
    if (insights.length > 0) {
      await serviceClient.from('ai_insights').insert(
        insights.map((insight: any) => ({
          couple_id: coupleId,
          insight_type: insight.type,
          message: insight.message,
          priority: insight.priority,
          valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }))
      );
    }

    return new Response(JSON.stringify({
      success: true,
      learning: false,
      insights,
      stats: {
        totalMonth,
        totalPreviousMonth,
        trend,
        person1Paid,
        person2Paid,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
