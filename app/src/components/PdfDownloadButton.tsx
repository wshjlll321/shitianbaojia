'use client';

import React from 'react';

type Props = {
  shareToken: string;
  locale: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export default function PdfDownloadButton({ shareToken, locale, className, style, children }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url = `/api/quote/${encodeURIComponent(shareToken)}/pdf?locale=${encodeURIComponent(locale)}&t=${Date.now()}`;
    window.location.href = url;
  };

  return (
    <a
      href={`/api/quote/${encodeURIComponent(shareToken)}/pdf?locale=${encodeURIComponent(locale)}`}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
