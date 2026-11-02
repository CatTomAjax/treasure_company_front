'use client';

import { AppButton } from '@/components/ui/app-controls';
import { useState } from 'react';
import {
  Check,
  ChevronDown,
  LogOut,
  Monitor,
  MoonStar,
  Palette,
  Settings2,
  Sun,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { PlatformUser } from '@/lib/platform-config';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useWorkspaceTheme } from './workspace-theme';

type Props = {
  user: PlatformUser;
  companyName: string;
  role: string;
  compact?: boolean;
  onLogout: () => void | Promise<void>;
  onSwitchAccount: () => void | Promise<void>;
  onSettings: () => void;
};

export default function WorkspaceAccountMenu({
  user,
  companyName,
  role,
  compact = false,
  onLogout,
  onSwitchAccount,
  onSettings,
}: Props) {
  const { theme, setTheme } = useWorkspaceTheme();
  const [skinsOpen, setSkinsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function leave(switchAccount: boolean) {
    setBusy(true);
    setError('');
    try {
      await (switchAccount ? onSwitchAccount() : onLogout());
    } catch (e) {
      setError((e as Error).message || '暂时无法退出，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={compact ? 'ws-account-trigger' : 'ws-user'}
          aria-label={compact ? '用户菜单' : '账户菜单'}
          disabled={busy}
        >
          <span className="ws-avatar">{user.name.slice(0, 1)}</span>
          <span className={compact ? 'ws-account-name' : 'ws-user-copy'}>
            <strong>{user.name}</strong>
            {!compact && <small>{role}</small>}
          </span>
          <ChevronDown size={14} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={compact ? 'bottom' : 'top'}
          align={compact ? 'end' : 'start'}
          sideOffset={12}
          className="ws-popover ws-account-popover"
        >
          <div className="ws-account-summary">
            <UserRound size={20} />
            <div>
              <strong>{user.name}</strong>
              <span>
                {role} · {companyName}
              </span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSkinsOpen(true)}>
            <Palette size={17} />
            选择皮肤
            <span className="ws-account-hint">
              {theme === 'tech' ? '科技蓝' : '清爽浅色'}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSettings}>
            <Settings2 size={17} />
            模型与偏好设置
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={busy} onClick={() => void leave(true)}>
            <UsersRound size={17} />
            切换账户
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={busy}
            onClick={() => void leave(false)}
            variant="destructive"
          >
            <LogOut size={17} />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <div className="ws-account-error" role="alert">
          {error}
          <AppButton onClick={() => setError('')} aria-label="关闭账户操作提示">
            关闭
          </AppButton>
        </div>
      )}
      <Dialog open={skinsOpen} onOpenChange={setSkinsOpen}>
        <DialogContent className="ws-skin-dialog">
          <DialogHeader>
            <DialogTitle>选择工作台皮肤</DialogTitle>
            <DialogDescription>
              选择会自动保存，下次打开继续使用。两套皮肤均采用清晰的大字号。
            </DialogDescription>
          </DialogHeader>
          <div
            className="ws-skin-options"
            role="radiogroup"
            aria-label="工作台皮肤"
          >
            {(
              [
                {
                  id: 'light',
                  name: '清爽浅色',
                  description: '白色与浅灰，深色文字，适合日常办公。',
                  icon: Sun,
                },
                {
                  id: 'tech',
                  name: '科技蓝',
                  description: '深蓝与青色线框，保持清晰的文字对比。',
                  icon: MoonStar,
                },
              ] as const
            ).map((skin) => (
              <AppButton
                type="button"
                role="radio"
                aria-checked={theme === skin.id}
                tabIndex={theme === skin.id ? 0 : -1}
                className={`ws-skin-option ${theme === skin.id ? 'selected' : ''}`}
                key={skin.id}
                onClick={() => setTheme(skin.id)}
                onKeyDown={(event) => {
                  if (
                    ![
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                    ].includes(event.key)
                  )
                    return;
                  event.preventDefault();
                  const next = skin.id === 'light' ? 'tech' : 'light';
                  setTheme(next);
                  event.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>('[role=radio]')
                    [next === 'light' ? 0 : 1]?.focus();
                }}
              >
                <div
                  className={`ws-skin-preview preview-${skin.id}`}
                  aria-hidden="true"
                >
                  <div className="ws-preview-sidebar">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="ws-preview-content">
                    <div className="ws-preview-line" />
                    <div className="ws-preview-metrics">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="ws-preview-panel" />
                  </div>
                </div>
                <div className="ws-skin-label">
                  <skin.icon size={18} />
                  <strong>{skin.name}</strong>
                  {theme === skin.id && <Check size={18} />}
                </div>
                <p>{skin.description}</p>
              </AppButton>
            ))}
          </div>
          <div className="ws-skin-footer">
            <span>
              <Monitor size={15} />
              可随时从右上角用户菜单切换
            </span>
            <AppButton type="button" onClick={() => setSkinsOpen(false)}>
              完成
            </AppButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
