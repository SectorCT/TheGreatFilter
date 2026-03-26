import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@renderer/components/AppSidebar'

export function AppLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
