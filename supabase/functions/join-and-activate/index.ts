import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      console.error('JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { share_code, name, avatar_index, color, pin_code, email, username } = await req.json();

    if (!share_code || !name || !pin_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the space by share code
    const { data: space, error: spaceError } = await supabaseAdmin
      .from('couples')
      .select('id, max_members')
      .eq('share_code', share_code.trim().toLowerCase())
      .single();

    if (spaceError || !space) {
      console.log('Space not found:', share_code);
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
      console.log('User already has profile in space:', existingProfile.id);
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
      console.log('Space is full:', activeCount, '/', maxMembers);
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

    if (unconfiguredProfile) {
      // Take over unconfigured profile
      console.log('Taking over unconfigured profile:', unconfiguredProfile.id);
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          user_id: userId,
          name,
          color: color || '#F5A9B8',
          avatar_index: avatar_index || 1,
          pin_code,
          email: email || null,
          username: username || null,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', unconfiguredProfile.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao configurar perfil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileId = unconfiguredProfile.id;
      position = unconfiguredProfile.position;

    } else {
      // Calculate next available position
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

      // Create new profile
      console.log('Creating new profile at position:', nextPosition);
      
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          couple_id: coupleId,
          user_id: userId,
          name,
          color: color || '#F5A9B8',
          avatar_index: avatar_index || 1,
          position: nextPosition,
          pin_code,
          email: email || null,
          username: username || null,
          status: 'active'
        })
        .select('id, position')
        .single();

      if (insertError || !newProfile) {
        console.error('Error creating profile:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar perfil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileId = newProfile.id;
      position = newProfile.position;
    }

    // Create 'member' role
    const { error: roleError } = await supabaseAdmin
      .from('space_roles')
      .upsert({
        space_id: coupleId,
        profile_id: profileId,
        role: 'member'
      }, { onConflict: 'space_id,profile_id' });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Don't fail the whole operation for role error
    }

    // Update app_metadata with couple_id
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { couple_id: coupleId }
    });

    if (metaError) {
      console.error('Error updating app_metadata:', metaError);
      // Don't fail the whole operation for metadata error
    }

    console.log('Profile created/activated successfully:', {
      profileId,
      position,
      coupleId
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
