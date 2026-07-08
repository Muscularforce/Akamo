import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base64Audio } = await req.json()

    if (!base64Audio) {
      throw new Error('No audio data provided')
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
    if (!rapidApiKey) {
      throw new Error('RAPIDAPI_KEY is not set')
    }

    // Call the Shazam API
    const shazamRes = await fetch('https://shazam.p.rapidapi.com/songs/v2/detect?timezone=America%2FChicago&locale=en-US', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'x-rapidapi-host': 'shazam.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
      body: base64Audio,
    })

    if (!shazamRes.ok) {
      const errText = await shazamRes.text()
      console.error('Shazam API Error:', shazamRes.status, errText)
      throw new Error(`Shazam API responded with status ${shazamRes.status}`)
    }

    const data = await shazamRes.json()
    
    // Parse the Shazam API response to extract what we need
    // The response structure can vary, but generally there is a track object if matched
    const track = data?.track
    if (!track) {
      return new Response(
        JSON.stringify({ found: false, message: 'No match found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const result = {
      found: true,
      title: track.title || '',
      artist: track.subtitle || '',
      cover: track.images?.coverart || track.images?.background || null,
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Error in recognize-audio function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
