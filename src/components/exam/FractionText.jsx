// src/components/ui/FractionText.jsx

// ─── Parser ───────────────────────────────────────────────────────────────────
// Handles:
//   2/3        → simple fraction
//   2 3/5      → mixed fraction
// Safely ignores:
//   3/5/2024   → date (third slash+digit after)
//   m/s        → units (letters, not digits)
//   10/10/2023 → date

function parseFractions(text) {
  if (!text) return [];

  const parts = [];

  // Mixed fraction FIRST (e.g. "2 3/5"), then simple (e.g. "2/3")
  // Denominator capped at 3 digits → avoids matching years (2024 = 4 digits)
  // Negative lookahead (?![\d\/]) → avoids partial date matches like 3/5/2024
  const regex =
    /(\d+)\s+(\d+)\/(\d{1,3})(?![\d\/])|(\d+)\/(\d{1,3})(?![\d\/])/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      // Mixed fraction: whole=match[1], num=match[2], den=match[3]
      parts.push({
        type: 'mixed',
        whole: match[1],
        num: match[2],
        den: match[3],
      });
    } else {
      // Simple fraction: num=match[4], den=match[5]
      parts.push({ type: 'fraction', num: match[4], den: match[5] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

// ─── Fraction visual ──────────────────────────────────────────────────────────
function Frac({ num, den }) {
  return (
    <span
      className="inline-flex flex-col items-center mx-[3px]"
      style={{ verticalAlign: 'middle', lineHeight: 1 }}
    >
      {/* Numerator */}
      <span
        className="border-b border-current px-[3px]"
        style={{ fontSize: '0.78em', lineHeight: 1.35 }}
      >
        {num}
      </span>
      {/* Denominator */}
      <span
        className="px-[3px]"
        style={{ fontSize: '0.78em', lineHeight: 1.35 }}
      >
        {den}
      </span>
    </span>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
// Drop-in replacement for any text node where fractions may appear.
// Inherits font-size and color from parent — no extra styling needed.
//
// Usage:
//   <FractionText text="Find 2 3/5 + 1/2 of the total." />
//
export function FractionText({ text }) {
  if (!text) return null;

  const parts = parseFractions(text);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          // Preserve newlines — parent uses whitespace-pre-line
          return <span key={i}>{part.value}</span>;
        }

        if (part.type === 'fraction') {
          return <Frac key={i} num={part.num} den={part.den} />;
        }

        if (part.type === 'mixed') {
          return (
            <span
              key={i}
              className="inline-flex items-center"
              style={{ verticalAlign: 'middle' }}
            >
              <span>{part.whole}</span>
              <Frac num={part.num} den={part.den} />
            </span>
          );
        }

        return null;
      })}
    </>
  );
}