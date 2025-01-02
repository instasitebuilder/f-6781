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

    console.log('Fetching transcript for video:', videoId)
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
      country: 'US'
    })
    console.log('Transcript fetched successfully')
    
    return new Response(
      JSON.stringify(transcript),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error fetching transcript:', error)
    
    let errorMessage = 'An error occurred while fetching the transcript'
    let statusCode = 500

    if (error.message?.includes('Could not find automatic captions') || 
        error.message?.includes('Transcript is disabled') ||
        error.message?.includes('No transcript available')) {
      errorMessage = 'No transcript is available for this video'
      statusCode = 404
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})