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
  const debugEnabled = new URL(req.url).searchParams.get("debug") === "1" || req.headers.get("x-ai-debug") === "1";
  const requestId = crypto.randomUUID();

  const json = (payload: unknown) =>
    new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({
        success: false,
        error: "Unauthorized",
        ...(debugEnabled ? { _debug: { requestId, path: "missing_auth_header" } } : {}),
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
      return json({
        success: false,
        error: "Unauthorized",
        ...(debugEnabled ? { _debug: { requestId, path: "get_user_failed", message: userError?.message } } : {}),
      });
    }

    const coupleId = user.app_metadata?.couple_id;
    if (!coupleId) {
      return json({
        success: false,
        error: "No couple_id found",
        ...(debugEnabled ? { _debug: { requestId, path: "missing_couple_id" } } : {}),
      });
    }

    // Parse request body to get expenseCount from frontend
    let bodyExpenseCount: number | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.expenseCount === 'number') {
        bodyExpenseCount = body.expenseCount;
      }
    } catch {
      // No body or invalid JSON — ok, just skip
    }

    // Check for cached insights (valid within last 24 hours)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serviceClient = serviceRoleKey
      ? createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey)
      : null;

    const cachedInsightsRes = serviceClient
      ? await serviceClient
          .from('ai_insights')
          .select('insight_type, message, priority, created_at')
          .eq('couple_id', coupleId)
          .gte('valid_until', new Date().toISOString())
          .order('priority', { ascending: false })
          .limit(5)
      : { data: null, error: null };

    const cachedInsights = cachedInsightsRes.data;

    if (cachedInsights && cachedInsights.length > 0) {
      // If the frontend sent an expenseCount, check if data changed or is below minimum.
      // If so, invalidate cache and let the flow continue to re-evaluate.
      let cacheStillValid = true;

      if (bodyExpenseCount !== null && serviceClient) {
        // If frontend says 0 expenses (or below the minimum of 3), cache is always stale
        if (bodyExpenseCount < 3) {
          await serviceClient.from('ai_insights').delete().eq('couple_id', coupleId);
          cacheStillValid = false;
        } else {
          const { count: dbCount } = await serviceClient
            .from('expenses')
            .select('*', { count: 'exact', head: true })
            .eq('couple_id', coupleId);

          if (dbCount !== null && dbCount !== bodyExpenseCount) {
            // Data changed — invalidate server cache
            await serviceClient.from('ai_insights').delete().eq('couple_id', coupleId);
            cacheStillValid = false;
          }
        }
      }

      if (cacheStillValid) {
        return json({
          success: true,
          learning: false,
          cached: true,
          stale: false,
          requestId,
          insights: cachedInsights.map(i => ({
            type: i.insight_type,
            message: i.message,
            priority: i.priority,
          })),
          ...(debugEnabled ? { _debug: { requestId, path: "cache_hit", bodyExpenseCount } } : {}),
        });
      }
      // If cache was invalidated, fall through to regenerate insights
    }

    const getStaleInsights = async () => {
      if (!serviceClient) return null;
      const { data } = await serviceClient
        .from('ai_insights')
        .select('insight_type, message, priority, created_at')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!data || data.length === 0) return null;
      return data.map(i => ({
        type: i.insight_type,
        message: i.message,
        priority: i.priority,
      }));
    };

    // Fetch expenses and profiles
    // Usa serviceClient (bypass RLS) porque o usuário já foi autenticado acima.
    const queryClient = serviceClient ?? supabaseClient;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [expensesRes, profilesRes, tagsRes] = await Promise.all([
      queryClient.from('expenses').select('*').eq('couple_id', coupleId),
      queryClient.from('profiles').select('*').eq('couple_id', coupleId),
      queryClient.from('tags').select('*').eq('couple_id', coupleId),
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
    const MIN_DAYS = 3;
    const MIN_PURCHASES = 3;
    const MIN_CATEGORIES = 2;
    const hasEnoughData = uniqueDays >= MIN_DAYS && uniquePurchases.length >= MIN_PURCHASES && uniqueCategories >= MIN_CATEGORIES;

    if (!hasEnoughData) {
      return json({
        success: true,
        learning: true,
        progress: {
          days: uniqueDays,
          expenses: uniquePurchases.length,
          categories: uniqueCategories,
          minDays: MIN_DAYS,
          minExpenses: MIN_PURCHASES,
          minCategories: MIN_CATEGORIES,
        },
        insights: [],
        ...(debugEnabled
          ? {
              _debug: {
                requestId,
                path: "learning_mode",
                uniqueDays,
                uniquePurchases: uniquePurchases.length,
                uniqueCategories,
              },
            }
          : {}),
      });
    }

    // Calculate spending data
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
    const personShares: Record<number, { paid: number; shouldPay: number; categories: Record<string, number> }> = {};

    profiles.forEach(p => {
      personShares[p.position] = { paid: 0, shouldPay: 0, categories: {} };
    });

    thisMonthExpenses.forEach(expense => {
      const { total_amount, paid_by, split_type, split_value, tag_id } = expense;

      if (personShares[paid_by]) {
        personShares[paid_by].paid += total_amount;
        const category = tags.find(t => t.id === tag_id)?.name || 'Outros';
        personShares[paid_by].categories[category] = (personShares[paid_by].categories[category] || 0) + total_amount;
      }

      const numPeople = profiles.length || 2;

      if (split_type === 'equal') {
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
        profiles.forEach(p => {
          const key = `person${p.position}` as keyof SplitValue;
          if (split_value[key] === 100 && personShares[p.position]) {
            personShares[p.position].shouldPay += total_amount;
          }
        });
      }
    });

    const equalSplitCount = thisMonthExpenses.filter(e => e.split_type === 'equal').length;

    const equalSplitPercentage = thisMonthPurchases.length > 0
      ? Math.round((equalSplitCount / thisMonthExpenses.length) * 100)
      : 0;

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
        balance,
        topCategory: topCategory ? topCategory[0] : null,
        topCategoryAmount: topCategory ? topCategory[1] : 0,
      };
    });

    // ======================== AI PROVIDERS ========================

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!GOOGLE_AI_API_KEY && !GROQ_API_KEY) {
      const stale = await getStaleInsights();
      if (stale && stale.length > 0) {
        return json({
          success: true,
          learning: false,
          cached: true,
          stale: true,
          requestId,
          insights: stale,
          warning: "AI not configured; returning last known insights",
          _debug: { requestId, path: "ai_not_configured_stale", missingEnv: ["GOOGLE_AI_API_KEY", "GROQ_API_KEY"] },
        });
      }
      return json({
        success: false,
        learning: false,
        requestId,
        insights: [],
        error: "AI not configured",
        _debug: { requestId, path: "ai_not_configured", missingEnv: ["GOOGLE_AI_API_KEY", "GROQ_API_KEY"] },
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

    // ---------- Gemini ----------
    const geminiModelUrl = GOOGLE_AI_API_KEY
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`
      : null;

    const responseSchema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["celebration", "tip", "alert"] },
          message: { type: "string" },
          priority: { type: "integer" },
        },
        required: ["type", "message", "priority"],
      },
    };

    const callGemini = async (
      inputPrompt: string,
      opts?: { strict?: boolean; maxTokens?: number; temperature?: number }
    ): Promise<Response | null> => {
      if (!geminiModelUrl) return null;

      const body: Record<string, unknown> = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: inputPrompt }] }],
        generationConfig: {
          temperature: opts?.temperature ?? 0.35,
          maxOutputTokens: opts?.maxTokens ?? 768,
          responseMimeType: "application/json",
          ...(opts?.strict ? { responseSchema } : {}),
        },
      };

      let res = await fetch(geminiModelUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Se responseSchema for rejeitado (400), tenta sem
      if (!res.ok && opts?.strict && res.status === 400) {
        const fallbackBody: Record<string, unknown> = {
          ...body,
          generationConfig: {
            ...(body.generationConfig as Record<string, unknown>),
          },
        };
        delete (fallbackBody.generationConfig as Record<string, unknown>).responseSchema;

        res = await fetch(geminiModelUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fallbackBody),
        });
      }

      return res;
    };

    // ---------- Groq (free tier: 14.400 req/dia, 30 req/min) ----------
    const callGroq = async (
      inputPrompt: string,
      opts?: { maxTokens?: number; temperature?: number }
    ): Promise<Response | null> => {
      if (!GROQ_API_KEY) return null;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: inputPrompt },
          ],
          temperature: opts?.temperature ?? 0.35,
          max_tokens: opts?.maxTokens ?? 768,
          response_format: { type: "json_object" },
        }),
      });

      return res;
    };

    // Helper: extrai conteúdo JSON de qualquer provider
    const extractContent = (
      data: Record<string, unknown>,
      provider: string
    ): { content: string; finishReason: string } => {
      if (provider.startsWith("groq")) {
        // Formato OpenAI-compatible
        const choices = (data as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> }).choices;
        return {
          content: choices?.[0]?.message?.content || "[]",
          finishReason: choices?.[0]?.finish_reason || "unknown",
        };
      }
      // Formato Gemini
      const candidates = (data as { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }> }).candidates;
      const fr = candidates?.[0]?.finishReason || "unknown";
      const parts = candidates?.[0]?.content?.parts || [];
      const textParts: string[] = parts
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .filter(Boolean);
      let c = textParts[textParts.length - 1] || "[]";
      const jsonLooking = [...textParts].reverse().find((t) => {
        const s = String(t).trim();
        return s.startsWith("[") || s.startsWith("{");
      });
      if (jsonLooking) c = jsonLooking;
      return { content: c, finishReason: fr };
    };

    // ======================== CHAMADA PRINCIPAL ========================
    // Estratégia: Gemini primeiro → se 429, Groq fallback → se nenhum, cache/erro
    let aiResponse: Response | null = null;
    let aiProvider = "none";

    // 1) Tenta Gemini
    if (GOOGLE_AI_API_KEY) {
      aiResponse = await callGemini(prompt, { strict: true, maxTokens: 768, temperature: 0.35 });
      aiProvider = "gemini-2.0-flash";
    }

    // 2) Se Gemini não existe ou deu 429, tenta Groq
    if ((!aiResponse || !aiResponse.ok) && GROQ_API_KEY) {
      const isRateLimit = aiResponse && aiResponse.status === 429;
      const noGemini = !GOOGLE_AI_API_KEY;
      if (isRateLimit || noGemini || !aiResponse) {
        console.log(`[generate-insights] ${isRateLimit ? 'Gemini 429' : 'Gemini indisponível'}, tentando Groq...`);
        const groqRes = await callGroq(prompt, { maxTokens: 768, temperature: 0.35 });
        if (groqRes && groqRes.ok) {
          aiResponse = groqRes;
          aiProvider = "groq-llama-3.3-70b";
        }
      }
    }

    // 3) Se nenhum provider funcionou
    if (!aiResponse || !aiResponse.ok) {
      const errorBody = aiResponse ? await aiResponse.text().catch(() => "unable to read body") : "no provider available";
      const status = aiResponse?.status ?? 0;
      console.error("[generate-insights] All AI providers failed:", status, errorBody);

      const stale = await getStaleInsights();
      if (stale && stale.length > 0) {
        return json({
          success: true,
          learning: false,
          cached: true,
          stale: true,
          requestId,
          insights: stale,
          warning: "All AI providers failed; returning last known insights",
          _debug: { requestId, path: "all_providers_failed_stale", status, provider: aiProvider, errorBodyPreview: String(errorBody).slice(0, 400) },
        });
      }

      return json({
        success: false,
        learning: false,
        requestId,
        insights: [],
        error: status === 429 ? "Rate limit exceeded" : "AI service error",
        _debug: { requestId, path: "all_providers_failed", status, provider: aiProvider, errorBodyPreview: String(errorBody).slice(0, 400) },
      });
    }

    // ======================== PARSE DA RESPOSTA ========================
    const aiData = await aiResponse.json();
    const { content: rawContent, finishReason } = extractContent(aiData as Record<string, unknown>, aiProvider);
    let content = rawContent;

    let insights: Array<{ type: string; message: string; priority: number }> = [];
    let parseFailed = false;
    let retryUsed = false;
    try {
      const cleanContent = String(content)
        .replace(/```json\n?/g, '')
        .replace(/\n?```/g, '')
        .trim();

      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanContent);
      insights = Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      parseFailed = true;
      console.error("[generate-insights] Parse failed:", String(parseError), "finishReason:", finishReason, "provider:", aiProvider);

      // Retry: tenta com prompt mais curto, usando o mesmo provider ou o fallback
      try {
        retryUsed = true;
        const retryPrompt = `Gere 2-3 insights curtos (máx 70 caracteres cada) em pt-BR.\n\nDados:\n- Total gasto: R$ ${totalMonth.toFixed(2)}\n- Total mês anterior: R$ ${totalPreviousMonth.toFixed(2)}\n- Tendência: ${trend === 'N/A' ? 'Primeiro mês com dados' : trend + '%'}\n- Top categorias: ${topCategories.map(c => `${c.name} (R$ ${c.amount.toFixed(2)})`).join(', ')}\n\nResponda APENAS com o array JSON válido.`;

        let retryContent: string | null = null;

        // Tenta com o provider que funcionou, ou tenta Groq como último recurso
        if (aiProvider.startsWith("groq")) {
          const res = await callGroq(retryPrompt, { maxTokens: 512, temperature: 0.2 });
          if (res?.ok) {
            const d = await res.json();
            retryContent = extractContent(d as Record<string, unknown>, "groq").content;
          }
        } else {
          // Tenta Gemini primeiro
          const gemRes = await callGemini(retryPrompt, { strict: true, maxTokens: 512, temperature: 0.2 });
          if (gemRes?.ok) {
            const d = await gemRes.json();
            retryContent = extractContent(d as Record<string, unknown>, "gemini").content;
          }
          // Se Gemini falhou no retry, tenta Groq
          if (!retryContent && GROQ_API_KEY) {
            const groqRes = await callGroq(retryPrompt, { maxTokens: 512, temperature: 0.2 });
            if (groqRes?.ok) {
              const d = await groqRes.json();
              retryContent = extractContent(d as Record<string, unknown>, "groq").content;
              aiProvider = "groq-llama-3.3-70b (retry)";
            }
          }
        }

        if (retryContent) {
          const retryClean = String(retryContent).trim();
          const retryMatch = retryClean.match(/\[[\s\S]*\]/);
          const retryParsed = JSON.parse(retryMatch ? retryMatch[0] : retryClean);
          insights = Array.isArray(retryParsed) ? retryParsed : [];
        }
      } catch (retryErr) {
        console.error("[generate-insights] Retry failed:", String(retryErr));
      }

      // Se ainda falhar, devolve último insight conhecido do DB
      if (!insights || insights.length === 0) {
        const stale = await getStaleInsights();
        if (stale && stale.length > 0) {
          return json({
            success: true,
            learning: false,
            cached: true,
            stale: true,
            requestId,
            insights: stale,
            warning: "AI parse failed; returning last known insights",
            _debug: { requestId, path: "parse_failed_stale", finishReason, provider: aiProvider },
          });
        }
      }

      insights = insights && insights.length > 0
        ? insights
        : [{ type: "tip", message: "Continue registrando seus gastos!", priority: 5 }];
    }

    // Validação/normalização
    insights = (Array.isArray(insights) ? insights : [])
      .filter((i) => i && typeof i.message === "string")
      .slice(0, 5)
      .map((i) => ({
        type: (i.type === "celebration" || i.type === "alert" || i.type === "tip") ? i.type : "tip",
        message: String(i.message).trim().slice(0, 120),
        priority: Number.isFinite(Number(i.priority)) ? Number(i.priority) : 5,
      }));

    const isGenericFallbackOnly =
      insights.length === 1 &&
      insights[0]?.type === "tip" &&
      insights[0]?.message === "Continue registrando seus gastos!";

    // Save insights to database
    if (serviceClient) {
      await serviceClient
        .from('ai_insights')
        .delete()
        .eq('couple_id', coupleId)
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    }

    // Não sobrescrever o cache com o fallback genérico
    if (serviceClient && insights.length > 0 && !isGenericFallbackOnly) {
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

    return json({
      success: true,
      learning: false,
      requestId,
      insights,
      _debug: {
        requestId,
        finishReason,
        parseFailed,
        retryUsed,
        contentPreview: String(content).slice(0, 600),
        isGenericFallbackOnly,
        expensesCount: expenses.length,
        uniquePurchasesCount: uniquePurchases.length,
        uniqueDays,
        uniqueCategories,
        model: aiProvider,
      },
      stats: {
        totalMonth,
        totalPreviousMonth,
        trend,
        profileSummary,
        equalSplitPercentage,
      }
    });

  } catch (e) {
    console.error("[generate-insights] Error:", e instanceof Error ? e.message : String(e));
    return json({
      success: false,
      error: "Erro ao gerar insights",
      requestId,
      insights: [],
      ...(debugEnabled
        ? {
            _debug: {
              requestId,
              path: "catch",
              message: e instanceof Error ? e.message : String(e),
              stack: e instanceof Error ? e.stack : undefined,
            },
          }
        : {}),
    });
  }
});
