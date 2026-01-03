import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Professional Augmentation: Enhancing the user's prompt for high-fidelity results
    const enhancedPrompt = `High-end professional avatar, ${prompt}, cinematic lighting, neon green and dark grey color palette, sharp focus, digital art masterpiece, 8k resolution, sports profile style.`;

    // 1. Call Gemini Imagen 3 API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3:generateImages?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: enhancedPrompt }],
        parameters: { sampleCount: 1 }
      })
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.error?.message || 'Failed to generate image')

    const base64Image = result.predictions[0].bytesBase64

    // 2. Upload to Supabase Storage
    const fileName = `avatar-${Date.now()}.png`
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, decodeBase64(base64Image), {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
