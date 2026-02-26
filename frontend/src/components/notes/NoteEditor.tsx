import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EntityMention, ConceptTag, LocationTag } from '../../lib/tiptap';
import { useNote, useUpdateNote, useToggleStar } from '../../hooks/useNotes';
import { useMedia } from '../../hooks/useMedia';
import { useEditorStore } from '../../stores/editorStore';
import { useRoutines } from '../../hooks/useRoutines';
import EditorToolbar from '../editor/EditorToolbar';
import NoteMetaBar from './NoteMetaBar';
import AudioPlayer from '../media/AudioPlayer';
import PhotoStrip from '../media/PhotoStrip';
import OfflineBar from '../ui/OfflineBar';

export default function NoteEditor() {
  const { activeNoteId, setDirty } = useEditorStore();
  const { data: note, isLoading } = useNote(activeNoteId);
  const updateNote = useUpdateNote();
  const toggleStar = useToggleStar();
  const { data: routinesRes } = useRoutines();
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'map' | 'graph'>('notes');
  const [isRecording, setIsRecording] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Keep a ref to activeNoteId so the onUpdate closure always reads the current
  // value without going stale between debounce ticks.
  const activeNoteIdRef = useRef<string | null>(activeNoteId);
  // Track previous activeNoteId so we can detect a note switch.
  const prevNoteIdRef = useRef<string | null>(null);

  // useRoutines queryFn returns ApiResponse<Routine[]> — TanStack stores it as the query data.
  // Destructuring `{ data: routinesRes }` gives us ApiResponse<Routine[]>, so .data is Routine[].
  const routinesList = Array.isArray(routinesRes?.data) ? routinesRes.data : [];
  const activeRoutine = routinesList.find((r) => r.is_active);

  // Fetch media counts so we can auto-show players when media exists
  const { data: audioMedia } = useMedia(activeNoteId, 'audio');
  const { data: photoMedia } = useMedia(activeNoteId, 'photo');

  const hasAudio =
    isRecording ||
    (audioMedia && audioMedia.length > 0) ||
    note?.note_type === 'interview' ||
    note?.note_type === 'voice_memo';

  const hasPhotos =
    (photoMedia && photoMedia.length > 0) ||
    note?.note_type === 'photo';

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2] },
    }),
    Placeholder.configure({
      placeholder: 'Start writing your field notes...',
    }),
    Underline,
    EntityMention,
    ConceptTag,
    LocationTag,
  ], []);

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-warm max-w-none outline-none min-h-[300px]',
      },
    },
    onUpdate: ({ editor }) => {
      setDirty(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        // Read from the ref — avoids the stale-closure bug where an old
        // note's debounce timer fires and saves into the newly-created note.
        const currentId = activeNoteIdRef.current;
        if (currentId) {
          const json = editor.getJSON();
          const text = editor.getText();
          updateNote.mutate({ id: currentId, body: json as never, body_text: text } as never);
          setDirty(false);
        }
      }, 1000);
    },
  });

  // Keep the activeNoteId ref in sync so the onUpdate debounce closure is
  // never stale (see ref usage in useEditor above).
  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  // === Note-switch guard ===
  // When activeNoteId changes, immediately clear the editor and title so the
  // old note's content is never visible while the new note is loading.
  // Also cancel any pending debounced save so it cannot write old content
  // into the newly-created note.
  useEffect(() => {
    if (activeNoteId === prevNoteIdRef.current) return;
    prevNoteIdRef.current = activeNoteId;

    // Cancel any pending debounced body save from the previous note.
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }

    // Immediately reset title and editor content.
    setTitle('');
    if (editor) {
      editor.commands.setContent('');
    }
  }, [activeNoteId, editor]);

  // === Note-data sync ===
  // Once the server data for the active note arrives, populate the editor.
  // We key on note.id so this only runs when we have fresh data for a
  // *different* note — not on every background refetch.
  useEffect(() => {
    if (!note) return;

    setTitle(note.title);

    if (editor) {
      const hasBody =
        note.body !== null &&
        note.body !== undefined &&
        typeof note.body === 'object' &&
        Object.keys(note.body).length > 0;

      if (hasBody) {
        const currentContent = JSON.stringify(editor.getJSON());
        const newContent = JSON.stringify(note.body);
        if (currentContent !== newContent) {
          editor.commands.setContent(note.body);
        }
      } else {
        // New / empty note — make sure the editor is blank.
        editor.commands.setContent('');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]); // Only re-run when the note ID changes, not on every refetch

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [title]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTitle(e.target.value);
      setDirty(true);
    },
    [setDirty]
  );

  const handleTitleBlur = useCallback(() => {
    if (activeNoteId && title !== note?.title) {
      updateNote.mutate({ id: activeNoteId, title } as never);
      setDirty(false);
    }
  }, [activeNoteId, title, note?.title, updateNote, setDirty]);

  if (!activeNoteId) {
    return (
      <div className="flex flex-col h-full">
        <EditorToolbar editor={null} activeTab={activeTab} onTabChange={setActiveTab} note={null} />
        <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">
          Select a note or create a new one
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <EditorToolbar editor={null} activeTab={activeTab} onTabChange={setActiveTab} note={null} />
        <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">
          Loading...
        </div>
      </div>
    );
  }

  // Routine progress
  const routineProgress = activeRoutine
    ? Math.round(
        (activeRoutine.checklist.filter((c) => c.done).length /
          Math.max(1, activeRoutine.checklist.length)) *
          100
      )
    : 0;

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar
        editor={editor}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        note={note ?? null}
        onRecordingStart={() => setIsRecording(true)}
        onRecordingStop={() => setIsRecording(false)}
      />
      <OfflineBar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[780px] mx-auto px-[60px] py-10">
          {/* Title */}
          <div className="flex items-start gap-2">
            <textarea
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="Untitled"
              rows={1}
              className="flex-1 font-serif text-[28px] font-semibold leading-[1.25] text-ink
                bg-transparent border-none outline-none resize-none overflow-hidden
                placeholder:text-ink-ghost"
            />
            {note && (
              <button
                onClick={() => toggleStar.mutate(note.id)}
                className={`mt-2 text-[20px] transition-colors cursor-pointer flex-shrink-0 ${
                  note.is_starred ? 'text-amber' : 'text-ink-ghost hover:text-amber/60'
                }`}
                title={note.is_starred ? 'Unstar' : 'Star'}
              >
                {note.is_starred ? '★' : '☆'}
              </button>
            )}
          </div>

          {/* Meta bar */}
          {note && <NoteMetaBar note={note} />}

          {/* Routine banner */}
          {activeRoutine && (
            <div
              className="mt-3 rounded-lg border-l-3 border-sage px-3 py-2.5 flex items-center justify-between"
              style={{ background: 'linear-gradient(90deg, rgba(107,140,122,.08), transparent)' }}
            >
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-sage">🔄</span>
                <span className="font-medium text-ink">{activeRoutine.name}</span>
              </div>
              <span className="text-[11px] font-semibold text-sage">{routineProgress}%</span>
            </div>
          )}

          {/* Audio player — shown when note has audio media OR is an interview/voice_memo type */}
          {activeNoteId && hasAudio && (
            <div className="mt-4">
              <AudioPlayer noteId={activeNoteId} />
            </div>
          )}

          {/* Photo strip — shown when note has photo media OR is a photo type */}
          {activeNoteId && hasPhotos && (
            <div className="mt-4">
              <PhotoStrip noteId={activeNoteId} />
            </div>
          )}

          {/* Tiptap editor */}
          <div className="mt-6">
            <EditorContent editor={editor} />
          </div>

          {/* Graph Note box */}
          {note && (
            <div
              className="mt-6 rounded-[10px] p-3"
              style={{
                background: 'rgba(196,132,74,.06)',
                border: '1px solid rgba(196,132,74,.2)',
              }}
            >
              <div className="flex items-center gap-2 text-[12px] text-amber font-medium mb-1">
                <span>🔗</span>
                Graph Note
              </div>
              <p className="text-[11.5px] text-ink-muted">
                This note connects to entities and concepts in your knowledge graph.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
