import {Nav} from './nav'; import {Topbar} from './topbar';
export function Shell({children}:{children:React.ReactNode}){return <div className="flex min-h-screen"><Nav/><div className="flex-1 min-w-0"><Topbar/><main className="p-5 md:p-7 max-w-[1500px] mx-auto">{children}</main></div></div>}
