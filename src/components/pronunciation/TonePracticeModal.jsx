import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, Square, Volume2 } from 'lucide-react';
import PronunciationButton from './PronunciationButton';

// A listening and self-recording aid. No automated assessment is performed.
const TonePracticeModal = ({ word, onClose, userPlan = 'free' }) => {
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [error, setError] = useState('');
  const recorder = useRef(null);
  const stream = useRef(null);
  const closeButton = useRef(null);
  const previousFocus = useRef(null);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    previousFocus.current = document.activeElement;
    closeButton.current?.focus();
    return () => {
      active.current = false;
      if (recorder.current) recorder.current.onstop = null;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      previousFocus.current?.focus();
    };
  }, []);
  useEffect(() => () => { if (recordingUrl) URL.revokeObjectURL(recordingUrl); }, [recordingUrl]);

  const start = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('Recording is unavailable in this browser. You can still listen to the audio.');
      }
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) {
        stream.current.getTracks().forEach((track) => track.stop());
        return;
      }
      const chunks = [];
      recorder.current = new MediaRecorder(stream.current);
      recorder.current.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.current.onstop = () => {
        setRecordingUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.current.mimeType })));
        stream.current?.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      recorder.current.start();
      setRecording(true);
    } catch (e) {
      stream.current?.getTracks().forEach((track) => track.stop());
      setError(e.name === 'NotAllowedError' ? 'Microphone access was not allowed. You can still listen.' : e.message);
    }
  };

  const handleKey = (event) => {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), audio[controls]')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="listen-title" onKeyDown={handleKey}
        className="relative w-full max-w-md rounded-2xl bg-[#FCF9F3] p-6 max-h-[90dvh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close listening practice" className="absolute right-3 top-3 p-3"><X size={20} /></button>
        <h2 id="listen-title" className="font-display text-2xl pr-8">Listen and compare.</h2>
        <p className="mt-4 text-3xl">{word.front}</p>
        <p className="text-sm text-[#59666D]">{word.back}</p>
        <div className="my-5 flex gap-6">
          {[['en', 'English'], ['zh', 'Mandarin']].map(([code, label]) => (
            <div key={code} className="flex items-center gap-2 text-sm">
              <PronunciationButton wordText={word.front} language={code} userPlan={userPlan} />{label}
            </div>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-[#59666D]">Record yourself and listen back. Your recording stays in this browser and is not uploaded. Automatic tone feedback is not available.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button type="button" className="btn-primary mt-5 w-full rounded-xl p-3 font-semibold flex items-center justify-center gap-2"
          onClick={() => recording ? recorder.current?.stop() : start()}>
          {recording ? <Square size={18} /> : <Mic size={18} />}{recording ? 'Stop recording' : 'Record yourself'}
        </button>
        {recordingUrl && !recording && <div className="mt-4"><p className="text-sm mb-2 flex gap-2"><Volume2 size={16} />Your recording</p><audio controls src={recordingUrl} className="w-full" /></div>}
      </section>
    </div>
  );
};
export default TonePracticeModal;
