/**
 * Smart templates for different note types.
 * Returns Tiptap-compatible JSON content with structured prompts.
 */

export function getTemplate(noteType: string): Record<string, unknown> | null {
  switch (noteType) {
    case 'interview':
      return {
        type: 'doc',
        content: [
          heading(2, 'Interview Details'),
          paragraph('Interviewee: '),
          paragraph('Date & Time: '),
          paragraph('Location: '),
          heading(2, 'Key Questions'),
          bulletList([
            'Question 1: ',
            'Question 2: ',
            'Question 3: ',
          ]),
          heading(2, 'Observations'),
          paragraph('Setting and atmosphere: '),
          paragraph('Non-verbal cues: '),
          heading(2, 'Key Quotes'),
          blockquote(''),
          heading(2, 'Themes & Follow-ups'),
          bulletList([
            'Theme: ',
            'Follow-up needed: ',
          ]),
        ],
      };
    case 'field_note':
      return {
        type: 'doc',
        content: [
          heading(2, 'Context'),
          paragraph('Location: '),
          paragraph('Weather/conditions: '),
          paragraph('Time: '),
          heading(2, 'Observations'),
          paragraph(''),
          heading(2, 'Entities Encountered'),
          bulletList(['Person/place/artifact: ']),
          heading(2, 'Reflections'),
          paragraph('Connections to previous observations: '),
          paragraph('Questions raised: '),
        ],
      };
    case 'voice_memo':
      return {
        type: 'doc',
        content: [
          heading(2, 'Transcription Notes'),
          paragraph('Key points from recording: '),
          heading(2, 'Context'),
          paragraph('Where/when recorded: '),
          paragraph('Who was present: '),
          heading(2, 'Action Items'),
          bulletList(['Follow up on: ']),
        ],
      };
    case 'photo':
      return {
        type: 'doc',
        content: [
          heading(2, 'Photo Documentation'),
          paragraph('Subject: '),
          paragraph('Location: '),
          paragraph('Significance: '),
          heading(2, 'Visual Details'),
          paragraph('Description of key elements: '),
          heading(2, 'Related Notes'),
          paragraph('Connections: '),
        ],
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tiptap JSON node helpers
// ---------------------------------------------------------------------------

function heading(level: number, text: string) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

function paragraph(text: string) {
  if (!text) return { type: 'paragraph' };
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

function bulletList(items: string[]) {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraph(item)],
    })),
  };
}

function blockquote(text: string) {
  return {
    type: 'blockquote',
    content: [paragraph(text || '"..."')],
  };
}
