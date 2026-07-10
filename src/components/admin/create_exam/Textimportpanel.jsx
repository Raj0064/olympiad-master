import { useState } from 'react';

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Parser ───────────────────────────────────────────────────────────────────
function parseBlock(lines) {
  let correctAnswer = 'A';
  const textLines = [];
  const explLines = [];
  let inExpl = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Answer: A  |  Ans: (A)  |  Correct: A  |  Key: A
    const ansMatch = trimmed.match(
      /^(?:Answer|Ans(?:wer)?|Correct(?:\s*Answer)?|Key)\s*[:\-]\s*\(?([A-Da-d])\)?/i
    );

    // Explanation: ...  |  Feedback: ...  |  Solution: ...
    const explMatch = trimmed.match(
      /^(?:Explanation|Feedback|Solution|Note|Reason)\s*[:\-]\s*(.*)/i
    );

    if (inExpl) {
      // Keep collecting explanation lines until we hit an Answer line
      if (ansMatch) {
        inExpl = false;
        correctAnswer = ansMatch[1].toUpperCase();
      } else {
        explLines.push(line);
      }
    } else if (ansMatch) {
      correctAnswer = ansMatch[1].toUpperCase();
      inExpl = false;
    } else if (explMatch) {
      inExpl = true;
      if (explMatch[1].trim()) explLines.push(explMatch[1]);
    } else {
      textLines.push(line);
    }
  }

  // Trim trailing blank lines from question text
  const questionText = textLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!questionText) return null;

  return {
    id: uid(),
    text: questionText,
    imageUrl: '',
    imageSize: 'medium',
    imageUploading: false,
    options: { A: 'A', B: 'B', C: 'C', D: 'D' },
    correctAnswer,
    marks: '',
    explanation: explLines.join('\n').trim(),
    explanationImageUrl: '',
    explanationUploading: false,
    tags: [],
    topicId: '',
    topicName: '',
    subtopicId: '',
    subtopicName: '',
  };
}

export function parseQuestionsFromText(rawText) {
  // Normalise line endings
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');

  const questions = [];
  let currentBlock = [];

  // A line that starts a new question: "1." "1)" "Q1." "Q.1)" etc.
  const isQuestionStart = (line) =>
    /^(?:Q\.?\s*)?\d+[.)]\s*\S/.test(line.trim());

  for (const line of lines) {
    if (isQuestionStart(line)) {
      if (currentBlock.length > 0) {
        const q = parseBlock(currentBlock);
        if (q) questions.push(q);
      }
      currentBlock = [line];
    } else if (currentBlock.length > 0) {
      // Only accumulate lines once we're inside a question block
      currentBlock.push(line);
    }
  }

  // Flush last block
  if (currentBlock.length > 0) {
    const q = parseBlock(currentBlock);
    if (q) questions.push(q);
  }

  return questions;
}

// ─── Preview list ─────────────────────────────────────────────────────────────
function ParsePreview({ questions, hasExistingQuestions, onImport, onReset }) {
  return (
    <div className="space-y-3">
      {/* Success header */}
      <div className="flex items-center justify-between bg-success-bg border border-success/25 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-success">
            {questions.length} question{questions.length !== 1 ? 's' : ''} parsed
          </p>
          <p className="text-xs text-success/60 mt-0.5">Review before importing</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-success/50 hover:text-success transition-colors font-medium"
        >
          ← Re-enter
        </button>
      </div>

      {/* Warning if questions already exist */}
      {hasExistingQuestions && (
        <div className="text-xs text-warning bg-warning-bg border border-warning/25 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <span className="flex-shrink-0">⚠️</span>
          <span>
            These will be <strong>added</strong> to existing questions in this
            section, not replace them.
          </span>
        </div>
      )}

      {/* Question cards */}
      <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border/50 max-h-[26rem] overflow-y-auto">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="flex items-start gap-3 px-4 py-3 hover:bg-background transition-colors"
          >
            <span className="text-[11px] font-bold text-text-faint w-5 pt-px flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              {/* Show question text with line breaks preserved */}
              <p className="text-sm text-text-dark whitespace-pre-line line-clamp-5">
                {q.text}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-success bg-success-bg px-1.5 py-0.5 rounded-full">
                  ✓ {q.correctAnswer}
                </span>
                {q.explanation && (
                  <span className="text-[10px] font-medium text-accent bg-accent/8 border border-accent/15 px-1.5 py-0.5 rounded-full">
                    has explanation
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Import CTA */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onImport(questions)}
          className="text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          Import {questions.length} Questions →
        </button>
        <p className="text-xs text-text-faint">
          You can edit any question after import
        </p>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function TextImportPanel({ onImport, hasExistingQuestions }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [showFormat, setShowFormat] = useState(false);

  function handleParse() {
    setError('');
    setPreview(null);
    const questions = parseQuestionsFromText(text);
    if (questions.length === 0) {
      setError(
        'No questions found. Make sure each question starts with a number followed by "." or ")" — e.g. "1." or "1)".'
      );
      return;
    }
    setPreview(questions);
  }

  if (preview) {
    return (
      <ParsePreview
        questions={preview}
        hasExistingQuestions={hasExistingQuestions}
        onImport={onImport}
        onReset={() => setPreview(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Format Guide */}
      <div className="border border-border rounded-xl bg-background overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFormat((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-dark hover:bg-surface transition-colors"
        >
          <span>📘 Expected Format</span>
          <span className="text-text-faint">
            {showFormat ? "Hide ▲" : "Show ▼"}
          </span>
        </button>

        {showFormat && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            <pre className="font-mono text-[11px] leading-[1.65] text-text-muted whitespace-pre-wrap bg-surface border border-border/60 rounded-lg px-3 py-2.5">
              {`7. How many edges are in a complete graph with 8 vertices?
(A) 28
(B) 36
(C) 64
(D) 56
Answer: A
Explanation: n(n-1)/2 = 8×7/2 = 28`}
            </pre>

            <ul className="text-[11px] text-text-faint space-y-1">
              <li>
                • Each question must start with a number +{" "}
                <code className="bg-surface px-1 rounded">.</code> or{" "}
                <code className="bg-surface px-1 rounded">)</code>
              </li>
              <li>• Options stay inside the question text exactly as written.</li>
              <li>
                • <code className="bg-surface px-1 rounded">Answer:</code> line is required.
              </li>
              <li>
                • <code className="bg-surface px-1 rounded">Explanation:</code> is optional.
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Textarea */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Paste your questions
        </label>
        <textarea
          rows={14}
          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-text-dark outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 resize-y bg-surface transition-all duration-150 placeholder:text-text-faint font-mono leading-relaxed"
          placeholder={`1. What is the speed of light?\n(A) 3×10⁸ m/s\n(B) 3×10⁶ m/s\n(C) 3×10⁵ m/s\n(D) 3×10⁴ m/s\nAnswer: A\nExplanation: Speed of light in vacuum is 3×10⁸ m/s\n\n2. Next question...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-xl px-3 py-2.5">
          ⚠️ {error}
        </div>
      )}

      {/* Parse button */}
      <button
        type="button"
        onClick={handleParse}
        disabled={!text.trim()}
        className="text-sm font-medium bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl transition-all duration-150 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.98]"
      >
        Parse & Preview →
      </button>
    </div>
  );
}