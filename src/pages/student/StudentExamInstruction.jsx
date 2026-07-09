import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getExam, checkExamAccess } from '../../services/exam.service';
import { checkAlreadySubmitted } from '../../services/submission.service';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { safeNum } from '../../utils/safeHelpers';

export default function ExamInstructions() {
  const { examId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    async function load() {
      try {
        const examData = await getExam(examId);
        if (!examData) {
          setError('Exam not found.');
          return;
        }

        const access = checkExamAccess(examData, userProfile);
        if (!access.allowed) {
          setError(access.reason);
          return;
        }

        const already = await checkAlreadySubmitted(currentUser.uid, examId);
        if (already) {
          navigate(`/student/results/${examId}`, { replace: true });
          return;
        }

        setExam(examData);
      } catch (e) {
        setError(e.message || 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [examId, currentUser, userProfile, navigate]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <HiOutlineExclamationTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-dark">Cannot Start Exam</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/student/exams')}
            className="mt-5 w-full h-10 rounded-xl border border-border text-sm font-medium text-dark hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const totalQ = getTotalQuestions(exam);
  const totalMarks = getTotalMarks(exam);
  const duration = formatDuration(exam.duration);
  const instructions = getInstructionText(exam, totalQ, duration);

  function handleStart() {
    sessionStorage.setItem(`instructions-seen-${examId}`, '1');
    navigate(`/exam/${examId}`);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-dark mb-5">
          {exam.title || 'Exam Name'}
        </h1>

        <div className="space-y-2 text-sm text-dark mb-6">
          <p>
            <span className="font-semibold">Total :</span> {totalQ} Questions
          </p>
          <p>
            <span className="font-semibold">Marks :</span> {formatMarks(totalMarks)}
          </p>
          <p>
            <span className="font-semibold">Duration :</span> {duration}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-dark mb-2">Instructions :</p>

          <div className="h-56 overflow-y-auto rounded-xl border border-border bg-background p-4">
            <p className="text-sm text-dark leading-7 whitespace-pre-line">
              {instructions}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/student/exams')}
            className="h-11 px-5 rounded-xl border border-border text-sm font-medium text-dark hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Go Back
          </button>

          <button
            onClick={handleStart}
            className="h-11 px-6 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}

function getTotalQuestions(exam) {
  const topLevel = safeNum(exam?.totalQuestions);
  if (topLevel > 0) return topLevel;

  if (!Array.isArray(exam?.sections)) return 0;

  return exam.sections.reduce((sum, sec) => {
    if (safeNum(sec?.totalQuestions) > 0) return sum + safeNum(sec.totalQuestions);
    if (Array.isArray(sec?.questions)) return sum + sec.questions.length;
    return sum;
  }, 0);
}

function getTotalMarks(exam) {
  const topLevel = safeNum(exam?.totalMarks);
  if (topLevel > 0) return topLevel;

  if (!Array.isArray(exam?.sections)) return 0;

  return exam.sections.reduce((sum, sec) => {
    if (safeNum(sec?.totalMarks) > 0) return sum + safeNum(sec.totalMarks);

    if (Array.isArray(sec?.questions)) {
      return (
        sum +
        sec.questions.reduce((qSum, q) => {
          return qSum + Number(q?.marks || sec?.defaultMarks || 1);
        }, 0)
      );
    }

    return sum;
  }, 0);
}

function formatDuration(value) {
  const mins = safeNum(value);

  if (!mins) return 'Unlimited';
  if (mins < 60) return `${mins} min`;
  if (mins % 60 === 0) return `${mins / 60} hr`;

  const hr = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hr} hr ${rem} min`;
}

function formatMarks(value) {
  return Number.isInteger(value) ? value : value.toFixed(2);
}

function getInstructionText(exam, totalQ, duration) {
  const custom = exam?.instructions?.notes;

  if (typeof custom === 'string' && custom.trim()) {
    return custom;
  }

  const sectionNames = Array.isArray(exam?.sections)
    ? exam.sections.map(sec => sec?.name).filter(Boolean)
    : [];

  const lines = [];

  if (totalQ > 0) {
    lines.push(`1. The exam consists of ${totalQ} questions and the total time is ${duration}.`);
  }

  if (sectionNames.length > 0) {
    lines.push(
      `2. There ${sectionNames.length === 1 ? 'is 1 section' : `are ${sectionNames.length} sections`}: ${joinNames(sectionNames)}.`
    );
  }

  const marksLine = buildMarksLine(exam?.sections || []);
  if (marksLine) {
    lines.push(`3. ${marksLine}`);
    lines.push(`4. Click on Start Exam button to start the exam.`);
  } else {
    lines.push(`3. Click on Start Exam button to start the exam.`);
  }

  return lines.join('\n');
}

function joinNames(names) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function buildMarksLine(sections) {
  if (!Array.isArray(sections) || !sections.length) return '';

  const sectionMarks = sections
    .map(sec => {
      const marks = [];

      if (Array.isArray(sec?.questions) && sec.questions.length) {
        sec.questions.forEach(q => {
          marks.push(Number(q?.marks || sec?.defaultMarks || 1));
        });
      } else if (safeNum(sec?.defaultMarks) > 0) {
        marks.push(Number(sec.defaultMarks));
      }

      const unique = [...new Set(marks.filter(Boolean))];

      if (unique.length === 1) {
        return {
          name: sec?.name,
          mark: unique[0],
        };
      }

      return null;
    })
    .filter(Boolean);

  if (!sectionMarks.length) return '';

  const grouped = {};
  sectionMarks.forEach(item => {
    if (!grouped[item.mark]) grouped[item.mark] = [];
    grouped[item.mark].push(item.name);
  });

  const markKeys = Object.keys(grouped).map(Number);

  if (markKeys.length === 1) {
    const mark = markKeys[0];
    return `Each question carries ${mark} ${mark === 1 ? 'mark' : 'marks'}.`;
  }

  if (markKeys.length === 2) {
    const sorted = markKeys.sort((a, b) => grouped[b].length - grouped[a].length);
    const commonMark = sorted[0];
    const specialMark = sorted[1];

    if (grouped[specialMark].length === 1) {
      const specialSection = grouped[specialMark][0];
      return `${specialSection} questions carry ${specialMark} marks each. All other questions carry ${commonMark} ${commonMark === 1 ? 'mark' : 'marks'} each.`;
    }
  }

  return '';
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 animate-pulse">
        <div className="h-8 w-1/2 bg-slate-200 rounded mb-6" />
        <div className="space-y-3 mb-6">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-36 bg-slate-200 rounded" />
        </div>
        <div className="h-56 bg-slate-100 rounded-xl mb-6" />
        <div className="flex justify-between gap-3">
          <div className="h-11 w-28 bg-slate-200 rounded-xl" />
          <div className="h-11 w-36 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}