import { useState } from "react";
import { IoCopyOutline, IoCheckmarkOutline, IoCloseOutline } from "react-icons/io5";

const OPTIONS = ["A", "B", "C", "D"];

function buildText(sections, title) {
  const lines = [];

  if (title) {
    lines.push(title.toUpperCase());
    lines.push("=".repeat(Math.min(title.length, 60)));
    lines.push("");
  }

  let globalQ = 0;

  sections.forEach((section, sIdx) => {
    lines.push(`SECTION ${sIdx + 1}: ${section.name || "Untitled"}`);
    lines.push(`Default marks: ${section.defaultMarks || 1} per question`);
    lines.push("-".repeat(44));
    lines.push("");

    section.questions.forEach((q) => {
      globalQ++;
      lines.push(`Q${globalQ}. ${q.text || "[Image-only question]"}`);

      OPTIONS.forEach((opt) => {
        const isCorrect = q.correctAnswer === opt;
        lines.push(
          `    ${opt})  ${q.options?.[opt] || ""}${isCorrect ? "  ✓" : ""}`
        );
      });

      lines.push(
        `Answer: ${q.correctAnswer}   |   Marks: ${q.marks || section.defaultMarks || 1}`
      );

      if (q.topicName)
        lines.push(
          `Topic: ${q.topicName}${q.subtopicName ? " › " + q.subtopicName : ""}`
        );

      if (q.tags?.length)
        lines.push(`Tags: ${q.tags.join(", ")}`);

      if (q.explanation)
        lines.push(`Explanation: ${q.explanation}`);

      lines.push("");
    });

    lines.push("");
  });

  return lines.join("\n");
}

export default function ExportModal({ sections, title, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = buildText(sections, title);
  const totalQ = sections.reduce((a, s) => a + s.questions.length, 0);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] border border-border">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-text-dark">
              {title || "Export Questions"}
            </p>
            <p className="text-xs text-text-faint mt-0.5">
              {totalQ} question{totalQ !== 1 ? "s" : ""} across{" "}
              {sections.length} section{sections.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 shadow-sm active:scale-95 ${copied
                  ? "bg-success text-white"
                  : "bg-primary hover:bg-primary-hover text-white"
                }`}
            >
              {copied ? (
                <>
                  <IoCheckmarkOutline size={14} />
                  Copied!
                </>
              ) : (
                <>
                  <IoCopyOutline size={14} />
                  Copy All
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text-dark hover:bg-background p-2 rounded-xl transition-all duration-150"
            >
              <IoCloseOutline size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <pre className="flex-1 overflow-y-auto px-5 py-4 text-xs text-text-dark font-mono whitespace-pre-wrap leading-relaxed bg-background rounded-b-2xl">
          {text}
        </pre>

      </div>
    </div>
  );
}