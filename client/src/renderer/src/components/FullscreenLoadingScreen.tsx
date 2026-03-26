export default function FullscreenLoadingScreen({
  title,
}: {
  title?: string
}): React.JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        color: 'white',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.25)',
            borderTopColor: 'rgba(255,255,255,0.95)',
            animation: 'tgif-spin 1s linear infinite',
          }}
        />
        <div style={{ fontWeight: 700 }}>{title ?? 'Loading…'}</div>
      </div>

      <style>{`
        @keyframes tgif-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

