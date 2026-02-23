import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EntityMention, ConceptTag, LocationTag } from '../../lib/tiptap';
import { useNote, useUpdateNote } from '../../hooks/useNotes';
import { useEditorStore } from '../../stores/editorStore';
import { useRoutines } from '../../hooks/useRoutines';
import EditorToolbar from '../editor/EditorToolbar';
import NoteMetaBar from './NoteMetaBar';
import AudioPlayer from '../media/AudioPlayer';
import PhotoStrip from '../media/PhotoStrip';
import OfflineBar from '../ui/OfflineBar';
import { MOCK_AUDIO } from '../../lib/mockData';

export default function NoteEditor() {
  const { activeNoteId, setDirty } = useEditorStore();
  const { data: note, isLoading } = useNote(activeNoteId);
  const updateNote = useUpdateNote();
  const { data: routinesRes } = useRoutines();
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'map' | 'graph'>('notes');
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const activeRoutine = routinesRes?.data?.find((r) => r.is_active);

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
        if (activeNoteId) {
          const json = editor.getJSON();
          const text = editor.getText();
          updateNote.mutate({ id: activeNoteId, body: json as never, body_text: text } as never);
          setDirty(false);
        }
      }, 1000);
    },
  });

  // Sync note data into editor when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      if (editor && note.body) {
        const currentContent = JSON.stringify(editor.getJSON());
        const newContent = JSON.stringify(note.body);
        if (currentContent !== newContent && Object.keys(note.body).length > 0) {
          editor.commands.setContent(note.body);
        }
      }
    }
  }, [note, editor]);

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
        <EditorToolbar editor={null} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">
          Select a note or create a new one
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <EditorToolbar editor={null} activeTab={activeTab} onTabChange={setActiveTab} />
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
      <EditorToolbar editor={editor} activeTab={activeTab} onTabChange={setActiveTab} />
      <OfflineBar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[780px] mx-auto px-[60px] py-10">
          {/* Title */}
          <textarea
            ref={titleRef}
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Untitled"
            rows={1}
            className="w-full font-serif text-[28px] font-semibold leading-[1.25] text-ink
              bg-transparent border-none outline-none resize-none overflow-hidden
              placeholder:text-ink-ghost"
          />

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

          {/* Audio player — shown for interview/voice_memo notes or when mock audio exists */}
          {note && (note.note_type === 'interview' || note.note_type === 'voice_memo') && (
            <div className="mt-4">
              <AudioPlayer
                noteId={note.id}
                duration={note.id === 'mock-note-1' ? MOCK_AUDIO.duration_seconds ?? undefined : undefined}
                transcriptionStatus={note.id === 'mock-note-1' ? MOCK_AUDIO.transcription_status : undefined}
              />
            </div>
          )}

          {/* Photo strip — shown for interview notes with photos or photo notes */}
          {note && (note.note_type === 'photo' || note.id === 'mock-note-1') && (
            <div className="mt-4">
              <PhotoStrip noteId={note.id} />
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
                {note.id === 'mock-note-1'
                  ? '3 new cross-links detected — Priya Ratnam connects to Galle Coastal Plant Survey via Traditional Medicine.'
                  : 'This note connects to entities and concepts in your knowledge graph.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
