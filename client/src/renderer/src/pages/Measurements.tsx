import { ArrowRight, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { measurements } from '@renderer/data/mockData'

export function Measurements(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Water Measurements</h1>
          <p className="text-sm text-muted-foreground">{measurements.length} measurements</p>
        </div>
        <Button onClick={() => navigate('/add-measurement')}>
          <Plus size={16} strokeWidth={1.5} />
          Add Measurement
        </Button>
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-table-header text-left">
              <th className="px-4 py-2.5 font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Label</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">pH</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Temp</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">DO</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                Conductivity
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Params</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {measurements.map((item) => (
              <tr
                key={item.id}
                onClick={() => navigate('/add-measurement')}
                className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover"
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                <td className="px-4 py-3 font-medium">{item.label}</td>
                <td className="px-4 py-3">{item.source}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{item.ph}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{item.temp}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{item.do}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{item.conductivity}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{item.params}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.date}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <ArrowRight size={14} strokeWidth={1.5} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
