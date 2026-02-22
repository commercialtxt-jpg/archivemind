import { useState, useRef, useCallback } from 'react';

interface AudioPlayerProps {
  noteId: string;
  src?: string;
  duration?: number;
  transcriptionStatus?: string;
}

const BARS = 48;

export default function AudioPlayer({ src, duration, transcriptionStatus }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animFrameRef = useRef<number>(0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
      animFrameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      cancelAnimationFrame(animFrameRef.current);
    } else {
      audio.play();
      animFrameRef.current = requestAnimationFrame(tick);
    }
    setIsPlaying(!isPlaying);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    cancelAnimationFrame(animFrameRef.current);
  };

  const totalDuration = duration ?? 0;

  return (
    <div className="flex items-center gap-3 bg-parchment border border-border rounded-xl px-4 py-3">
      {/* Play button */}
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-coral text-white shadow-coral-btn hover:bg-coral-light transition-all cursor-pointer flex-shrink-0"
      >
        {isPlaying ? (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <rect x="1" y="1" width="3" height="12" rx="1" />
            <rect x="8" y="1" width="3" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <path d="M1 1.5v11l10-5.5z" />
          </svg>
        )}
      </button>

      {/* Waveform bars */}
      <div className="flex items-end gap-[2px] h-[32px] flex-1">
        {Array.from({ length: BARS }, (_, i) => {
          const barProgress = i / BARS;
          const isPast = barProgress <= progress;
          const height = 6 + Math.sin(i * 0.8) * 10 + Math.cos(i * 1.3) * 6;
          return (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors duration-100"
              style={{
                height: `${Math.max(4, height)}px`,
                backgroundColor: isPast ? 'var(--color-coral)' : 'var(--color-sand-dark)',
                animation: isPlaying && isPast ? `wave-anim 0.4s ease-in-out ${i * 0.02}s infinite alternate` : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Duration */}
      <span className="font-mono text-[11px] text-ink-muted tabular-nums flex-shrink-0">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </span>

      {/* Transcription badge */}
      {transcriptionStatus && (
        <span className={`
          text-[10px] px-1.5 py-0.5 rounded font-medium
          ${transcriptionStatus === 'completed'
            ? 'bg-sage/10 text-sage'
            : transcriptionStatus === 'processing'
            ? 'bg-amber/10 text-amber animate-pulse-sync'
            : 'bg-sand text-ink-muted'
          }
        `}>
          {transcriptionStatus === 'completed' ? 'Transcribed' : transcriptionStatus === 'processing' ? 'Transcribing...' : 'Pending'}
        </span>
      )}

      {src && <audio ref={audioRef} src={src} onEnded={handleEnded} preload="metadata" />}
    </div>
  );
}
