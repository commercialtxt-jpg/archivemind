/**
 * Shared config for inventory status cycling and display.
 * Kept in a separate file to avoid react-refresh fast-reload warnings.
 */

export const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: string }> = {
  ready:   { label: 'Ready',   icon: '✓',  classes: 'bg-sage/10 text-sage border-sage/25' },
  packed:  { label: 'Packed',  icon: '📦', classes: 'bg-sage/10 text-sage border-sage/25' },
  charged: { label: 'Charged', icon: '⚡', classes: 'bg-sage/10 text-sage border-sage/25' },
  low:     { label: 'Low',     icon: '⚡', classes: 'bg-amber/10 text-amber border-amber/25' },
  missing: { label: 'Missing', icon: '✗', classes: 'bg-coral/10 text-coral border-coral/25' },
};

export const STATUS_CYCLE = ['packed', 'ready', 'charged', 'low', 'missing'];
