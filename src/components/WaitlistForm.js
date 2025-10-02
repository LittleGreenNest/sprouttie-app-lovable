import React, { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WaitlistForm = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [botField, setBotField] = useState(''); // honeypot

  // Read UTM params once
  const utm = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      utm_source: sp.get('utm_source') || null,
      utm_medium: sp.get('utm_medium') || null,
      utm_campaign: sp.get('utm_campaign') || null,
      utm_term: sp.get('utm_term') || null,
      utm_content: sp.get('utm_content') || null,
    };
  }, []);

  const isEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).toLowerCase());

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (loading) return;

  // bot trap
  if (botField) return;

  if (!isEmail(email)) {
    toast.error('Please enter a valid email.');
    return;
  }

  setLoading(true);
  const source = 'plans_modal';

  try {
    // 1) Upsert waitlist row (rename error -> dbError)
    const { error: dbError } = await supabase
      .from('waitlist')
      .upsert([{ email, source, consent, ...utm }], { onConflict: 'email', ignoreDuplicates: false });
    if (dbError) throw dbError;

    // 2) Fire the email via Supabase Edge Function (Resend)
    // Use a different alias (edgeError) and call ONLY ONCE
    const { error: edgeError } = await supabase.functions.invoke('sendWaitlistEmail', {
      body: { email, source, utm, consent }
    });
    if (edgeError) throw edgeError;

    toast.success('You’re on the waitlist! 🎉');
    setEmail('');

    // Tracking
    if (window.fbq) {
      window.fbq('track', 'Lead', { content_name: 'Waitlist Signup', source, ...utm });
    }
    if (window.gtag) {
      window.gtag('event', 'waitlist_signup', { event_category: 'engagement', event_label: source, ...utm });
    }
  } catch (err) {
    console.error('Waitlist error:', err);
    toast.error(err?.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="waitlist-modal" role="dialog" aria-modal="true" aria-label="Join Pro Plan Waitlist">
      <div className="modal-content">
        <h3 style={{ marginBottom: '1rem' }}>Join the Pro Plan Waitlist</h3>

        <form onSubmit={handleSubmit} noValidate>
          {/* Honeypot (hidden) */}
          <input
            type="text"
            value={botField}
            onChange={(e) => setBotField(e.target.value)}
            style={{ display: 'none' }}
            tabIndex="-1"
            autoComplete="off"
            aria-hidden="true"
          />

          <label className="sr-only" htmlFor="waitlist-email">Email</label>
          <input
            id="waitlist-email"
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={email && !isEmail(email) ? 'true' : 'false'}
          />

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>Email me Pro Sprout updates</span>
          </label>

          <button
            type="submit"
            className="subscribe-btn"
            disabled={loading}
            style={{ marginTop: '1rem' }}
            aria-busy={loading ? 'true' : 'false'}
          >
            {loading ? <div className="spinner" aria-label="Loading"></div> : 'Join Waitlist'}
          </button>
        </form>

        <button onClick={onClose} className="close-btn" aria-label="Close waitlist form" style={{ marginTop: 12 }}>
          Close
        </button>
      </div>

      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default WaitlistForm;
