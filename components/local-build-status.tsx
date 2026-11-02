'use client';
import { AppButton } from '@/components/ui/app-controls';
import { useEffect, useState } from 'react';
import { BUILD_INFO } from '@/lib/build-info';
export default function LocalBuildStatus() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let stopped = false,
      dirty = false;
    const changed = () => {
        dirty = true;
      },
      saved = () => {
        dirty = false;
      };
    async function check() {
      if (document.visibilityState === 'hidden' || stopped) return;
      try {
        const response = await fetch('/api/platform/version', {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const build = (await response.json()) as { version: string };
        if (stopped || !build.version || build.version === BUILD_INFO.version)
          return;
        const editing =
          document.activeElement?.matches(
            'input,textarea,select,[contenteditable=true]',
          ) ||
          document.querySelector(
            '[role=dialog],[aria-modal=true],[aria-busy=true]',
          );
        if (dirty || editing) setAvailable(true);
        else location.reload();
      } catch {
        /* A local restart may briefly interrupt the request. */
      }
    }
    const id = setInterval(() => void check(), 10000);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', check);
    document.addEventListener('input', changed);
    window.addEventListener('platform:saved', saved);
    void check();
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
      document.removeEventListener('visibilitychange', check);
      document.removeEventListener('input', changed);
      window.removeEventListener('platform:saved', saved);
    };
  }, []);
  if (!available) return null;
  return (
    <div className="local-update-banner" role="status">
      本地新版已就绪。请先保存正在编辑的内容。
      <AppButton onClick={() => location.reload()}>载入新版</AppButton>
    </div>
  );
}
