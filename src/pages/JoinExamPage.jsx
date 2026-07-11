// src/pages/JoinExamPage.jsx
// Public route — handles WhatsApp shared exam links
// Redirects to login (with redirect param) if not logged in,
// or straight to exam instructions if already logged in.

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function JoinExamPage() {
  const { examId } = useParams();
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      // Not logged in → go to login, save where to go after
      navigate(`/login?redirect=/join/exam/${examId}`, { replace: true });
      return;
    }

    if (userProfile?.role === 'student') {
      // Logged in student → go directly to exam instructions
      navigate(`/exam/${examId}/instructions`, { replace: true });
      return;
    }

    if (userProfile?.role === 'admin') {
      // Admin accidentally opened a student link → send to admin panel
      navigate('/admin/exams', { replace: true });
    }
  }, [loading, currentUser, userProfile, examId, navigate]);

  // Shown briefly while auth state loads / while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-surface rounded-2xl border border-border p-8 max-w-sm w-full text-center space-y-5 shadow-sm">

        {/* Branding */}
        <div className="w-14 h-14 mx-auto bg-accent/10 rounded-2xl flex items-center justify-center">
          <span className="text-3xl">📝</span>
        </div>

        <div>
          <h1 className="text-base font-bold text-text-dark">Olympiad Masters</h1>
          <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
            You've been invited to take an exam
          </p>
        </div>

        {/* Spinner */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className="w-4 h-4 border-2 border-accent/25 border-t-accent rounded-full animate-spin" />
          <p className="text-xs text-text-faint">Redirecting…</p>
        </div>
      </div>
    </div>
  );
}