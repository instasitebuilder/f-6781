import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { YoutubeTranscript } from "npm:youtube-transcript"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoId } = await req.json()

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    console.log('Attempting to fetch transcript for video:', videoId)
    
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en',
        country: 'US'
      })

      if (!transcript || transcript.length === 0) {
        console.log('No transcript data found for video:', videoId)
        return new Response(
          JSON.stringify({ error: 'No transcript data found for this video' }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        )
      }

      console.log('Successfully fetched transcript for video:', videoId)
      return new Response(
        JSON.stringify(transcript),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    } catch (transcriptError: any) {
      console.error('Transcript fetch error:', transcriptError.message)
      
      // Handle specific error cases
      if (transcriptError.message?.includes('Could not find automatic captions') ||
          transcriptError.message?.includes('Transcript is disabled')) {
        return new Response(
          JSON.stringify({ error: 'Transcript is not available for this video' }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        )
      }
      
      if (transcriptError.message?.includes('Video is unavailable')) {
        return new Response(
          JSON.stringify({ error: 'Video is unavailable or does not exist' }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Failed to fetch transcript' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }
  } catch (error) {
    console.error('General error:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})