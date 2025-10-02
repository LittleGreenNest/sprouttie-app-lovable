import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  try {
    const { imageUrl } = await req.json();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Flip this image horizontally (mirror it) and remove the beige/cream background making it transparent. Keep the bird character's colors, style and design exactly the same - only flip direction and remove background."
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      })
    });

    const data = await response.json();
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      throw new Error('No image returned from AI');
    }

    return new Response(
      JSON.stringify({ imageUrl: editedImageUrl }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('Error processing logo:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
