import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { Toaster } from '@renderer/components/ui/toaster'
import { Toaster as Sonner } from '@renderer/components/ui/sonner'
import { AppLayout } from '@renderer/components/AppLayout'
import { Auth } from '@renderer/pages/Auth'
import { Dashboard } from '@renderer/pages/Dashboard'
import { Filters } from '@renderer/pages/Filters'
import { FilterDetails } from '@renderer/pages/FilterDetails'
import { Measurements } from '@renderer/pages/Measurements'
import { AddMeasurement } from '@renderer/pages/AddMeasurement'
import { NotFound } from '@renderer/pages/NotFound'

function App(): React.JSX.Element {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/filters" element={<Filters />} />
            <Route path="/filters/:id" element={<FilterDetails />} />
            <Route path="/measurements" element={<Measurements />} />
            <Route path="/add-measurement" element={<AddMeasurement />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
