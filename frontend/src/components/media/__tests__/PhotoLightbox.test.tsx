import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoLightbox from '../PhotoLightbox';
import type { Media } from '../../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePhoto(overrides: Partial<Media> = {}): Media {
  return {
    id: `photo-${Math.random()}`,
    note_id: 'note-1',
    media_type: 'photo',
    s3_key: '',
    original_filename: 'photo.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: 1024,
    duration_seconds: null,
    label: null,
    transcription_status: 'none',
    transcription_text: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const photos: Media[] = [
  makePhoto({ id: 'p1', label: 'Market scene', original_filename: 'market.jpg' }),
  makePhoto({ id: 'p2', label: 'Herb garden', original_filename: 'garden.jpg' }),
  makePhoto({ id: 'p3', label: 'Ritual ceremony', original_filename: 'ritual.jpg' }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PhotoLightbox', () => {
  it('renders the current photo label', () => {
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={0}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Market scene')).toBeInTheDocument();
  });

  it('shows the correct photo counter', () => {
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={1}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={0}
        onIndexChange={vi.fn()}
        onClose={onClose}
      />
    );
    await user.click(screen.getByLabelText('Close lightbox'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={0}
        onIndexChange={vi.fn()}
        onClose={onClose}
      />
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onIndexChange with next index on ArrowRight', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={0}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
      />
    );
    await user.keyboard('{ArrowRight}');
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('calls onIndexChange with prev index on ArrowLeft', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={1}
        currentIndex={1}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
      />
    );
    await user.keyboard('{ArrowLeft}');
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('does not call onIndexChange on ArrowRight when on last photo', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={2}
        currentIndex={2}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
      />
    );
    await user.keyboard('{ArrowRight}');
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('next button navigates forward', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={0}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Next photo'));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('prev button navigates backward', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={1}
        currentIndex={1}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Previous photo'));
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('prev button is disabled on first photo', () => {
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={0}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const prevBtn = screen.getByLabelText('Previous photo') as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
  });

  it('next button is disabled on last photo', () => {
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={2}
        currentIndex={2}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const nextBtn = screen.getByLabelText('Next photo') as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
  });

  it('renders thumbnail strip when there are multiple photos', () => {
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={0}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    // 3 thumbnail buttons
    const thumbnails = screen.getAllByLabelText(/View photo \d/);
    expect(thumbnails).toHaveLength(3);
  });

  it('clicking a thumbnail calls onIndexChange with that index', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <PhotoLightbox
        photos={photos}
        initialIndex={0}
        currentIndex={0}
        onIndexChange={onIndexChange}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('View photo 3'));
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });
});
