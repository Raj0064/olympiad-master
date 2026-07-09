import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlinePencil,
  HiOutlineXMark,
} from 'react-icons/hi2';

// ── helpers ───────────────────────────────────────────────────────────────────

function getTotalQuestions(sections) {
  return sections.reduce((a, s) => a + s.questions.length, 0);
}

function getTotalMarks(sections) {
  return parseFloat(
    sections
      .reduce(
        (a, s) =>
          a +
          s.questions.reduce(
            (qa, q) => qa + parseFloat(q.marks || s.defaultMarks || 1),
            0
          ),
        0
      )
      .toFixed(2)
  );
}

function formatDuration(duration) {
  const mins = parseInt(duration) || 0;

  if (!mins) return 'Unlimited';
  if (mins < 60) return `${mins} min`;
  if (mins % 60 === 0) return `${mins / 60} hr`;

  const hr = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hr} hr ${rem} min`;
}

function formatList(items) {
  const list = items.filter(Boolean);

  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;

  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
}

function buildMarksInstruction(sections) {
  const sectionMarks = sections
    .filter(s => s.questions.length > 0)
    .map(s => {
      const uniqueMarks = [
        ...new Set(
          s.questions.map(q => Number(q.marks || s.defaultMarks || 1) || 1)
        ),
      ];
      return uniqueMarks.length === 1
        ? { name: s.name, mark: uniqueMarks[0] }
        : null;
    })
    .filter(Boolean);

  if (!sectionMarks.length) return '';

  const groups = {};
  sectionMarks.forEach(({ name, mark }) => {
    if (!groups[mark]) groups[mark] = [];
    groups[mark].push(name);
  });

  const marks = Object.keys(groups);

  if (marks.length === 1) {
    const mark = Number(marks[0]);
    return `Each question carries ${mark} ${mark === 1 ? 'mark' : 'marks'}.`;
  }

  if (marks.length === 2) {
    const sorted = marks.sort((a, b) => groups[b].length - groups[a].length);
    const commonMark = Number(sorted[0]);
    const specialMark = Number(sorted[1]);

    if (groups[specialMark].length === 1) {
      const specialSection = groups[specialMark][0];
      return `${specialSection} questions carry ${specialMark} marks each. All other questions carry ${commonMark} ${commonMark === 1 ? 'mark' : 'marks'} each.`;
    }
  }

  return '';
}

function buildDefaultInstructions(exam, sections) {
  const totalQ = getTotalQuestions(sections);
  const durationMins = parseInt(exam.duration) || 0;
  const sectionNames = sections.map(s => s.name).filter(Boolean);
  const marksLine = buildMarksInstruction(sections);

  const lines = [];

  if (totalQ > 0 && durationMins > 0) {
    lines.push(`The exam consists of ${totalQ} questions and the total time is ${durationMins} minutes.`);
  } else if (totalQ > 0) {
    lines.push(`The exam consists of ${totalQ} questions.`);
  } else if (durationMins > 0) {
    lines.push(`The total time is ${durationMins} minutes.`);
  }

  if (sectionNames.length > 0) {
    lines.push(
      `There ${sectionNames.length === 1 ? 'is 1 section' : `are ${sectionNames.length} sections`}: ${formatList(sectionNames)}.`
    );
  }

  if (marksLine) {
    lines.push(marksLine);
  }

  lines.push(`Click on Start Exam button to start the exam.`);

  return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
}

function normalizeInstructionText(notes, exam, sections) {
  if (Array.isArray(notes) && notes.length) return notes.join('\n');
  if (typeof notes === 'string' && notes.trim()) return notes;
  return buildDefaultInstructions(exam, sections);
}

// ── ReviewStep ────────────────────────────────────────────────────────────────

export default function ReviewStep({
  exam,
  sections,
  batchName,
  isEditMode,
  onInstructionsChange,
}) {
  const duration =
    parseInt(exam.duration) === 0 || !exam.duration
      ? 'Unlimited'
      : `${exam.duration} min`;

  const totalQ = getTotalQuestions(sections);
  const totalMarks = getTotalMarks(sections);
  const emptySections = sections.filter(s => s.questions.length === 0);

  const defaultInstructionText = useMemo(
    () => buildDefaultInstructions(exam, sections),
    [exam, sections]
  );

  const instructionText = normalizeInstructionText(
    exam.instructions?.notes,
    exam,
    sections
  );

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const current = exam.instructions?.notes;

    const isEmpty =
      !current ||
      (typeof current === 'string' && !current.trim()) ||
      (Array.isArray(current) && current.length === 0);

    if (isEmpty) {
      onInstructionsChange?.({
        ...exam.instructions,
        notes: defaultInstructionText,
      });
    }
  }, [exam.instructions, defaultInstructionText, onInstructionsChange]);

  return (
    <div className="space-y-5 max-w-lg">
      {isEditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-blue-500">✏️</span>
          <p className="text-xs text-blue-700 font-medium">
            Editing existing exam — review changes before saving
          </p>
        </div>
      )}

      <div className="bg-surface border border-black/8 rounded-xl p-4">
        <p className="text-[11px] font-medium text-text-dark/40 uppercase tracking-wide mb-3">
          Exam Details
        </p>
        <div className="space-y-2">
          {[
            ['Title', exam.title],
            ['Grade', exam.grade ? `Grade ${exam.grade}` : '—'],
            ['Batch', batchName || '—'],
            ['Duration', duration],
            ['Starts', exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleString() : 'Immediately on publish'],
            ['Closes', exam.windowEnd ? new Date(exam.windowEnd).toLocaleString() : 'Until unpublished'],
            ['Tags', exam.tags?.length ? exam.tags.join(', ') : '—'],
          ].map(([l, v]) => (
            <div key={l} className="flex gap-3 text-sm flex-wrap">
              <span className="w-20 text-text-dark/40 flex-shrink-0">{l}</span>
              <span className="text-text-dark font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-black/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium text-text-dark/40 uppercase tracking-wide">
            {sections.length} Section{sections.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-3 text-[11px] text-text-dark/40">
            <span>{totalQ} question{totalQ !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{totalMarks} total marks</span>
          </div>
        </div>

        <div className="divide-y divide-black/6">
          {sections.map(s => {
            const sMarks = parseFloat(
              s.questions
                .reduce((a, q) => a + parseFloat(q.marks || s.defaultMarks || 1), 0)
                .toFixed(2)
            );

            return (
              <div key={s.id} className="flex items-center justify-between py-2.5 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-dark">{s.name}</span>
                  {s.questions.length === 0 && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      empty
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-dark/40">
                  {s.questions.length} Q · {sMarks} marks
                </span>
              </div>
            );
          })}
        </div>

        {totalQ === 0 && (
          <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Add at least one question before saving.
          </p>
        )}

        {totalQ > 0 && emptySections.length > 0 && (
          <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Empty sections:{' '}
            <span className="font-medium">{emptySections.map(s => s.name).join(', ')}</span>
          </p>
        )}
      </div>

      <div className="bg-surface border border-black/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium text-text-dark/40 uppercase tracking-wide">
            Instructions Page
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 text-xs text-accent hover:underline cursor-pointer"
          >
            <HiOutlinePencil className="w-3 h-3" /> Edit
          </button>
        </div>

        <div className="rounded-lg border border-black/8 bg-background p-3 max-h-36 overflow-y-auto">
          <p className="text-xs text-text-dark/60 whitespace-pre-line">
            {instructionText}
          </p>
        </div>
      </div>

      {showModal && (
        <InstructionsModal
          exam={exam}
          sections={sections}
          value={{ notes: instructionText }}
          onChange={onInstructionsChange}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ── Instructions Modal ────────────────────────────────────────────────────────

function InstructionsModal({ exam, sections, value, onChange = () => { }, onClose }) {
  const defaultInstructionText = useMemo(
    () => buildDefaultInstructions(exam, sections),
    [exam, sections]
  );

  const [text, setText] = useState(
    normalizeInstructionText(value?.notes, exam, sections)
  );

  useEffect(() => {
    setText(normalizeInstructionText(value?.notes, exam, sections));
  }, [value?.notes, exam, sections]);

  const handleSave = () => {
    onChange({
      ...value,
      notes: text.trim() || defaultInstructionText,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-2xl bg-background rounded-2xl border border-black/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
          <h3 className="text-base font-semibold text-text-dark">Edit Instructions</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 text-text-dark/40 hover:text-text-dark cursor-pointer"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-3">
          <p className="text-xs text-text-dark/40">
            Edit all instructions in one box. You can type or paste:
          </p>
          <p className="text-xs text-text-dark/30">
            1. Instruction one
            <br />
            2. Instruction two
            <br />
            3. Instruction three
          </p>

          <textarea
            rows={12}
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full text-sm px-3 py-3 rounded-lg border border-black/12 bg-surface text-text-dark placeholder:text-text-dark/25 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            placeholder={defaultInstructionText}
          />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-black/8">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-text-dark/40 hover:text-text-dark px-4 py-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-sm bg-primary text-white px-5 py-2 rounded-lg hover:opacity-90 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student Exam Instruction Page ─────────────────────────────────────────────

export function ExamInstructionsPage({ exam, sections, onBack, onStart }) {
  const totalQ = getTotalQuestions(sections);
  const totalMarks = getTotalMarks(sections);
  const duration = formatDuration(exam.duration);

  const instructionText = normalizeInstructionText(
    exam.instructions?.notes,
    exam,
    sections
  );

  const lines = instructionText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl bg-surface border border-black/8 rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-text-dark mb-4">
          {exam.title || 'Exam Name'}
        </h1>

        <div className="space-y-1 text-sm text-text-dark mb-5">
          <p><span className="font-semibold">Total :</span> {totalQ} Questions</p>
          <p><span className="font-semibold">Marks :</span> {totalMarks}</p>
          <p><span className="font-semibold">Duration :</span> {duration}</p>
        </div>

        <div className="mb-5">
          <p className="text-sm font-semibold text-text-dark mb-2">Instructions :</p>
          <div className="border border-black/10 rounded-xl bg-background p-4 h-56 overflow-y-auto">
            <div className="space-y-2">
              {lines.map((line, index) => (
                <p key={index} className="text-sm text-text-dark leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-11 px-5 rounded-lg border border-black/10 text-sm font-medium text-text-dark hover:bg-black/5 transition-colors cursor-pointer"
          >
            Go Back
          </button>

          <button
            type="button"
            onClick={onStart}
            className="h-11 px-6 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}