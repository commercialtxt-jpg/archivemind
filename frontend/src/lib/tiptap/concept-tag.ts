import { Node, mergeAttributes } from '@tiptap/react';

export const ConceptTag = Node.create({
  name: 'conceptTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-concept-tag]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'concept-tag',
        'data-concept-tag': '',
      }),
      `#${HTMLAttributes.label || HTMLAttributes.id}`,
    ];
  },

  renderText({ node }) {
    return `#${node.attrs.label ?? node.attrs.id}`;
  },
});
