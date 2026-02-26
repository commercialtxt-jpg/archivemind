import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useCreateNote } from '../../hooks/useNotes';
import { useUploadMedia } from '../../hooks/useMedia';

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCaptured: (noteId: string) => void;
}

export default function QuickCaptureModal({ open, onClose, onCaptured }: QuickCaptureModalProps) {
  const geo = useGeolocation();
  const audio = useAudioRecorder();
  const createNote = useCreateNote();
  const uploadMedia = useUploadMedia();

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fire GPS on open
  useEffect(() => {
    if (open) {
      geo.requestLocation();
    }
    // Reset state when closing
    if (!open) {
      setPhotos([]);
      setPhotoPreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      setAudioFile(null);
      setTitle('');
      setQuickNotes('');
      setIsSaving(false);
      setSaveError(null);
      geo.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Revoke URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotosSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
    const valid = files.filter((f) => f.size <= MAX_PHOTO_BYTES);

    setPhotos((prev) => [...prev, ...valid]);
    setPhotoPreviewUrls((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleAudioToggle = useCallback(async () => {
    if (audio.isRecording) {
      const file = await audio.stopRecording();
      if (file) setAudioFile(file);
    } else {
      setAudioFile(null);
      await audio.startRecording();
    }
  }, [audio]);

  const removeAudio = useCallback(() => {
    setAudioFile(null);
  }, []);

  const hasAnything = !!(geo.result || photos.length || audioFile || quickNotes.trim());

  const handleSave = async () => {
    if (!hasAnything || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const noteTitle =
        title.trim() ||
        `Field capture — ${geo.result?.locationName ?? new Date().toLocaleDateString()}`;

      // Build a minimal Tiptap JSON doc if quickNotes exists
      const body = quickNotes.trim()
        ? {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: quickNotes.trim() }] }],
          }
        : { type: 'doc', content: [{ type: 'paragraph' }] };

      const note = await createNote.mutateAsync({
        title: noteTitle,
        note_type: 'field_note',
        body,
        body_text: quickNotes.trim(),
        location_name: geo.result?.locationName ?? null,
        location_lat: geo.result?.lat ?? null,
        location_lng: geo.result?.lng ?? null,
        gps_coords: geo.result?.gpsCoords ?? null,
      } as never);

      if (!note?.id) throw new Error('Note creation failed');

      // Upload photos sequentially
      for (const file of photos) {
        await uploadMedia.mutateAsync({ file, noteId: note.id, mediaType: 'photo' });
      }

      // Upload audio
      if (audioFile) {
        await uploadMedia.mutateAsync({ file: audioFile, noteId: note.id, mediaType: 'audio' });
      }

      onCaptured(note.id);
    } catch {
      setSaveError('Save failed — please try again');
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md bg-warm-white rounded-t-2xl sm:rounded-2xl shadow-card-active
          max-h-[90vh] overflow-y-auto animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold text-ink font-heading">Quick Capture</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-ink-muted hover:bg-sand
              transition-colors text-[14px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* ── Location ── */}
          <Section label="Location">
            {geo.isLocating && (
              <div className="flex items-center gap-2 text-[12px] text-ink-muted">
                <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
                Acquiring GPS...
              </div>
            )}
            {geo.result && (
              <div className="text-[12px] text-ink-mid">
                <span className="font-medium text-ink">{geo.result.locationName}</span>
                <span className="text-ink-ghost ml-2">{geo.result.gpsCoords}</span>
              </div>
            )}
            {geo.error && (
              <div className="flex items-center gap-2 text-[12px] text-coral">
                {geo.error}
                <button
                  onClick={() => geo.requestLocation()}
                  className="text-[11px] underline cursor-pointer hover:text-coral/80"
                >
                  Retry
                </button>
              </div>
            )}
          </Section>

          {/* ── Photos ── */}
          <Section label="Photos">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="sr-only"
              onChange={handlePhotosSelected}
            />
            <div className="flex flex-wrap gap-2">
              {photoPreviewUrls.map((url, i) => (
                <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border-light">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-ink/60 text-white rounded-full
                      text-[9px] flex items-center justify-center cursor-pointer hover:bg-ink/80"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center
                  text-ink-ghost text-[18px] hover:border-sage hover:text-sage transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
          </Section>

          {/* ── Voice Note ── */}
          <Section label="Voice Note">
            {audioFile ? (
              <div className="flex items-center gap-2 text-[12px] text-ink-mid">
                <span className="text-sage">Recording saved</span>
                <span className="text-ink-ghost">({(audioFile.size / 1024).toFixed(0)} KB)</span>
                <button
                  onClick={removeAudio}
                  className="text-coral text-[11px] underline cursor-pointer hover:text-coral/80"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={handleAudioToggle}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                  audio.isRecording
                    ? 'bg-coral/10 text-coral border border-coral/30'
                    : 'bg-sand text-ink-mid hover:bg-sand/80'
                }`}
              >
                {audio.isRecording ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
                    Stop recording ({formatElapsed(audio.elapsed)})
                  </>
                ) : (
                  <>
                    <span className="text-[13px]">🎙</span>
                    Record audio
                  </>
                )}
              </button>
            )}
          </Section>

          {/* ── Title ── */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Field capture — ${geo.result?.locationName ?? 'location pending...'}`}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] text-ink
                placeholder:text-ink-ghost/50 focus:outline-none focus:border-sage transition-colors"
            />
          </div>

          {/* ── Quick Notes ── */}
          <div>
            <textarea
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="Quick observations..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] text-ink
                placeholder:text-ink-ghost/50 focus:outline-none focus:border-sage transition-colors resize-none"
            />
          </div>

          {/* ── Error ── */}
          {saveError && (
            <p className="text-[12px] text-coral">{saveError}</p>
          )}

          {/* ── Save ── */}
          <button
            onClick={handleSave}
            disabled={!hasAnything || isSaving}
            className="w-full py-2.5 rounded-xl bg-sage text-white text-[13px] font-semibold
              hover:bg-sage/90 transition-all cursor-pointer
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Capture'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
