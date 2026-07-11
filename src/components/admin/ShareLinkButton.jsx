// src/components/admin/ShareLinkButton.jsx
// Drop this wherever you want the share button in admin pages.
//
// Usage:
//   import ShareLinkButton from '../../components/admin/ShareLinkButton';
//   <ShareLinkButton examId={exam.id} />

import { useState } from 'react';
import { HiOutlineLink, HiOutlineCheck } from 'react-icons/hi2';

export default function ShareLinkButton({ examId, className = '' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/join/exam/${examId}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older mobile browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy share link for this exam`}
      className={[
        'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150',
        copied
          ? 'border-success/30 bg-success-bg text-success'
          : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text-dark hover:bg-background',
        className,
      ].join(' ')}
    >
      {copied ? (
        <>
          <HiOutlineCheck className="w-3.5 h-3.5 shrink-0" />
          Copied!
        </>
      ) : (
        <>
          <HiOutlineLink className="w-3.5 h-3.5 shrink-0" />
          Share Link
        </>
      )}
    </button>
  );
}