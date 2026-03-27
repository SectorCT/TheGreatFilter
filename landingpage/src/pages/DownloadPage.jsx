import SiteShell from '../components/SiteShell'
import { APP_NAME, LINUX_DOWNLOAD_URL, WINDOWS_DOWNLOAD_URL } from '../lib/constants'

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

function PlatformCard({ title, subtitle, href, enabled = false, footnote }) {
  return (
    <div className="rounded-[12px] border border-border bg-card p-6">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
      {enabled ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[6px] bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/85"
        >
          <DownloadIcon className="h-4 w-4" />
          Download
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[6px] border border-input bg-muted px-5 py-3 text-sm font-medium text-muted-foreground"
        >
          Coming soon
        </button>
      )}
      <div className="mt-3 text-[11px] text-muted-foreground">
        {enabled ? footnote : 'No public download link yet.'}
      </div>
    </div>
  )
}

export default function DownloadPage() {
  return (
    <SiteShell>
      <div className="rounded-[12px] border border-border bg-background p-6 sm:p-8">
        <p className="scientific-label">Download</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Get {APP_NAME}</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Use the desktop app to run the full workflow: create/select measurements, generate filters, then analyze,
          simulate, and export results.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <PlatformCard
            title="Windows"
            subtitle="Installer (.exe)"
            href={WINDOWS_DOWNLOAD_URL}
            enabled={true}
            footnote="Windows installer (NSIS). Upload qlean-setup.exe to this path."
          />
          <PlatformCard title="macOS" subtitle="App + DMG" />
          <PlatformCard
            title="Linux"
            subtitle="AppImage"
            href={LINUX_DOWNLOAD_URL}
            enabled={true}
            footnote="Linux direct download (AppImage)."
          />
        </div>

        <div className="mt-10 rounded-[12px] border border-border bg-card p-6">
          <div className="text-sm font-semibold tracking-tight">Stable download URLs</div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Windows: <span className="font-mono">{WINDOWS_DOWNLOAD_URL}</span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Linux: <span className="font-mono">{LINUX_DOWNLOAD_URL}</span>
          </p>
        </div>
      </div>
    </SiteShell>
  )
}

