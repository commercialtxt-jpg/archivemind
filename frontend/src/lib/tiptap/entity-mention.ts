import Mention from '@tiptap/extension-mention';
import type { MentionNodeAttrs } from '@tiptap/extension-mention';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import MentionList from '../../components/editor/MentionList';
import type { MentionListRef, MentionItem } from '../../components/editor/MentionList';
import { MOCK_ENTITIES } from '../mockData';

const allItems: MentionItem[] = MOCK_ENTITIES.map((e) => ({
  id: e.id,
  label: e.name,
  entity_type: e.entity_type,
  avatar_initials: e.avatar_initials,
}));

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
    items: ({ query }: { query: string }) => {
      return allItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);
    },
    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: TippyInstance | null = null;

      return {
        onStart: (props: SuggestionProps<MentionItem, MentionNodeAttrs>) => {
          component = new ReactRenderer(MentionList, {
            props,
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
          component?.updateProps(props);
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
        },
      };
    },
  },
});
