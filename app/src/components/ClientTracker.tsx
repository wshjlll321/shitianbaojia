'use client';

import { useEffect, useRef } from 'react';

interface ClientTrackerProps {
  quoteId: string;
}

export default function ClientTracker({ quoteId }: ClientTrackerProps) {
  const isInitialMount = useRef(true);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // 仅在组件首次挂载时触发一次 "view" 记录事件
    if (isInitialMount.current) {
      isInitialMount.current = false;

      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          event: 'view',
          metadata: JSON.stringify({ referrer: document.referrer || 'direct' })
        }),
      }).catch((e) => console.error('Failed to log view:', e));
    }

    // 当用户切出页面或者关闭页面时，发送停留时长 Ping
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const durationSeconds = Math.floor((Date.now() - startTime.current) / 1000);

        // 使用 keepalive 保证请求在页面卸载时仍能发出去
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            quoteId,
            event: 'duration_ping',
            duration: durationSeconds,
          }),
        }).catch(() => {});
      } else {
        // 切回来时，重新计时
        startTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quoteId]);

  return null; // 静默组件，不渲染任何 UI
}
