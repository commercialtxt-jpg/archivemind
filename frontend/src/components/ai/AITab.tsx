import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useAiStore } from '../../stores/aiStore';
import {
  useAiChat,
  useAiConversations,
  useAiConversation,
  useDeleteAiConversation,
  useAiStatus,
  useRelatedNotes,
  useTimeline,
  useSuggestTags,
} from '../../hooks/useAI';
import { useUsage } from '../../hooks/useUsage';
import UpgradePrompt from '../shared/UpgradePrompt';
import type { AiMessage, RelatedNote, TimelineEntry, SuggestedTag } from '../../types';

type SubTab = 'chat' | 'insights';

export default function AITab() {
  const [subTab, setSubTab] = useState<SubTab>('chat');
  const { data: usage } = useUsage();

  const tier = usage?.plan ?? 'free';
  const hasAiAccess = tier === 'pro' || tier === 'team';
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!hasAiAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] px-4 text-center gap-3">
        {showUpgrade && (
          <UpgradePrompt resource="ai_requests" message="AI features require a Pro or Team plan." onDismiss={() => setShowUpgrade(false)} />
        )}
        <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center">
          <span className="text-2xl">&#x1F512;</span>
        </div>
        <h3 className="font-serif text-[14px] font-semibold text-ink">AI Assistant</h3>
        <p className="text-[12px] text-ink-muted leading-relaxed max-w-[200px]">
          AI-powered research chat, auto-tagging, and related notes require a Pro or Team plan.
        </p>
        <button
          onClick={() => setShowUpgrade(true)}
          className="px-4 py-1.5 text-[12px] font-medium text-white bg-coral rounded-lg hover:bg-coral-dark shadow-coral-btn transition-colors cursor-pointer"
        >
          View Plans
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex gap-0.5 px-2.5 py-1.5 flex-shrink-0 border-b border-border-light">
        <button
          onClick={() => setSubTab('chat')}
          className={`px-2.5 py-[4px] rounded-[6px] text-[11px] font-medium transition-all cursor-pointer ${
            subTab === 'chat'
              ? 'bg-white text-coral font-semibold shadow-[0_1px_3px_rgba(0,0,0,.06)]'
              : 'text-ink-muted hover:bg-sand'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setSubTab('insights')}
          className={`px-2.5 py-[4px] rounded-[6px] text-[11px] font-medium transition-all cursor-pointer ${
            subTab === 'insights'
              ? 'bg-white text-coral font-semibold shadow-[0_1px_3px_rgba(0,0,0,.06)]'
              : 'text-ink-muted hover:bg-sand'
          }`}
        >
          Insights
        </button>
      </div>

      {subTab === 'chat' ? <ChatPanel /> : <InsightsPanel />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat Panel
// ---------------------------------------------------------------------------

function ChatPanel() {
  const activeNoteId = useEditorStore((s) => s.activeNoteId);
  const { activeConversationId, setActiveConversationId } = useAiStore();
  const { data: aiStatus } = useAiStatus();
  const { data: conversations } = useAiConversations(activeNoteId);
  const { data: conversationData } = useAiConversation(activeConversationId);
  const chat = useAiChat();
  const deleteConversation = useDeleteAiConversation();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<AiMessage[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationData?.messages) {
      setLocalMessages(conversationData.messages);
    }
  }, [conversationData]);

  useEffect(() => {
    setActiveConversationId(null);
    setLocalMessages([]);
  }, [activeNoteId, setActiveConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || chat.isPending) return;

    const tempUserMsg: AiMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId || '',
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, tempUserMsg]);
    setInput('');

    try {
      const result = await chat.mutateAsync({
        conversationId: activeConversationId,
        noteId: activeNoteId,
        message: trimmed,
      });
      if (!activeConversationId) {
        setActiveConversationId(result.conversation_id);
      }
      setLocalMessages((prev) => [...prev, result.message]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 403) {
        setShowUpgrade(true);
        setLocalMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      } else {
        setLocalMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            conversation_id: activeConversationId || '',
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    }
  };

  const isComingSoon = aiStatus && !aiStatus.enabled;
  const providerLabel = aiStatus?.provider === 'claude' ? 'Claude' : aiStatus?.provider === 'perplexity' ? 'Perplexity' : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {showUpgrade && (
        <UpgradePrompt resource="ai_requests" onDismiss={() => setShowUpgrade(false)} />
      )}

      {/* Note context + provider indicator */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0 space-y-1">
        {activeNoteId && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber/8 border border-amber/15 text-[10px] text-amber">
            <span>&#x1F4DD;</span>
            <span className="truncate">Chatting about current note</span>
          </div>
        )}
        {providerLabel && (
          <div className="text-[9px] text-ink-ghost text-center">
            Powered by {providerLabel}
          </div>
        )}
      </div>

      {/* Coming soon banner */}
      {isComingSoon && (
        <div className="px-3 pt-1 flex-shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-coral/6 border border-coral/15 text-[11px] text-coral">
            <span>&#x2728;</span>
            <span>AI chat coming soon! Set ANTHROPIC_API_KEY to enable.</span>
          </div>
        </div>
      )}

      {/* Conversation selector */}
      {conversations && conversations.length > 0 && !activeConversationId && (
        <div className="px-3 pt-2 flex-shrink-0">
          <span className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest">Past Conversations</span>
          <div className="space-y-1 max-h-[100px] overflow-y-auto mt-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-white border border-border-light hover:border-coral/30 transition-all cursor-pointer group"
                onClick={() => setActiveConversationId(conv.id)}
              >
                <span className="text-[11px] flex-shrink-0">&#x1F4AC;</span>
                <span className="flex-1 text-[11.5px] text-ink truncate">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation.mutate(conv.id); if (activeConversationId === conv.id) { setActiveConversationId(null); setLocalMessages([]); } }}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-ink-ghost hover:text-coral transition-all cursor-pointer"
                >&#x2715;</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeConversationId && (
        <div className="px-3 pt-2 flex-shrink-0">
          <button onClick={() => { setActiveConversationId(null); setLocalMessages([]); }}
            className="flex items-center gap-1 text-[10.5px] text-ink-muted hover:text-coral transition-colors cursor-pointer">
            <span>&#x2190;</span><span>New conversation</span>
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 min-h-0">
        {localMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
            <span className="text-2xl">&#x2728;</span>
            <p className="text-[12px] text-ink-ghost leading-relaxed max-w-[200px]">
              {isComingSoon
                ? 'AI research assistant is coming soon.'
                : 'Ask questions about your notes, discover connections, or find related research.'}
            </p>
          </div>
        )}
        {localMessages.filter((m) => m.role !== 'system').map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {chat.isPending && (
          <div className="flex items-start gap-2">
            <div className="bg-white border border-border-light rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-1.5">
        <div className="flex items-end gap-2 bg-white rounded-xl border border-border-light p-1.5 focus-within:border-coral/40 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={isComingSoon ? 'AI coming soon...' : 'Ask about your research...'}
            rows={1}
            className="flex-1 text-[12.5px] text-ink bg-transparent border-none outline-none resize-none max-h-[80px] py-1 px-1.5 placeholder:text-ink-ghost"
          />
          <button onClick={handleSend} disabled={!input.trim() || chat.isPending}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-coral text-white text-[13px] disabled:opacity-40 hover:bg-coral-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
            &#x2191;
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights Panel (auto-tags, related notes, timeline — no AI needed)
// ---------------------------------------------------------------------------

function InsightsPanel() {
  const activeNoteId = useEditorStore((s) => s.activeNoteId);
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);
  const { data: suggestedTags } = useSuggestTags(activeNoteId);
  const { data: relatedNotes } = useRelatedNotes(activeNoteId);
  const { data: timeline } = useTimeline();

  if (!activeNoteId) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center gap-2">
        <span className="text-2xl">&#x1F50D;</span>
        <p>Select a note to see insights, suggested tags, and related notes.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
      {/* Suggested tags */}
      {suggestedTags && suggestedTags.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2">
            Suggested Tags
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.map((tag: SuggestedTag) => (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] border cursor-default transition-colors ${
                  tag.tag_type === 'entity'
                    ? 'bg-coral/8 text-coral border-coral/20'
                    : 'bg-sage/8 text-sage border-sage/20'
                }`}
              >
                <span>{tag.tag_type === 'entity' ? (tag.entity_type === 'person' ? '&#x1F464;' : tag.entity_type === 'location' ? '&#x1F4CD;' : '&#x1F52E;') : '&#x1F3F7;'}</span>
                {tag.name}
              </span>
            ))}
          </div>
          <p className="text-[9px] text-ink-ghost mt-1.5">
            Entities and concepts mentioned in your note but not yet linked.
          </p>
        </div>
      )}

      {suggestedTags && suggestedTags.length === 0 && (
        <div className="text-[11px] text-ink-ghost text-center py-3">
          All mentioned entities and concepts are already linked.
        </div>
      )}

      {/* Related notes */}
      {relatedNotes && relatedNotes.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2">
            Related Notes
          </h4>
          <div className="space-y-1.5">
            {relatedNotes.map((note: RelatedNote) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className="w-full text-left p-2 rounded-lg bg-white border border-border-light hover:border-coral/30 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[12px] mt-0.5 flex-shrink-0">{noteTypeIcon(note.note_type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-serif font-medium text-ink line-clamp-1">{note.title || 'Untitled'}</p>
                    <p className="text-[10px] text-ink-ghost mt-0.5 line-clamp-1">{note.body_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {note.shared_entities > 0 && (
                        <span className="text-[9px] text-coral">{note.shared_entities} shared {note.shared_entities === 1 ? 'entity' : 'entities'}</span>
                      )}
                      {note.shared_concepts > 0 && (
                        <span className="text-[9px] text-sage">{note.shared_concepts} shared {note.shared_concepts === 1 ? 'concept' : 'concepts'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {relatedNotes && relatedNotes.length === 0 && (
        <div className="text-[11px] text-ink-ghost text-center py-3">
          No related notes found. Add entity mentions and concept tags to discover connections.
        </div>
      )}

      {/* Timeline */}
      {timeline && timeline.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2">
            Research Timeline
          </h4>
          <div className="relative pl-4">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border-light" />
            <div className="space-y-2">
              {timeline.slice(0, 15).map((entry: TimelineEntry) => (
                <button
                  key={entry.id}
                  onClick={() => setActiveNoteId(entry.id)}
                  className="w-full text-left relative cursor-pointer group"
                >
                  {/* Dot */}
                  <div className={`absolute -left-4 top-1.5 w-[9px] h-[9px] rounded-full border-2 border-white ${
                    entry.id === activeNoteId
                      ? 'bg-coral shadow-[0_0_0_2px_rgba(207,106,76,.3)]'
                      : 'bg-sand-dark group-hover:bg-coral/60'
                  } transition-colors`} />
                  <div className="pl-1.5">
                    <p className="text-[10px] text-ink-ghost">
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {entry.location_name && <span className="ml-1">&#x00B7; {entry.location_name}</span>}
                    </p>
                    <p className={`text-[11px] font-serif leading-tight mt-0.5 ${
                      entry.id === activeNoteId ? 'text-coral font-semibold' : 'text-ink group-hover:text-coral'
                    } transition-colors`}>
                      {noteTypeIcon(entry.note_type)} {entry.title || 'Untitled'}
                    </p>
                    {(entry.entity_count > 0 || entry.concept_count > 0) && (
                      <p className="text-[9px] text-ink-ghost mt-0.5">
                        {entry.entity_count > 0 && `${entry.entity_count} entities`}
                        {entry.entity_count > 0 && entry.concept_count > 0 && ' · '}
                        {entry.concept_count > 0 && `${entry.concept_count} concepts`}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
          isUser
            ? 'bg-coral/10 text-ink rounded-tr-sm'
            : 'bg-white border border-border-light text-ink rounded-tl-sm font-serif'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border-light flex flex-wrap gap-1">
            {message.citations.map((citation, i) => (
              <a key={i} href={citation.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage/10 text-sage text-[10px] hover:bg-sage/20 transition-colors">
                <span>&#x1F517;</span>
                <span className="truncate max-w-[140px]">{citation.title || citation.url}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noteTypeIcon(noteType: string): string {
  switch (noteType) {
    case 'interview': return '\uD83C\uDF99';
    case 'photo': return '\uD83D\uDCF7';
    case 'voice_memo': return '\uD83C\uDFA4';
    case 'field_note': return '\uD83D\uDCCB';
    default: return '\uD83D\uDCDD';
  }
}
