import type { Metadata } from 'next';
import './globals.css';
import '@/components/workspace-light.css';
import '@/components/workspace-theme.css';
import '@/components/app-controls.css';
import LocalBuildStatus from '@/components/local-build-status';
import WorkspaceThemeProvider from '@/components/workspace-theme';
export const metadata: Metadata = { title: '前海创客中心 · 智慧生态平台', icons: { icon: '/favicon.svg' }, description: '空间运营、智慧水电、物业服务与产业协作的一站式工作台。' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="zh-CN" suppressHydrationWarning><body><WorkspaceThemeProvider>{children}<LocalBuildStatus/></WorkspaceThemeProvider></body></html>;
}

