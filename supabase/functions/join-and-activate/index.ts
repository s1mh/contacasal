import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { hashPin, isValidPin } from '../_shared/pin.ts';
import { sanitizeName, isValidEmail, isValidUsername } from '../_shared/sanitize.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const { share_code, name, avatar_index, color, pin_code, email, username } = await req.json();

    if (!share_code || !name || !pin_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize inputs
    const safeName = sanitizeName(name);
    if (safeName.length < 1 || safeName.length > 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidPin(pin_code)) {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN deve ter 4 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (email && !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (username && !isValidUsername(username.replace(/^@/, '').toLowerCase().trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash PIN before storing
    const hashedPin = await hashPin(pin_code);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the space by share code
    const { data: space, error: spaceError } = await supabaseAdmin
      .from('couples')
      .select('id, max_members')
      .eq('share_code', share_code.trim().toLowerCase())
      .single();

    if (spaceError || !space) {
      return new Response(
        JSON.stringify({ success: false, error: 'Espaço não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coupleId = space.id;
    const maxMembers = space.max_members || 5;

    // Check if user already has an active profile in this space
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, position, name')
      .eq('couple_id', coupleId)
      .eq('user_id', userId)
      .or('status.eq.active,status.is.null')
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({
          success: true,
          already_member: true,
          profile_id: existingProfile.id,
          couple_id: coupleId,
          position: existingProfile.position
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count active members
    const { count: activeCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .or('status.eq.active,status.is.null');

    if ((activeCount || 0) >= maxMembers) {
      return new Response(
        JSON.stringify({ success: false, error: 'Espaço cheio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's an unconfigured profile to take over
    const { data: unconfiguredProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, position')
      .eq('couple_id', coupleId)
      .is('user_id', null)
      .or('name.eq.Pessoa 1,name.eq.Pessoa 2,name.eq.Pessoa')
      .limit(1)
      .single();

    let profileId: string;
    let position: number;

    const safeUsername = username ? username.replace(/^@/, '').toLowerCase().trim() : null;

    if (unconfiguredProfile) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          user_id: userId,
          name: safeName,
          color: color || '#F5A9B8',
          avatar_index: avatar_index || 1,
          pin_code: hashedPin,
          email: email?.trim().toLowerCase() || null,
          username: safeUsername || null,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', unconfiguredProfile.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao configurar perfil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileId = unconfiguredProfile.id;
      position = unconfiguredProfile.position;
    } else {
      const { data: existingPositions } = await supabaseAdmin
        .from('profiles')
        .select('position')
        .eq('couple_id', coupleId);

      const usedPositions = new Set((existingPositions || []).map(p => p.position));
      let nextPosition = 1;
      for (let i = 1; i <= maxMembers; i++) {
        if (!usedPositions.has(i)) {
          nextPosition = i;
          break;
        }
      }

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          couple_id: coupleId,
          user_id: userId,
          name: safeName,
          color: color || '#F5A9B8',
          avatar_index: avatar_index || 1,
          position: nextPosition,
          pin_code: hashedPin,
          email: email?.trim().toLowerCase() || null,
          username: safeUsername || null,
          status: 'active'
        })
        .select('id, position')
        .single();

      if (insertError || !newProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar perfil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileId = newProfile.id;
      position = newProfile.position;
    }

    // Create 'member' role
    await supabaseAdmin
      .from('space_roles')
      .upsert({
        space_id: coupleId,
        profile_id: profileId,
        role: 'member'
      }, { onConflict: 'space_id,profile_id' });

    // Update app_metadata with couple_id
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { couple_id: coupleId }
    });

    return new Response(
      JSON.stringify({
        success: true,
        profile_id: profileId,
        couple_id: coupleId,
        position
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in join-and-activate:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
