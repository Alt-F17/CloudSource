'use client'

import Link from 'next/link'

import { TripSidebar } from '@/components/app/TripSidebar'

type Props = {
  title: string
  subtitle: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function PanelShell({ title, subtitle, actions, children }: Props) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#05050a] text-white">
      <TripSidebar />
      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(59,130,246,.18),transparent_40%),radial-gradient(circle_at_82%_82%,rgba(236,72,153,.2),transparent_42%),#060812]" />
        <div className="relative z-10 h-full overflow-y-auto p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 text-xs font-mono uppercase tracking-[0.18em] text-white/45">
                CloudSource Panel
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="mt-1 text-sm text-white/65">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <Link
                href="/app"
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/85 transition hover:bg-white/10"
              >
                Back To Globe
              </Link>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
