import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import { useOfflineStore } from '../../stores/offlineStore';
import { useUIStore } from '../../stores/uiStore';
import { useUploadMedia } from '../../hooks/useMedia';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

interface EditorToolbarProps {
  editor: Editor | null;
  activeTab: 'notes' | 'map' | 'graph';
  onTabChange: (tab: 'notes' | 'map' | 'graph') => void;
  note?: { id: string; title: string; body_text: string } | null;
  /** Called when voice recording starts (so editor can show recording UI) */
  onRecordingStart?: () => void;
  /** Called with the recorded blob when recording stops */
  onRecordingStop?: (blob: Blob) => void;
}

export default function EditorToolbar({
  editor,
  activeTab,
  onTabChange,
  note,
  onRecordingStart,
  onRecordingStop,
}: EditorToolbarProps) {
  const navigate = useNavigate();
  const { isOffline, setOffline } = useOfflineStore();
  const { entityPanelOpen, toggleEntityPanel } = useUIStore();
  const [toast, setToast] = useState<string | null>(null);
  const uploadMedia = useUploadMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  // Listen for FAB record button event
  useEffect(() => {
    const handler = () => { if (note && !isRecording) handleVoiceClick(); };
    window.addEventListener('archivemind:start-recording', handler);
    return () => window.removeEventListener('archivemind:start-recording', handler);
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleExport = () => {
    if (!note) return;
    const md = `# ${note.title}\n\n${note.body_text}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'untitled').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ------------------------------------------------------------------
  // Photo upload
  // ------------------------------------------------------------------
  const handlePhotoClick = () => {
    if (!note) {
      showToast('Select a note first');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Reset so the same file can be re-selected later
    e.target.value = '';
    if (!files.length || !note) return;

    // Validate size (max 10 MB per photo)
    const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
    const invalid = files.filter((f) => f.size > MAX_PHOTO_BYTES);
    if (invalid.length) {
      showToast(`File too large (max 10 MB): ${invalid.map((f) => f.name).join(', ')}`);
      return;
    }

    showToast(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}...`);

    for (const file of files) {
      try {
        await uploadMedia.mutateAsync({ file, noteId: note.id, mediaType: 'photo' });
      } catch {
        showToast(`Upload failed: ${file.name}`);
      }
    }
    showToast('Photos uploaded');
  };

  // ------------------------------------------------------------------
  // Voice recording
  // ------------------------------------------------------------------
  const handleVoiceClick = async () => {
    if (!note) {
      showToast('Select a note first');
      return;
    }

    if (isRecording) {
      const file = await stopRecording();
      if (!file) {
        showToast('Recording too large (max 50 MB)');
        return;
      }
      onRecordingStop?.(new Blob([file], { type: file.type }));
      showToast('Uploading recording...');
      try {
        await uploadMedia.mutateAsync({ file, noteId: note.id, mediaType: 'audio' });
        showToast('Recording saved');
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
        if (axiosErr?.response?.status === 403) {
          const msg = axiosErr.response.data?.error || 'Plan limit reached';
          showToast(msg);
          window.dispatchEvent(new CustomEvent('plan-limit-error', { detail: { resource: 'media_uploads', message: msg } }));
        } else {
          showToast('Upload failed — recording lost');
        }
      }
      return;
    }

    const ok = await startRecording();
    if (!ok) {
      showToast('Microphone access denied');
      return;
    }
    onRecordingStart?.();
  };

  return (
    <div className="relative bg-warm-white border-b border-border-light">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFilesSelected}
        aria-label="Upload photos"
      />

      {/* Row 1: View tabs + actions */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-parchment border border-border rounded-lg p-[3px]">
          <ViewTab label="Notes" icon="✏️" active={activeTab === 'notes'} onClick={() => { onTabChange('notes'); navigate('/journal'); }} />
          <ViewTab label="Map" icon="🏠" active={activeTab === 'map'} onClick={() => { onTabChange('map'); navigate('/map'); }} />
          <ViewTab label="Graph" icon="🕸" active={activeTab === 'graph'} onClick={() => { onTabChange('graph'); navigate('/graph'); }} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <ToolbarIconBtn icon="📡" title="Offline mode" active={isOffline} onClick={() => setOffline(!isOffline)} />
          <ToolbarIconBtn icon="🕸" title="Knowledge Graph" active />
          <ToolbarIconBtn icon="⬆" title="Export as Markdown" onClick={handleExport} />
          {!entityPanelOpen && (
            <ToolbarIconBtn icon="↙" title="Open context panel" active onClick={toggleEntityPanel} />
          )}
        </div>
      </div>

      {/* Row 2: Formatting (only when editing) */}
      {activeTab === 'notes' && editor && (
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-t border-border-light">
          {/* Text formatting */}
          <FormatBtn
            label="B" title="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            bold
          />
          <FormatBtn
            label="I" title="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            italic
          />
          <FormatBtn
            label="U" title="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <FormatBtn
            label="H1" title="Heading 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          />
          <FormatBtn
            label="H2" title="Heading 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />

          <div className="w-px h-4 bg-border-light mx-1" />

          {/* Block formatting */}
          <FormatBtn
            label="❝" title="Blockquote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <FormatBtn
            label="☰" title="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />

          <div className="w-px h-4 bg-border-light mx-1" />

          {/* Insert */}
          <FormatBtn label="[[]]" title="Insert entity mention" onClick={() => editor.chain().focus().insertContent('@').run()} />
          <FormatBtn
            label={isRecording ? '⏹' : '🔊'}
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
            active={isRecording}
            onClick={handleVoiceClick}
          />
          <FormatBtn label="📸" title="Upload photo" onClick={handlePhotoClick} />
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-coral/5 border-t border-coral/20">
          <span className="w-2 h-2 rounded-full bg-coral animate-pulse" aria-hidden="true" />
          <span className="text-[11px] text-coral font-medium">Recording — click ⏹ to stop</span>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="absolute bottom-[-36px] right-4 bg-ink text-cream text-[11px] px-3 py-1.5 rounded-md shadow-card-active z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ViewTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1 text-[12.5px] rounded-md transition-all cursor-pointer
        ${active
          ? 'bg-white text-ink font-semibold shadow-tab-active'
          : 'text-ink-muted hover:bg-white/70 hover:text-ink font-medium'
        }
      `}
    >
      <span className="text-[11px]">{icon}</span>
      {label}
    </button>
  );
}

function ToolbarIconBtn({
  icon,
  title,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex items-center justify-center w-7 h-7 rounded-md text-sm transition-all cursor-pointer
        ${active
          ? 'bg-glow-coral text-coral'
          : 'text-ink-muted hover:bg-sand hover:text-ink'
        }
      `}
    >
      {icon}
    </button>
  );
}

function FormatBtn({
  label,
  title,
  active,
  onClick,
  bold,
  italic,
}: {
  label: string;
  title: string;
  active?: boolean;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md text-[12.5px] transition-all cursor-pointer
        ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''}
        ${active
          ? 'bg-glow-coral text-coral'
          : 'text-ink-muted hover:bg-parchment hover:text-ink'
        }
      `}
    >
      {label}
    </button>
  );
}
