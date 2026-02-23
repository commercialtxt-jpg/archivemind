import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteCard from '../NoteCard';
import type { NoteSummary } from '../../../types';

// Stub useUIStore so NoteCard doesn't need a store provider
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: () => '',
}));

const baseNote: NoteSummary = {
  id: 'note-1',
  workspace_id: 'ws-1',
  title: 'Herbal Healer of Kandy',
  body_text: 'Priya Ratnam is a third-generation Ayurvedic practitioner.',
  note_type: 'interview',
  is_starred: false,
  location_name: 'Kandy',
  gps_coords: null,
  weather: null,
  tags: ['plants', 'medicine'],
  duration_seconds: null,
  created_at: new Date(Date.now() - 3600_000).toISOString(), // 1h ago
  updated_at: new Date().toISOString(),
};

describe('NoteCard', () => {
  it('renders the title', () => {
    render(<NoteCard note={baseNote} isActive={false} onClick={vi.fn()} />);
    expect(screen.getByText('Herbal Healer of Kandy')).toBeInTheDocument();
  });

  it('renders the excerpt', () => {
    render(<NoteCard note={baseNote} isActive={false} onClick={vi.fn()} />);
    expect(
      screen.getByText('Priya Ratnam is a third-generation Ayurvedic practitioner.')
    ).toBeInTheDocument();
  });

  it('renders all tags', () => {
    render(<NoteCard note={baseNote} isActive={false} onClick={vi.fn()} />);
    expect(screen.getByText('plants')).toBeInTheDocument();
    expect(screen.getByText('medicine')).toBeInTheDocument();
  });

  it('renders location when present', () => {
    render(<NoteCard note={baseNote} isActive={false} onClick={vi.fn()} />);
    expect(screen.getByText('Kandy')).toBeInTheDocument();
  });

  it('does not render location when absent', () => {
    const note = { ...baseNote, location_name: null };
    render(<NoteCard note={note} isActive={false} onClick={vi.fn()} />);
    expect(screen.queryByText('Kandy')).not.toBeInTheDocument();
  });

  it('renders duration when present', () => {
    const note = { ...baseNote, duration_seconds: 125 };
    render(<NoteCard note={note} isActive={false} onClick={vi.fn()} />);
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('does not render tags section when tags is empty', () => {
    const note = { ...baseNote, tags: [] };
    render(<NoteCard note={note} isActive={false} onClick={vi.fn()} />);
    expect(screen.queryByText('plants')).not.toBeInTheDocument();
  });

  it('shows "Untitled" when title is empty', () => {
    const note = { ...baseNote, title: '' };
    render(<NoteCard note={note} isActive={false} onClick={vi.fn()} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('applies active styling when isActive is true', () => {
    const { container } = render(
      <NoteCard note={baseNote} isActive={true} onClick={vi.fn()} />
    );
    const button = container.querySelector('button');
    expect(button?.className).toMatch(/bg-card-bg/);
  });

  it('does not apply active styling when isActive is false', () => {
    const { container } = render(
      <NoteCard note={baseNote} isActive={false} onClick={vi.fn()} />
    );
    const button = container.querySelector('button');
    expect(button?.className).not.toMatch(/bg-card-bg/);
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<NoteCard note={baseNote} isActive={false} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
