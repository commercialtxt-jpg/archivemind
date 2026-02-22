import type { NoteType } from '../../types';

const badgeStyles: Record<NoteType, { bg: string; text: string; label: string }> = {
  interview: {
    bg: 'bg-[rgba(207,106,76,0.12)]',
    text: 'text-coral-dark',
    label: 'Interview',
  },
  photo: {
    bg: 'bg-[rgba(107,140,122,0.12)]',
    text: 'text-sage',
    label: 'Photo',
  },
  voice_memo: {
    bg: 'bg-[rgba(196,132,74,0.12)]',
    text: 'text-amber',
    label: 'Voice Memo',
  },
  field_note: {
    bg: 'bg-[rgba(42,36,32,0.07)]',
    text: 'text-ink-soft',
    label: 'Field Note',
  },
};

export default function NoteTypeBadge({ type }: { type: NoteType }) {
  const style = badgeStyles[type] || badgeStyles.field_note;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
