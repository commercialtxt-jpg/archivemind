import { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioPlayerProps {
  noteId: string;
  src?: string;
  duration?: number;
  transcriptionStatus?: string;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ src, duration, transcriptionStatus }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Destroy old instance and create new one when src changes
  const initWaveSurfer = useCallback(() => {
    if (!containerRef.current) return;

    // Destroy previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setIsReady(false);
    setLoadError(false);
    setIsPlaying(false);
    setCurrentTime(0);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'var(--color-sand-dark)',
      progressColor: 'var(--color-coral)',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 32,
      normalize: true,
      interact: true,
    });

    ws.on('ready', () => {
      setIsReady(true);
      setTotalDuration(ws.getDuration());
    });

    ws.on('timeupdate', (time: number) => {
      setCurrentTime(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    ws.on('error', () => {
      setLoadError(true);
      setIsReady(false);
    });

    wavesurferRef.current = ws;

    if (src) {
      ws.load(src).catch(() => {
        setLoadError(true);
      });
    } else {
      // No src — render an empty/mock waveform using fake peaks
      const fakePeaks = Array.from({ length: 100 }, (_, i) =>
        Math.max(0.05, Math.abs(Math.sin(i * 0.4) * 0.7 + Math.cos(i * 0.9) * 0.3))
      );
      ws.load('', [fakePeaks], duration ?? 180);
    }
  }, [src, duration]);

  useEffect(() => {
    initWaveSurfer();
    return () => {
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const togglePlay = () => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) return;
    ws.playPause();
  };

  return (
    <div className="flex items-center gap-3 bg-parchment border border-border rounded-xl px-4 py-3">
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={!isReady && !loadError}
        className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-coral text-white shadow-coral-btn hover:bg-coral-light transition-all cursor-pointer flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={isPlaying ? 'Pause' : 'Play'}
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

      {/* Waveform container */}
      <div className="flex-1 min-w-0 relative">
        {/* WaveSurfer renders into this div */}
        <div
          ref={containerRef}
          className="w-full"
          style={{ height: 32 }}
        />
        {/* Error / no-src overlay */}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-ink-ghost">Audio unavailable</span>
          </div>
        )}
        {/* Loading shimmer while not ready and no error */}
        {!isReady && !loadError && src && (
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {Array.from({ length: 48 }, (_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-sand-dark animate-pulse"
                style={{ height: `${Math.max(4, 6 + Math.sin(i * 0.8) * 10)}px` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Time display */}
      <span className="font-mono text-[11px] text-ink-muted tabular-nums flex-shrink-0">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </span>

      {/* Transcription badge */}
      {transcriptionStatus && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
            transcriptionStatus === 'completed'
              ? 'bg-sage/10 text-sage'
              : transcriptionStatus === 'processing'
              ? 'bg-amber/10 text-amber animate-pulse-sync'
              : 'bg-sand text-ink-muted'
          }`}
        >
          {transcriptionStatus === 'completed'
            ? 'Transcribed'
            : transcriptionStatus === 'processing'
            ? 'Transcribing...'
            : 'Pending'}
        </span>
      )}
    </div>
  );
}
