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

    // For testing purposes, generate a random confidence score
    // This helps us verify the function is working without external API dependencies
    const confidence = Math.floor(Math.random() * 100);
    const status = confidence > 80 ? 'verified' : confidence < 40 ? 'debunked' : 'flagged';

    // Update the broadcast with a transaction
    const { error: updateError } = await supabaseClient
      .from('broadcasts')
      .update({
        confidence,
        api_processed: true,
        status
      })
      .eq('id', broadcastId);

    if (updateError) {
      console.error('Failed to update broadcast:', updateError);
      throw new Error(`Failed to update broadcast: ${updateError.message}`);
    }

    // Create a test fact check entry
    const { error: factCheckError } = await supabaseClient
      .from('fact_checks')
      .insert([{
        broadcast_id: broadcastId,
        verification_source: 'Test Verification',
        explanation: `Test fact check with ${confidence}% confidence`,
        confidence_score: confidence
      }]);

    if (factCheckError) {
      console.error('Failed to create fact check:', factCheckError);
      throw new Error(`Failed to create fact check: ${factCheckError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        confidence,
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
        error: error.message,
        details: error.stack 
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