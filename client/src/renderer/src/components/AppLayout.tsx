import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@renderer/components/AppSidebar'
import { AppTitleBar } from '@renderer/components/AppTitleBar'

export function AppLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppTitleBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AppSidebar />
        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
