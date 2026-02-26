import { useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { SidebarContent } from './Sidebar';

export default function MobileDrawer() {
  const { drawerOpen, setDrawerOpen } = useUIStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen, setDrawerOpen]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = touchStartXRef.current - e.touches[0].clientX;
    // Left swipe greater than 80px closes the drawer
    if (deltaX > 80) {
      setDrawerOpen(false);
      touchStartXRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartXRef.current = null;
  };

  if (!drawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 animate-fade-in"
      aria-modal="true"
      role="dialog"
      aria-label="Navigation drawer"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        className="absolute top-0 left-0 bottom-0 w-[280px] bg-sidebar-bg flex flex-col overflow-hidden
          shadow-card-active animate-slide-in-left"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <SidebarContent onItemClick={() => setDrawerOpen(false)} />
      </div>
    </div>
  );
}
