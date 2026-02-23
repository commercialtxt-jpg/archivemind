/**
 * HighlightText
 * Renders text with search-query matches highlighted.
 * Handles empty queries and special regex chars gracefully.
 */

interface HighlightTextProps {
  text: string;
  query: string;
  /** Extra className applied to the wrapper span */
  className?: string;
}

export default function HighlightText({ text, query, className }: HighlightTextProps) {
  // No highlighting needed
  if (!query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters in the query string
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let parts: React.ReactNode[];
  try {
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const segments = text.split(regex);
    parts = segments.map((segment, idx) => {
      if (regex.test(segment)) {
        return (
          <mark
            key={idx}
            className="bg-glow-coral text-coral font-medium rounded-[2px] px-[1px]"
            style={{ background: 'rgba(207,106,76,0.18)' }}
          >
            {segment}
          </mark>
        );
      }
      return segment;
    });
  } catch {
    // Fallback: plain text if regex construction fails
    parts = [text];
  }

  return <span className={className}>{parts}</span>;
}
