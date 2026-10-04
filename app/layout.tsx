import './globals.css';
import { Nav } from '@/components/nav';
import { Topbar } from '@/components/topbar';
export const metadata = { title: 'NEXUS//03 — Event Command OS', description: 'Dependency-aware event operations command center' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><div className="app-shell"><Nav/><main className="min-w-0 flex-1"><Topbar/><div className="p-4 md:p-7 max-w-[1500px] mx-auto">{children}</div></main></div></body></html>}
