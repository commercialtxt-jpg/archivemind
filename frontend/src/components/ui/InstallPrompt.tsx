import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'archivemind-install-dismissed';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  );

  useEffect(() => {
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
    setDeferredPrompt(null);
  };

  return (
    <div
      className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-[340px] z-40
        bg-warm-white border border-border rounded-xl shadow-card-active p-4 animate-slide-up"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
        >
          <span className="text-white text-lg font-serif font-bold">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[14px] font-semibold text-ink mb-0.5">
            Install ArchiveMind
          </p>
          <p className="text-[12px] text-ink-muted leading-snug">
            Add to your home screen for offline access and a native app experience.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDismiss}
          className="flex-1 px-3 py-2 text-[12px] font-medium text-ink-muted bg-sand
            rounded-lg hover:bg-parchment transition-colors cursor-pointer"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 px-3 py-2 text-[12px] font-semibold text-white bg-coral
            rounded-lg hover:bg-coral-dark shadow-coral-btn transition-colors cursor-pointer"
        >
          Install
        </button>
      </div>
    </div>
  );
}
