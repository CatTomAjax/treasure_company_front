'use client';

// Navigation composition adapted from shadcn-ui/ui sidebar-07 and
// satnaing/shadcn-admin. MIT notices: docs/licenses/navigation-ui.txt.
import { AppButton, AppSelect } from '@/components/ui/app-controls';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import * as Icons from 'lucide-react';
import type { PlatformUser, Tenant } from '@/lib/platform-config';
import { workspaceNavigation, workspaceGroupFor, workspaceLabelFor } from '@/lib/workspace-navigation';
import { pptPages } from '@/lib/ppt-model';
import {
  Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from '@/components/ui/command';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import './workspace-shell.css';
import WorkspaceAccountMenu from './workspace-account';

type Props = {
  children: ReactNode;
  page: string;
  user: PlatformUser;
  tenants: Tenant[];
  companyId: string;
  onCompanyChange: (id: string) => void;
  onNavigate: (page: string) => void;
  onBackend: () => void;
  onLogout: () => void | Promise<void>;
  onSwitchAccount: () => void | Promise<void>;
  onCatalog: () => void;
  onNotification: () => void;
};

function NavIcon({ name }: { name: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] || Icons.Circle;
  return <Icon size={18} strokeWidth={1.7} />;
}

export default function WorkspaceShell(props: Props) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try { setOpen(localStorage.getItem('workspace-sidebar') !== 'collapsed'); } catch {}
  }, []);
  return (
    <SidebarProvider
      className="ws-workspace"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        try { localStorage.setItem('workspace-sidebar', next ? 'expanded' : 'collapsed'); } catch {}
      }}
      style={{ '--sidebar-width': '256px', '--sidebar-width-icon': '72px' } as CSSProperties}
    >
      <WorkspaceFrame {...props} />
    </SidebarProvider>
  );
}

function WorkspaceFrame({ children, page, user, tenants, companyId, onCompanyChange, onNavigate, onBackend, onLogout, onSwitchAccount, onCatalog, onNotification }: Props) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const activeGroup = workspaceGroupFor(page);
  const [searchOpen, setSearchOpen] = useState(false);
  const [groups, setGroups] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('workspace-menu-groups-v2') || '{}');
      setGroups({ ...saved, [workspaceGroupFor(page)?.id || 'overview']: true });
    } catch { setGroups({ [workspaceGroupFor(page)?.id || 'overview']: true }); }
  }, []);
  useEffect(() => {
    if (activeGroup) setGroups((old) => ({ ...old, [activeGroup.id]: true }));
  }, [activeGroup?.id]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const menu = menuRef.current;
      const item = menu?.querySelector('[aria-current="page"]');
      if (!menu || !item) return;
      const bounds = menu.getBoundingClientRect();
      const target = item.getBoundingClientRect();
      if (target.bottom > bounds.bottom) menu.scrollTop += target.bottom - bounds.bottom + 12;
      else if (target.top < bounds.top) menu.scrollTop -= bounds.top - target.top + 12;
    });
    return () => cancelAnimationFrame(frame);
  }, [page, collapsed, groups[activeGroup?.id || '']]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  function navigate(id: string) {
    onNavigate(id);
    setSearchOpen(false);
    setOpenMobile(false);
  }
  function toggleGroup(id: string) {
    setGroups((old) => {
      const next = { ...old, [id]: !old[id] };
      try { sessionStorage.setItem('workspace-menu-groups-v2', JSON.stringify(next)); } catch {}
      return next;
    });
  }
  const company = tenants.find((tenant) => tenant.id === companyId);
  const role = user.isAdmin ? '平台管理员' : ({ admin: '企业管理员', manager: '企业经理', member: '业务成员', viewer: '只读成员' }[company?.role || 'viewer'] || '企业成员');
  const groupSections = [
    { title: '工作空间', ids: ['overview', 'customers', 'ai-tasks'] },
    { title: '业务管理', ids: ['knowledge', 'creation', 'ecosystem', 'finance', 'park'] },
    { title: '偏好设置', ids: ['system'] },
  ];
  const links = (group: typeof workspaceNavigation[number]) => group.children.map((item) => (
    <SidebarMenuSubItem key={item.page}>
      <SidebarMenuSubButton
        className="ws-sub-link"
        isActive={item.page === page}
        href={`#ppt/${item.page}`}
        aria-current={item.page === page ? 'page' : undefined}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate(item.page);
        }}
      >
        <span>{item.label}</span>
        {item.page === page && <span className="ws-active-dot" aria-hidden="true" />}
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  ));
  return (
    <>
      <Sidebar className="ws-sidebar" collapsible="icon">
        <SidebarHeader className="ws-sidebar-header">
          <AppButton className="ws-brand" onClick={() => navigate('overview')} title="创客中心 · 首页">
            <span className="ws-brand-mark"><Icons.Boxes size={25} strokeWidth={1.8} /></span>
            <span className="ws-brand-copy"><strong>创客中心</strong><small>智慧生态平台</small></span>
          </AppButton>
          {isMobile && <AppButton className="ws-mobile-close" aria-label="关闭侧边导航" onClick={() => setOpenMobile(false)}><Icons.X size={18} /></AppButton>}
          {!collapsed && (
            <label className="ws-company">
              <span className="ws-company-icon"><Icons.Building2 size={17} /></span>
              <span><small>当前工作空间</small><AppSelect aria-label="切换企业" value={companyId} onChange={(event) => onCompanyChange(event.target.value)}>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</AppSelect></span>
              <Icons.ChevronsUpDown size={14} />
            </label>
          )}
        </SidebarHeader>
        <SidebarContent ref={menuRef} className="ws-navigation" aria-label="企业工作台菜单">
          {groupSections.map((section) => (
            <SidebarGroup key={section.title} className="ws-nav-section">
              <SidebarGroupLabel className="ws-section-label">{section.title}</SidebarGroupLabel>
              <SidebarMenu className="ws-menu">
                {workspaceNavigation.filter((group) => section.ids.includes(group.id)).map((group) => (
                  <SidebarMenuItem key={group.id}>
                    {collapsed ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<SidebarMenuButton className="ws-nav-button" isActive={activeGroup?.id === group.id} aria-label={group.title} title={group.title} />}>
                          <NavIcon name={group.icon} /><span>{group.title}</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" sideOffset={12} className="ws-popover ws-collapsed-menu">
                          <p className="ws-popover-label">{group.title}</p>
                          {group.children.map((item) => <DropdownMenuItem key={item.page} onClick={() => navigate(item.page)}><NavIcon name={pptPages.find((p) => p.id === item.page)?.icon || group.icon} />{item.label}{page === item.page && <Icons.Check size={14} />}</DropdownMenuItem>)}
                          {group.id === 'system' && <DropdownMenuItem onClick={onBackend}><Icons.Database size={16} />高级数据管理</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Collapsible open={!!groups[group.id]} onOpenChange={() => toggleGroup(group.id)}>
                        <CollapsibleTrigger render={<SidebarMenuButton className="ws-nav-button" isActive={activeGroup?.id === group.id} />}>
                          <NavIcon name={group.icon} /><span>{group.title === '企业知识库管理' ? '企业知识库' : group.title}</span>
                          {group.id === 'ai-tasks' && <span className="ws-ai-badge">AI</span>}
                          <Icons.ChevronRight size={14} className={`ws-chevron ${groups[group.id] ? 'is-open' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ws-sub-menu">
                            {links(group)}
                            {group.id === 'system' && <SidebarMenuSubItem><SidebarMenuSubButton className="ws-sub-link" render={<AppButton onClick={onBackend} />}><span>高级数据管理</span></SidebarMenuSubButton></SidebarMenuSubItem>}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="ws-sidebar-footer">
          <SidebarMenuButton className="ws-all-pages" onClick={onCatalog} title="全部应用"><Icons.LayoutGrid size={18} /><span>全部应用</span><span className="ws-page-count">{pptPages.length}</span></SidebarMenuButton>
          <WorkspaceAccountMenu user={user} companyName={company?.name || '企业工作空间'} role={role} onLogout={onLogout} onSwitchAccount={onSwitchAccount} onSettings={() => navigate('models')} />
        </SidebarFooter>
      </Sidebar>
      <div className="ws-shell">
        <header className="ws-topbar">
          <SidebarTrigger className="ws-sidebar-toggle" aria-label="切换侧边导航" title="切换侧边导航 (Ctrl+B)" />
          <span className="ws-topbar-divider" />
          <nav aria-label="面包屑" className="ws-breadcrumb"><span>{activeGroup?.title}</span><Icons.ChevronRight size={14} /><strong>{workspaceLabelFor(page)}</strong></nav>
          <div className="ws-top-actions">
            <AppButton className="ws-search-trigger" onClick={() => setSearchOpen(true)} aria-label="搜索页面或业务功能"><Icons.Search size={16} /><span>搜索功能、应用…</span><kbd>Ctrl K</kbd></AppButton>
            <span className="ws-connection"><i />工作空间</span>
            <AppButton className="ws-notification" aria-label="查看工作记录" onClick={onNotification}><Icons.Bell size={19} /></AppButton>
            <WorkspaceAccountMenu compact user={user} companyName={company?.name || '企业工作空间'} role={role} onLogout={onLogout} onSwitchAccount={onSwitchAccount} onSettings={() => navigate('models')} />
          </div>
        </header>
        <div className="ws-content">{children}</div>
      </div>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="搜索工作空间" description="搜索并打开业务功能，使用上下方向键选择，回车进入。" className="ws-command-dialog">
        <Command className="ws-command-root">
        <CommandInput placeholder="搜索功能、应用或业务分组…" aria-label="搜索页面" />
        <CommandList>
          <CommandEmpty>没有找到相关功能，试试“项目”或“AI”。</CommandEmpty>
          {workspaceNavigation.map((group) => <CommandGroup key={group.id} heading={group.title}>{group.children.map((item) => <CommandItem key={item.page} value={`${item.label} ${group.title} ${pptPages.find((p) => p.id === item.page)?.title}`} onSelect={() => navigate(item.page)}><NavIcon name={pptPages.find((p) => p.id === item.page)?.icon || group.icon} /><span>{item.label}</span>{page === item.page && <Icons.Check size={15} className="ml-auto" />}</CommandItem>)}</CommandGroup>)}
        </CommandList>
        <div className="ws-command-footer"><span><kbd>↑</kbd><kbd>↓</kbd>选择</span><span><kbd>↵</kbd>打开</span><span><kbd>Esc</kbd>关闭</span></div>
        </Command>
      </CommandDialog>
    </>
  );
}
