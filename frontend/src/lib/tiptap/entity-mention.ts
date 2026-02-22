import Mention from '@tiptap/extension-mention';

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
  },
});
