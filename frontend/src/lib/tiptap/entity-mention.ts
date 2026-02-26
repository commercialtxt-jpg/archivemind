import Mention from '@tiptap/extension-mention';
import type { MentionNodeAttrs } from '@tiptap/extension-mention';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import MentionList from '../../components/editor/MentionList';
import type { MentionListRef, MentionItem } from '../../components/editor/MentionList';
import api from '../api';
import type { ApiResponse, Entity } from '../../types';

// ---------------------------------------------------------------------------
// Entity item cache — populated on first @-mention keystroke
// ---------------------------------------------------------------------------

let cachedItems: MentionItem[] = [];
let cachePopulated = false;

/** Busts the entity cache so newly created entities appear in suggestions. */
export function bustEntityCache() {
  cachePopulated = false;
  cachedItems = [];
}

async function loadEntityItems(): Promise<MentionItem[]> {
  if (cachePopulated) return cachedItems;
  try {
    const { data } = await api.get<ApiResponse<Entity[]>>('/entities');
    cachedItems = (data.data ?? []).map((e) => ({
      id: e.id,
      label: e.name,
      entity_type: e.entity_type,
      avatar_initials: e.avatar_initials,
    }));
    cachePopulated = true;
  } catch {
    // Leave cache empty — autocomplete simply won't offer suggestions
  }
  return cachedItems;
}

// ---------------------------------------------------------------------------
// EntityMention Tiptap extension
// ---------------------------------------------------------------------------

export const EntityMention = Mention.extend({
  name: 'entityMention',

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      { ...HTMLAttributes, class: 'entity-mention', 'data-id': node.attrs.id },
      `@${node.attrs.label ?? node.attrs.id}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label ?? node.attrs.id}`;
  },
}).configure({
  HTMLAttributes: {
    class: 'entity-mention',
  },
  suggestion: {
    char: '@',
    allowSpaces: true,

    items: async ({ query }: { query: string }) => {
      const items = await loadEntityItems();
      return items
        .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8);
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: TippyInstance | null = null;
      // Keep a reference to the latest query so onCreateEntity can use it
      let currentQuery = '';

      /**
       * Create a new entity via POST /entities, bust the local cache so the
       * next @ keystroke will reload entities, and return { id, label } so
       * MentionList can call `command()` to insert the node.
       */
      async function handleCreateEntity(name: string): Promise<{ id: string; label: string }> {
        const { data } = await api.post<ApiResponse<Entity>>('/entities', {
          name,
          entity_type: 'person',
        });
        const entity = data.data;
        bustEntityCache();
        return { id: entity.id, label: entity.name };
      }

      return {
        onStart: (props: SuggestionProps<MentionItem, MentionNodeAttrs>) => {
          currentQuery = props.query ?? '';

          component = new ReactRenderer(MentionList, {
            props: {
              ...props,
              query: currentQuery,
              onCreateEntity: handleCreateEntity,
            },
            editor: props.editor,
          });

          if (!props.clientRect) return;

          [popup] = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props: SuggestionProps<MentionItem, MentionNodeAttrs>) {
          currentQuery = props.query ?? '';
          component?.updateProps({
            ...props,
            query: currentQuery,
            onCreateEntity: handleCreateEntity,
          });

          if (props.clientRect) {
            popup?.setProps({
              getReferenceClientRect: props.clientRect as () => DOMRect,
            });
          }
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            popup?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup?.destroy();
          component?.destroy();
          popup = null;
          component = null;
        },
      };
    },
  },
});
