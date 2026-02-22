import type { Editor } from '@tiptap/react';
import { useOfflineStore } from '../../stores/offlineStore';

interface EditorToolbarProps {
  editor: Editor | null;
  activeTab: 'notes' | 'map' | 'graph';
  onTabChange: (tab: 'notes' | 'map' | 'graph') => void;
}

export default function EditorToolbar({ editor, activeTab, onTabChange }: EditorToolbarProps) {
  const { isOffline, setOffline } = useOfflineStore();

  return (
    <div className="bg-warm-white border-b border-border-light">
      {/* Row 1: View tabs + actions */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-parchment border border-border rounded-lg p-[3px]">
          <ViewTab label="Notes" icon="✏️" active={activeTab === 'notes'} onClick={() => onTabChange('notes')} />
          <ViewTab label="Map" icon="🏠" active={activeTab === 'map'} onClick={() => onTabChange('map')} />
          <ViewTab label="Graph" icon="🕸" active={activeTab === 'graph'} onClick={() => onTabChange('graph')} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <ToolbarIconBtn icon="📡" title="Offline mode" active={isOffline} onClick={() => setOffline(!isOffline)} />
          <ToolbarIconBtn icon="🕸" title="Knowledge Graph" active />
          <ToolbarIconBtn icon="⬆" title="Export" />
          <ToolbarIconBtn icon="⚙" title="Settings" />
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
          <FormatBtn label="[[]]" title="Insert entity mention" onClick={() => {}} />
          <FormatBtn label="🔊" title="Insert voice" onClick={() => {}} />
          <FormatBtn label="📸" title="Insert photo" onClick={() => {}} />
        </div>
      )}
    </div>
  );
}

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
