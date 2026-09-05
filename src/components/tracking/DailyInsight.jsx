import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, ChevronDown, ChevronRight, ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const BUCKET = 'insight-photos';
const MAX_EDGE = 1400; // plenty to read a label off; keeps uploads small

/**
 * Shrinks a photo before upload. A phone camera file is 3-5MB and none of that
 * detail survives being looked at on a phone later, so it is downscaled and
 * re-encoded as JPEG. Also drops EXIF, including GPS, as a side effect.
 */
const compress = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not read that image'))),
        'image/jpeg',
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });

const DailyInsight = ({ dateString }) => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Stored path, a signed URL to show it, and a local preview while uploading.
  const [photoPath, setPhotoPath] = useState(null);
  const [photoSrc, setPhotoSrc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!currentUser || !dateString) return;
    loadInsight();
  }, [currentUser, dateString]);

  const loadInsight = async () => {
    const { data } = await supabase
      .from('weekly_logs')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('log_type', 'daily_insight')
      .eq('week_start', dateString)
      .maybeSingle();

    if (data) {
      setTitle(data.content || '');
      setBody(data.context || '');
      setPhotoPath(data.photo_path || null);
      if (data.content || data.context || data.photo_path) setOpen(true);
    } else {
      setTitle('');
      setBody('');
      setPhotoPath(null);
    }
  };

  // The bucket is private, so the stored path has to be signed before it can be
  // shown. Signed links are short-lived, hence re-signing whenever the path
  // changes rather than caching a URL.
  useEffect(() => {
    if (!photoPath) { setPhotoSrc(null); return; }
    let cancelled = false;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(photoPath, 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.warn('Could not sign insight photo:', error.message); return; }
        setPhotoSrc(data?.signedUrl ?? null);
      });
    return () => { cancelled = true; };
  }, [photoPath]);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again after a removal
    if (!file || !currentUser) return;

    setUploading(true);
    setPhotoError('');
    // Show it immediately; the upload can take a moment on mobile data.
    const localPreview = URL.createObjectURL(file);
    setPhotoSrc(localPreview);

    try {
      const blob = await compress(file);
      const path = `${currentUser.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;

      const previous = photoPath;
      setPhotoPath(path); // triggers the signing effect, replacing the preview
      // One photo per insight, so the old file is no longer referenced.
      if (previous) {
        supabase.storage.from(BUCKET).remove([previous]).catch(() => {});
      }
    } catch (err) {
      console.error('Insight photo upload failed:', err);
      setPhotoError(err.message || 'Could not upload that photo.');
      setPhotoSrc(null);
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    const path = photoPath;
    setPhotoPath(null);
    setPhotoSrc(null);
    setPhotoError('');
    if (path) {
      supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  };

  const saveInsight = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('weekly_logs')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('log_type', 'daily_insight')
        .eq('week_start', dateString)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('weekly_logs')
          .update({ content: title, context: body, photo_path: photoPath })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('weekly_logs').insert({
          user_id: currentUser.id,
          log_type: 'daily_insight',
          week_start: dateString,
          content: title,
          context: body,
          photo_path: photoPath,
        });
        if (error) throw error;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      // Was previously swallowed, which is how a failing save could look like a
      // working one. Surface it instead.
      console.error('Error saving insight:', err);
      setPhotoError(
        err?.message?.includes('log_type')
          ? 'Saving is blocked by an old database rule. Apply the 20260829 migration.'
          : 'Could not save. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const hasContent = title.trim() || body.trim() || photoPath;

  return (
    <div className="mx-4 mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
        style={{
          background: '#FFFBEB', border: '0.5px solid #FDE68A',
          borderRadius: '12px', padding: '12px 14px', cursor: 'pointer'
        }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4" style={{ color: '#F59E0B' }} />
          <span style={{ fontSize: '14px', color: '#92400E', fontWeight: 500 }}>Insight for today</span>
          {hasContent && !open && (
            <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: '8px', fontWeight: 500 }}>
              ✨
            </span>
          )}
        </div>
        {open
          ? <ChevronDown className="w-4 h-4" style={{ color: '#F59E0B' }} />
          : <ChevronRight className="w-4 h-4" style={{ color: '#F59E0B' }} />
        }
      </button>

      {open && (
        <div className="mt-2" style={{
          background: '#fff', border: '0.5px solid #D1D5DB',
          borderRadius: '12px', overflow: 'hidden', padding: '14px'
        }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. She said 'apple' clearly today!"
            style={{
              width: '100%', border: '0.5px solid #D1D5DB', borderRadius: '8px',
              padding: '10px 12px', fontSize: '14px', fontWeight: 600, outline: 'none',
              color: '#1F2937', marginBottom: '8px'
            }}
            onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="More details — what happened, how your child reacted, what surprised you..."
            style={{
              width: '100%', border: '0.5px solid #D1D5DB', borderRadius: '8px',
              padding: '10px 12px', fontSize: '13px', lineHeight: 1.5,
              resize: 'none', outline: 'none', minHeight: '80px',
              color: '#1F2937'
            }}
            onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
          />

          {/* Photo. Sometimes the object is the insight and the words come
              after it, so this sits alongside the text rather than under it. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            style={{ display: 'none' }}
          />

          {photoSrc ? (
            <div style={{ position: 'relative', marginTop: 8 }}>
              <img
                src={photoSrc}
                alt="Today's insight"
                style={{
                  width: '100%', maxHeight: 260, objectFit: 'cover',
                  borderRadius: 10, display: 'block',
                  opacity: uploading ? 0.6 : 1,
                }}
              />
              {uploading && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#fff' }} />
                </div>
              )}
              {!uploading && (
                <button
                  onClick={removePhoto}
                  aria-label="Remove photo"
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X className="w-4 h-4" style={{ color: '#fff' }} />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                marginTop: 8, width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, padding: '10px 12px',
                border: '1px dashed #D1D5DB', borderRadius: 8, background: '#fff',
                color: '#6B7280', fontSize: 13, cursor: 'pointer',
              }}
            >
              <ImagePlus className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Add a photo'}
            </button>
          )}

          {photoError && (
            <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 6 }}>{photoError}</p>
          )}

          {hasContent && (
            <button
              onClick={saveInsight}
              disabled={saving}
              style={{
                marginTop: '8px', padding: '8px 16px', borderRadius: '8px',
                background: saved ? '#065F46' : '#F59E0B', color: '#fff',
                fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Insight'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyInsight;
