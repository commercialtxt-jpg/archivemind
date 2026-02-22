import { Node, mergeAttributes } from '@tiptap/react';

export const LocationTag = Node.create({
  name: 'locationTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      lat: { default: null },
      lng: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-location-tag]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'location-tag',
        'data-location-tag': '',
      }),
      `📍 ${HTMLAttributes.label || 'Location'}`,
    ];
  },

  renderText({ node }) {
    return `📍 ${node.attrs.label ?? 'Location'}`;
  },
});
