import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { EntityMention, ConceptTag, LocationTag } from '../../lib/tiptap';
import { useNote, useUpdateNote, useToggleStar } from '../../hooks/useNotes';
import { useMedia } from '../../hooks/useMedia';
import { useEditorStore } from '../../stores/editorStore';
import { useRoutines } from '../../hooks/useRoutines';
import { useAiComplete, useAiStatus } from '../../hooks/useAI';
import { useUsage } from '../../hooks/useUsage';
import EditorToolbar from '../editor/EditorToolbar';
import NoteMetaBar from './NoteMetaBar';
import AudioPlayer from '../media/AudioPlayer';
import PhotoStrip from '../media/PhotoStrip';
import OfflineBar from '../ui/OfflineBar';
import { getTemplate } from '../../lib/templates';

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

  // AI autocompletion
  const aiComplete = useAiComplete();
  const { data: aiStatus } = useAiStatus();
  const { data: usage } = useUsage();
  const tier = usage?.plan ?? 'free';
  const hasAi = (tier === 'pro' || tier === 'team') && aiStatus?.enabled;
  const [completion, setCompletion] = useState<string | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Word count / reading time
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const readingTime = Math.max(1, Math.ceil(wordCount / 238));

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
      // StarterKit v3 bundles Underline — no need to add it separately.
    }),
    Placeholder.configure({
      placeholder: 'Start writing your field notes...',
    }),
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
      // Update word/char counts
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);

      // Clear any pending completion
      setCompletion(null);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const currentId = activeNoteIdRef.current;
        if (currentId) {
          const json = editor.getJSON();
          const t = editor.getText();
          updateNote.mutate({ id: currentId, body: json as never, body_text: t } as never);
          setDirty(false);
        }
      }, 1000);

      // Trigger AI autocompletion after 3s of pause (if AI enabled and text is long enough)
      if (hasAi && text.length > 50) {
        completionTimeoutRef.current = setTimeout(async () => {
          const lastChars = text.slice(-500);
          try {
            const result = await aiComplete.mutateAsync({
              noteId: activeNoteIdRef.current,
              text: lastChars,
            });
            if (result.completion && !result.coming_soon) {
              setCompletion(result.completion);
            }
          } catch {
            // Silently ignore completion errors
          }
        }, 3000);
      }
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
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = undefined;
    }
    setCompletion(null);

    // Immediately reset title and editor content.
    setTitle('');
    setWordCount(0);
    setCharCount(0);
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

    // Set initial word/char counts
    if (note.body_text) {
      const words = note.body_text.trim() ? note.body_text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(note.body_text.length);
    }

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
        // New / empty note — apply smart template if available
        const template = note.note_type ? getTemplate(note.note_type) : null;
        if (template) {
          editor.commands.setContent(template);
        } else {
          editor.commands.setContent('');
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]); // Only re-run when the note ID changes, not on every refetch

  // Tab key to accept AI completion
  useEffect(() => {
    if (!completion) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && completion && editor) {
        e.preventDefault();
        editor.chain().focus().insertContent(completion).run();
        setCompletion(null);
      } else if (e.key === 'Escape' && completion) {
        setCompletion(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [completion, editor]);

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
        <div className="max-w-full md:max-w-[780px] mx-auto px-4 py-6 md:px-[60px] md:py-10">
          {/* Title */}
          <div className="flex items-start gap-2">
            <textarea
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="Untitled"
              rows={1}
              className="flex-1 font-serif text-[22px] md:text-[28px] font-semibold leading-[1.25] text-ink
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

          {/* AI Completion suggestion */}
          {completion && (
            <div className="mt-2 px-1">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-parchment border border-amber/15">
                <span className="text-[11px] text-amber mt-0.5 flex-shrink-0">{'\u2728'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-ink-muted font-serif italic leading-relaxed">{completion}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => {
                        if (editor) {
                          editor.chain().focus().insertContent(completion).run();
                          setCompletion(null);
                        }
                      }}
                      className="text-[10px] font-medium text-coral hover:text-coral-dark cursor-pointer transition-colors"
                    >
                      Accept (Tab)
                    </button>
                    <button
                      onClick={() => setCompletion(null)}
                      className="text-[10px] text-ink-ghost hover:text-ink-muted cursor-pointer transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <span>{'\uD83D\uDD17'}</span>
                Graph Note
              </div>
              <p className="text-[11.5px] text-ink-muted">
                This note connects to entities and concepts in your knowledge graph.
              </p>
            </div>
          )}

          {/* Writing stats */}
          {note && (
            <div className="mt-4 flex items-center gap-4 text-[10px] text-ink-ghost">
              <span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
              <span>{charCount.toLocaleString()} chars</span>
              <span>{readingTime} min read</span>
              {hasAi && <span className="text-coral/50">{'\u2728'} AI enabled</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
