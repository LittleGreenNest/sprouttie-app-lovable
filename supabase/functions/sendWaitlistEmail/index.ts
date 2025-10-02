// supabase/functions/sendWaitlistEmail/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { email } = await req.json()

  try {
    const data = await resend.emails.send({
      from: 'Sprouttie <hello@sprouttie.com>',
      to: email,
      subject: "You're In — Thanks for Joining the Sprouttie Waitlist!",
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; padding: 20px; background: #f8f9fa; color: #333;">
          <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #54b38a;">🌿 You're In — Thank You for Joining Us</h2>
            <p>Hi there,</p>
            <p>Thank you for joining the waitlist for Sprouttie's upcoming Pro Plan. We're thrilled to have thoughtful parents like you walking this journey with us.</p>
            <p>At Sprouttie, we believe that learning should be joyful — not overwhelming. We’re building something that empowers you to teach and nurture your child without stress, guilt, or burnout.</p>
            <p>✨ As we prepare for launch, you’ll be the first to hear about early access, new features, and exclusive sneak peeks.</p>
            <p>Until then, thank you for your belief in what we’re growing together.</p>
            <p style="margin-bottom: 30px;">Stay rooted. Keep sprouting.</p>
            <p>With gratitude,</p>
            <p><strong>The Sprouttie Team</strong><br>🌱 sprouttie.com</p>
          </div>
        </div>
      `,
    })

    return new Response(JSON.stringify({ success: true, data }), { status: 200 })
  } catch (error) {
    console.error('Email send error:', error)
    return new Response(JSON.stringify({ success: false, error }), { status: 500 })
  }
})

