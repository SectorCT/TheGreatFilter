import { Link } from 'react-router-dom'

import SiteShell from './components/SiteShell'
import { APP_NAME, DOWNLOAD_URL, TAGLINE } from './lib/constants'

function DownloadIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3v10" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function CheckIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export default function LandingPage() {
  return (
    <SiteShell>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <section>
            <p className="scientific-label">{TAGLINE}</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Start with real water measurements, then generate filters
            </h2>
            <p className="mt-5 max-w-prose text-lg leading-relaxed text-muted-foreground">
              {APP_NAME} is built around your real sample data: capture measurements first, choose contaminants to
              remove, generate a filter, then inspect analysis, simulation, and exportable results.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-[6px] bg-primary px-10 py-5 text-lg font-medium text-primary-foreground transition-all duration-150 hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <DownloadIcon className="h-5 w-5" />
                Download for Desktop
              </a>

              <Link
                to="/download"
                className="inline-flex items-center justify-center gap-2 rounded-[6px] border border-input bg-background px-10 py-5 text-lg font-medium text-foreground transition-all duration-150 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Choose your platform
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-[999px] border border-border bg-card px-3 py-1">Windows</span>
              <span className="rounded-[999px] border border-border bg-card px-3 py-1">macOS</span>
              <span className="rounded-[999px] border border-border bg-card px-3 py-1">Linux</span>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">v1.0 · Hack TUES 2026</p>
          </section>

          <section className="lg:pl-10">
            <div className="rounded-[12px] border border-border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold tracking-tight">Everything you need</h3>
              <ul className="mt-5 space-y-3">
                {[
                  'Add measurements by manual entry, USB sensor, GemStat map, or CSV import',
                  'Review each measurement with pH, temperature, source, and parameter table',
                  'Create a new filter from a selected measurement and target contaminant codes',
                  'Track generation status and open analysis, visualization, simulation, and CSV export',
                ].map((label) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-secondary text-secondary-foreground">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm text-foreground/95">{label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[10px] border border-border bg-background p-4">
                  <div className="text-sm font-medium">Measurement Intake</div>
                  <p className="mt-1 text-xs text-muted-foreground">Start from real sample data using four input methods.</p>
                </div>
                <div className="rounded-[10px] border border-border bg-background p-4">
                  <div className="text-sm font-medium">Filter Generation</div>
                  <p className="mt-1 text-xs text-muted-foreground">Pick a measurement, choose targets, and trigger generation.</p>
                </div>
                <div className="rounded-[10px] border border-border bg-background p-4">
                  <div className="text-sm font-medium">Analysis & Simulation</div>
                  <p className="mt-1 text-xs text-muted-foreground">Inspect molecular analysis and run filtration simulation.</p>
                </div>
                <div className="rounded-[10px] border border-border bg-background p-4">
                  <div className="text-sm font-medium">Export Workflow</div>
                  <p className="mt-1 text-xs text-muted-foreground">When generation succeeds, export results as CSV.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[12px] border border-border bg-background p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src="/TheGreatFilterIcon.png" alt={`${APP_NAME} small icon`} className="h-10 w-10 rounded-[10px]" />
                  <div>
                    <div className="text-sm font-semibold tracking-tight">Ready to try it?</div>
                    <div className="text-xs text-muted-foreground">Download and start designing your next filter.</div>
                  </div>
                </div>
                <a
                  href={DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-[6px] bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/85"
                >
                  Download
                </a>
              </div>
            </div>
          </section>
      </div>
      <section className="mt-14">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[12px] border border-border bg-card p-6">
            <p className="scientific-label">Workflow</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">Measurement-first by design</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The app is centered around real water measurements, not placeholder presets.
            </p>
          </div>
          <div className="rounded-[12px] border border-border bg-card p-6">
            <p className="scientific-label">Consistency</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">One connected data flow</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Measurements feed filter generation, and generated filters feed analysis tools.
            </p>
          </div>
          <div className="rounded-[12px] border border-border bg-card p-6">
            <p className="scientific-label">Iteration</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">Generate, inspect, refine</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Re-run filter generation with different contaminant targets when needed.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <div className="rounded-[12px] border border-border bg-background p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="scientific-label">How it works</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">A simple 4-step flow</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                Real app flow: first pick or capture a water measurement, then build and evaluate a filter from it.
              </p>
            </div>
            <Link
              to="/about"
              className="inline-flex items-center justify-center rounded-[6px] border border-input bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Learn more
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Add or choose measurement',
                body: 'Capture water data manually, by USB, via GemStat map, or by CSV import.',
              },
              {
                step: '02',
                title: 'Create new filter',
                body: 'Select a study, choose measurement, and select contaminant codes to target.',
              },
              {
                step: '03',
                title: 'Track generation',
                body: 'Watch status (Pending/Generating/Success) and open filter details when ready.',
              },
              {
                step: '04',
                title: 'Analyze and export',
                body: 'Use analysis/simulation views and export CSV once the filter succeeds.',
              },
            ].map((item) => (
              <div key={item.step} className="rounded-[12px] border border-border bg-card p-5">
                <div className="text-xs font-medium text-muted-foreground">{item.step}</div>
                <div className="mt-2 text-sm font-semibold">{item.title}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-14">
        <div className="rounded-[12px] border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="scientific-label">FAQ</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Questions, answered</h3>
            </div>
            <Link
              to="/download"
              className="inline-flex items-center justify-center rounded-[6px] bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/85"
            >
              Download
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {[
              {
                q: 'What comes first: measurement or filter?',
                a: 'Measurement first. The New Filter page requires selecting an existing water measurement, then choosing target contaminant codes.',
              },
              {
                q: 'How can I add a water measurement?',
                a: 'You can add one by Manual Input, Lab Equipment (USB), GemStat Map, or CSV import.',
              },
              {
                q: 'What can I do after generation succeeds?',
                a: 'Open Filter Details, then use Analyze, Visualize, Simulate, or Export CSV actions for that filter.',
              },
              {
                q: 'What do analysis and simulation use?',
                a: 'They use filter details returned by the backend, including filter structure and result payload fields.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-[12px] border border-border bg-background p-5">
                <div className="text-sm font-semibold">{q}</div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  )
}

