/**
 * Renders shift/job description that may contain HTML from the backend.
 */
import RenderHTML from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';

function escapePlainText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** If string has no tags, wrap as a paragraph so line breaks / entities render predictably. */
export function normalizeShiftDescriptionHtml(raw: string | undefined | null): string {
  const t = (raw ?? '').trim();
  if (!t) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(t)) return t;
  return `<p>${escapePlainText(t)}</p>`;
}

type Props = {
  html: string;
  textColor: string;
  mutedColor: string;
  /** Horizontal padding already accounted for outside (sheet uses ~20 each side). */
  horizontalPadding?: number;
};

export function ShiftDescriptionHtml({
  html,
  textColor,
  mutedColor,
  horizontalPadding = 40,
}: Props) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(0, width - horizontalPadding);

  if (!(html ?? '').trim()) return null;

  const source = normalizeShiftDescriptionHtml(html);

  return (
    <RenderHTML
      contentWidth={contentWidth}
      source={{ html: source }}
      baseStyle={{
        fontSize: 14,
        lineHeight: 22,
        color: mutedColor,
      }}
      tagsStyles={{
        body: { color: mutedColor },
        p: { marginTop: 0, marginBottom: 10, color: mutedColor },
        div: { color: mutedColor },
        span: { color: mutedColor },
        li: { color: mutedColor, marginBottom: 6 },
        ul: { paddingLeft: 18, marginBottom: 10 },
        ol: { paddingLeft: 18, marginBottom: 10 },
        h1: { fontSize: 20, color: textColor, marginBottom: 8 },
        h2: { fontSize: 17, color: textColor, marginBottom: 8 },
        h3: { fontSize: 15, color: textColor, marginBottom: 6 },
        strong: { color: textColor, fontWeight: '600' },
        b: { color: textColor, fontWeight: '600' },
        em: { fontStyle: 'italic' },
        a: { color: mutedColor, textDecorationLine: 'underline' },
        br: { marginBottom: 4 },
      }}
    />
  );
}
