import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@renderer/components/ui/tooltip'
import { Toaster } from '@renderer/components/ui/toaster'
import { Toaster as Sonner } from '@renderer/components/ui/sonner'
import { AppLayout } from '@renderer/components/AppLayout'
import { Auth } from '@renderer/pages/Auth'
import { Dashboard } from '@renderer/pages/Dashboard'
import { Filters } from '@renderer/pages/Filters'
import { FilterDetails } from '@renderer/pages/FilterDetails'
import { FilterAnalysis } from '@renderer/pages/FilterAnalysis'
import { FilterVisualization } from '@renderer/pages/FilterVisualization'
import { FilterSimulation } from '@renderer/pages/FilterSimulation'
import { NewFilter } from '@renderer/pages/NewFilter'
import { Measurements } from '@renderer/pages/Measurements'
import { MeasurementDetails } from '@renderer/pages/MeasurementDetails'
import { AddMeasurement } from '@renderer/pages/AddMeasurement'
import { Studies } from '@renderer/pages/Studies'
import { NotFound } from '@renderer/pages/NotFound'
import { getGemstatLocations, hasGemstatLocationsCache } from '@renderer/utils/api/endpoints'

function App(): React.JSX.Element {
  useEffect(() => {
    if (hasGemstatLocationsCache()) return
    void getGemstatLocations().catch(() => {
      // Warm-up cache is best-effort.
    })
  }, [])

  useEffect(() => {
    const preloadMapModule = (): void => {
      void import('@renderer/components/OpenStreetMapPointsCard')
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
        preloadMapModule
      )
      return () => {
        ;(window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId)
      }
    }

    const timeoutId = window.setTimeout(preloadMapModule, 1200)
    return () => window.clearTimeout(timeoutId)
  }, [])

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
            <Route path="/filters/new" element={<NewFilter />} />
            <Route path="/filters/:id" element={<FilterDetails />} />
            <Route path="/filters/:id/analysis" element={<FilterAnalysis />} />
            <Route path="/filters/visualize" element={<FilterVisualization />} />
            <Route path="/filters/:id/visualize" element={<FilterVisualization />} />
            <Route path="/filters/:id/simulate" element={<FilterSimulation />} />
            <Route path="/measurements" element={<Measurements />} />
            <Route path="/measurements/:id" element={<MeasurementDetails />} />
            <Route path="/studies" element={<Studies />} />
            <Route path="/add-measurement" element={<AddMeasurement />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
