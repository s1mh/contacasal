import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

interface SplitValue {
  person1?: number;
  person2?: number;
  person3?: number;
  person4?: number;
  person5?: number;
  [key: string]: number | undefined;
}

interface Expense {
  id: string;
  total_amount: number;
  paid_by: number;
  split_type: string;
  split_value: SplitValue;
  tag_id: string | null;
  expense_date: string;
  installment_number?: number;
}

interface Profile {
  id: string;
  position: number;
  name: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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

    // Check for cached insights (valid within last 24 hours)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: cachedInsights } = await serviceClient
      .from('ai_insights')
      .select('insight_type, message, priority, created_at')
      .eq('couple_id', coupleId)
      .gte('valid_until', new Date().toISOString())
      .order('priority', { ascending: false })
      .limit(5);

    if (cachedInsights && cachedInsights.length > 0) {
      // Return cached insights without calling the AI
      return new Response(JSON.stringify({
        success: true,
        learning: false,
        cached: true,
        insights: cachedInsights.map(i => ({
          type: i.insight_type,
          message: i.message,
          priority: i.priority,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch expenses and profiles
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [expensesRes, profilesRes, tagsRes] = await Promise.all([
      supabaseClient.from('expenses').select('*').eq('couple_id', coupleId),
      supabaseClient.from('profiles').select('*').eq('couple_id', coupleId),
      supabaseClient.from('tags').select('*').eq('couple_id', coupleId),
    ]);

    const expenses: Expense[] = expensesRes.data || [];
    const profiles: Profile[] = (profilesRes.data || []).filter((p: Profile) => p.name && p.name !== 'Pessoa');
    const tags: Tag[] = tagsRes.data || [];

    // Filter out installments > 1 to count purchases (not each installment)
    const uniquePurchases = expenses.filter(e =>
      !e.installment_number || e.installment_number === 1
    );

    // Check learning progress
    const uniqueDays = new Set(uniquePurchases.map(e => e.expense_date)).size;
    const uniqueCategories = new Set(uniquePurchases.filter(e => e.tag_id).map(e => e.tag_id)).size;
    const hasEnoughData = uniqueDays >= 7 && uniquePurchases.length >= 5 && uniqueCategories >= 2;

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

    // Calculate spending data with correct split understanding
    const thisMonthExpenses = expenses.filter(e => e.expense_date >= startOfMonth);
    const thisMonthPurchases = thisMonthExpenses.filter(e =>
      !e.installment_number || e.installment_number === 1
    );
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

    // Calculate ACTUAL shares per person (considering splits!)
    // This is key: we need to calculate what each person actually paid vs what they should have paid
    const personShares: Record<number, { paid: number; shouldPay: number; categories: Record<string, number> }> = {};

    profiles.forEach(p => {
      personShares[p.position] = { paid: 0, shouldPay: 0, categories: {} };
    });

    // Process this month's expenses with proper split calculations
    thisMonthExpenses.forEach(expense => {
      const { total_amount, paid_by, split_type, split_value, tag_id } = expense;

      // Add to paid amount for the payer
      if (personShares[paid_by]) {
        personShares[paid_by].paid += total_amount;

        // Track categories for the payer
        const category = tags.find(t => t.id === tag_id)?.name || 'Outros';
        personShares[paid_by].categories[category] = (personShares[paid_by].categories[category] || 0) + total_amount;
      }

      // Calculate what each person should pay based on split
      const numPeople = profiles.length || 2;

      if (split_type === 'equal') {
        // 50/50 (or equal split among all configured people)
        const sharePerPerson = total_amount / numPeople;
        profiles.forEach(p => {
          if (personShares[p.position]) {
            personShares[p.position].shouldPay += sharePerPerson;
          }
        });
      } else if (split_type === 'percentage') {
        profiles.forEach(p => {
          const key = `person${p.position}` as keyof SplitValue;
          const percentage = split_value[key] || (100 / numPeople);
          if (personShares[p.position]) {
            personShares[p.position].shouldPay += (total_amount * (percentage as number)) / 100;
          }
        });
      } else if (split_type === 'fixed') {
        profiles.forEach(p => {
          const key = `person${p.position}` as keyof SplitValue;
          const fixed = split_value[key] || 0;
          if (personShares[p.position]) {
            personShares[p.position].shouldPay += (fixed as number);
          }
        });
      } else if (split_type === 'full') {
        // One person pays 100% - no division
        profiles.forEach(p => {
          const key = `person${p.position}` as keyof SplitValue;
          if (split_value[key] === 100 && personShares[p.position]) {
            personShares[p.position].shouldPay += total_amount;
          }
        });
      }
    });

    // Calculate split statistics
    const equalSplitCount = thisMonthExpenses.filter(e => e.split_type === 'equal').length;
    const fullPayCount = thisMonthExpenses.filter(e => e.split_type === 'full').length;
    const percentageSplitCount = thisMonthExpenses.filter(e => e.split_type === 'percentage').length;

    const equalSplitPercentage = thisMonthPurchases.length > 0
      ? Math.round((equalSplitCount / thisMonthExpenses.length) * 100)
      : 0;

    // Build profile summary for AI
    const profileSummary = profiles.map(p => {
      const shares = personShares[p.position];
      const balance = shares.paid - shares.shouldPay;
      const topCategory = Object.entries(shares.categories)
        .sort(([, a], [, b]) => b - a)[0];

      return {
        name: p.name,
        position: p.position,
        totalPaid: shares.paid,
        shouldHavePaid: shares.shouldPay,
        balance: balance, // positive = paid more than should, negative = owes
        topCategory: topCategory ? topCategory[0] : null,
        topCategoryAmount: topCategory ? topCategory[1] : 0,
      };
    });

    // Generate insights using AI
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trend = totalPreviousMonth > 0
      ? ((totalMonth - totalPreviousMonth) / totalPreviousMonth * 100).toFixed(0)
      : 'N/A';

    const prompt = `Você é um assistente financeiro simpático para um app de divisão de contas entre pessoas que moram juntas.

REGRAS CRÍTICAS - LEIA COM ATENÇÃO:
1. TODAS as despesas são DIVIDIDAS automaticamente pelo app (50/50 ou outra proporção)
2. O app já calcula quem deve quanto a quem - NÃO mencione isso
3. NUNCA sugira que alguém "pague a próxima" ou "pague X para equilibrar" - isso não faz sentido!
4. NUNCA diga frases como:
   - "Que tal X pagar a próxima saída"
   - "X pagou mais, Y pode pagar a próxima"
   - "Para equilibrar, Y pode pagar..."
   - Qualquer sugestão de quem deve pagar o quê
5. Foque APENAS em: tendências de gastos, economia, parabéns por metas, alertas de categorias altas

Dados deste mês:
- Total gasto: R$ ${totalMonth.toFixed(2)}
- Total mês anterior: R$ ${totalPreviousMonth.toFixed(2)}
- Tendência: ${trend === 'N/A' ? 'Primeiro mês com dados' : trend + '%'}
- Categorias mais usadas: ${topCategories.map(c => `${c.name} (R$ ${c.amount.toFixed(2)})`).join(', ')}
- ${thisMonthPurchases.length} compras este mês

Gere 2-3 insights curtos (máx 70 caracteres cada) em português brasileiro.

EXEMPLOS DE INSIGHTS BOM:
- "Alimentação subiu 15% - hora de cozinhar mais em casa?"
- "Vocês gastaram menos que no mês passado! Parabéns!"
- "Lazer está em alta - aproveitem com moderação!"
- "Meta de economia atingida este mês!"

EXEMPLOS DE INSIGHTS PROIBIDOS (NUNCA USE):
- "Que tal o Juan pagar a próxima saída?"
- "Samuel adiantou mais, Juan pode pagar a próxima"
- "Para equilibrar, X pode pagar..."

Responda APENAS em JSON válido:
[
  { "type": "celebration", "message": "...", "priority": 8 },
  { "type": "tip", "message": "...", "priority": 5 }
]

Tipos: "celebration" (positivo), "tip" (dica de economia), "alert" (gasto alto)`;

    const systemInstruction = "Você gera insights financeiros em JSON. Responda APENAS com o array JSON, sem markdown. REGRA ABSOLUTA: NUNCA sugira que uma pessoa pague a próxima conta, saída, ou qualquer coisa para equilibrar. O app divide tudo automaticamente. Foque em tendências de gastos e economia, nunca em quem deve pagar o quê.";

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[generate-insights] AI API error:", aiResponse.status);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    
    // Gemini 2.5 (thinking model) may return multiple parts: thought parts + actual response
    const parts = aiData.candidates?.[0]?.content?.parts || [];
    let content = "[]";
    
    // Find the last non-thought part (the actual response)
    for (const part of parts) {
      if (part.text && !part.thought) {
        content = part.text;
      }
    }
    
    // Fallback: if no non-thought part found, use the last part with text
    if (content === "[]" && parts.length > 0) {
      const lastTextPart = [...parts].reverse().find((p: { text?: string }) => p.text);
      if (lastTextPart) content = lastTextPart.text;
    }

    let insights = [];
    try {
      // Clean up potential markdown wrapping
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/\n?```/g, '')
        .trim();
      
      // Try to extract JSON array from the response
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        insights = JSON.parse(cleanContent);
      }
    } catch (parseError) {
      console.error("[generate-insights] Parse failed:", String(parseError));
      insights = [
        { type: "tip", message: "Continue registrando seus gastos!", priority: 5 }
      ];
    }

    // Save insights to database — delete old and insert new
    // (serviceClient already created above for cache check)
    await serviceClient
      .from('ai_insights')
      .delete()
      .eq('couple_id', coupleId)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Insert new insights
    if (insights.length > 0) {
      await serviceClient.from('ai_insights').insert(
        insights.map((insight: { type: string; message: string; priority: number }) => ({
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
        profileSummary,
        equalSplitPercentage,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[generate-insights] Error");
    return new Response(JSON.stringify({ error: "Erro ao gerar insights" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
