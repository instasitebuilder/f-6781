import { serve } from 'https://deno.fresh.dev/std@v9.6.1/http/server.ts'
import { getTranscript } from 'npm:youtube-transcript-api'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    const transcript = await getTranscript(videoId)
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
    
    const errorMessage = error.message.includes('No transcript available')
      ? 'Transcript not available for this video'
      : 'An error occurred while fetching the transcript'
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: error.message.includes('No transcript available') ? 404 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})