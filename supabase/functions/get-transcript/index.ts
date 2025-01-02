import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { YouTubeTranscript } from 'npm:youtube-transcript'
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoId } = await req.json()
    console.log('Attempting to fetch transcript for video:', videoId)

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    try {
      const transcript = await YouTubeTranscript.fetchTranscript(videoId, {
        lang: 'en',
        country: 'US'
      })

      if (!transcript || transcript.length === 0) {
        console.log('No transcript data found for video:', videoId)
        throw new Error('No transcript is available for this video')
      }

      console.log('Successfully fetched transcript for video:', videoId)
      return new Response(
        JSON.stringify(transcript),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (transcriptError) {
      console.error('Transcript fetch error:', transcriptError)
      
      let errorMessage = 'No transcript is available for this video'
      let statusCode = 404

      if (transcriptError.message?.includes('Could not find automatic captions') ||
          transcriptError.message?.includes('Transcript is disabled')) {
        errorMessage = 'Transcript is not available for this video'
      } else if (transcriptError.message?.includes('Video is unavailable')) {
        errorMessage = 'Video is unavailable or does not exist'
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error) {
    console.error('General error:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})