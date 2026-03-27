import SiteShell from '../components/SiteShell'
import { APP_NAME, TAGLINE } from '../lib/constants'

function InfoRow({ title, body }) {
  return (
    <div className="rounded-[12px] border border-border bg-card p-6">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <SiteShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-[12px] border border-border bg-background p-6 sm:p-8">
            <p className="scientific-label">About</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{APP_NAME}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{TAGLINE}</p>

            <div className="mt-8 grid gap-4">
              <InfoRow
                title="What it is"
                body="A desktop app for water-quality workflow: capture measurements, generate filters from those measurements, and inspect outcomes."
              />
              <InfoRow
                title="Real workflow in the app"
                body="1) Add a measurement (manual, USB, GemStat map, or CSV), 2) Create a new filter from that measurement, 3) Monitor generation status, 4) Open analysis/simulation and export CSV."
              />
              <InfoRow
                title="Core pages"
                body="Dashboard, Measurements, Measurement Details, Filters, New Filter, Filter Details, Filter Analysis, Filter Visualization, and Filter Simulation."
              />
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-[12px] border border-border bg-card p-6 sm:p-8">
            <p className="scientific-label">Data model snapshot</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">What each filter is tied to</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A filter references a study and a measurement ID, and targets selected contaminant parameter codes.
              After success, filter details can be analyzed, simulated, and exported.
            </p>
          </div>

          <div className="mt-4 rounded-[12px] border border-border bg-background p-6 sm:p-8">
            <p className="scientific-label">Credits</p>
            <div className="mt-2 text-sm text-muted-foreground">
              v1.0 · Hack TUES 2026
              <div className="mt-2">Icon sourced from the existing desktop app assets in this repo.</div>
            </div>
          </div>
        </aside>
      </div>
    </SiteShell>
  )
}

