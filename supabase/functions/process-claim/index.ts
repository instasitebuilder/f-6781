import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { broadcastId } = await req.json();
    console.log('Processing broadcast:', broadcastId);

    // Fetch the broadcast content
    const { data: broadcast, error: fetchError } = await supabaseClient
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch broadcast:', fetchError);
      throw new Error(`Failed to fetch broadcast: ${fetchError.message}`);
    }

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    console.log('Fetched broadcast:', broadcast);

    // Call ClaimBuster API
    const claimBusterKey = Deno.env.get('CLAIMBUSTER_API_KEY');
    if (!claimBusterKey) {
      throw new Error('CLAIMBUSTER_API_KEY is not set');
    }

    // Encode the text for URL
    const encodedText = encodeURIComponent(broadcast.content);
    const claimBusterResponse = await fetch(
      `https://idir.uta.edu/claimbuster/api/v2/score/text/${encodedText}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': claimBusterKey,
        },
      }
    );

    if (!claimBusterResponse.ok) {
      throw new Error(`ClaimBuster API error: ${claimBusterResponse.statusText}`);
    }

    const claimBusterData = await claimBusterResponse.json();
    console.log('ClaimBuster response:', claimBusterData);

    // Calculate confidence and status based on ClaimBuster score
    const claimBusterConfidence = claimBusterData.results?.[0]?.score 
      ? Math.round(claimBusterData.results[0].score * 100)
      : 0;

    const status = claimBusterConfidence > 80 ? 'verified' : 
                   claimBusterConfidence > 40 ? 'flagged' : 
                   'debunked';

    // Update the broadcast with the results
    const { error: updateError } = await supabaseClient
      .from('broadcasts')
      .update({
        confidence: claimBusterConfidence,
        status,
        api_processed: true
      })
      .eq('id', broadcastId);

    if (updateError) {
      console.error('Failed to update broadcast:', updateError);
      throw new Error(`Failed to update broadcast: ${updateError.message}`);
    }

    // Create a fact check entry
    const { error: factCheckError } = await supabaseClient
      .from('fact_checks')
      .insert([{
        broadcast_id: broadcastId,
        verification_source: 'ClaimBuster API',
        explanation: `Claim check score: ${claimBusterConfidence}%`,
        confidence_score: claimBusterConfidence
      }]);

    if (factCheckError) {
      console.error('Failed to create fact check:', factCheckError);
      throw new Error(`Failed to create fact check: ${factCheckError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        confidence: claimBusterConfidence,
        status 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing claim:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});