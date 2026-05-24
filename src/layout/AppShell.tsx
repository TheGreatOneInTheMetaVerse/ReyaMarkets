import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '../components/ui/Sidebar'
import { Header } from '../components/ui/Header'
import { MobileNav } from '../components/ui/MobileNav'

interface Props {
  claimableCount?: number
}

export function AppShell({ claimableCount = 0 }: Props) {
  const { i18n } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const isRTL = i18n.language === 'fa'
  const sidebarW = collapsed ? 56 : 220

  return (
    <div className="min-h-screen bg-reya-bg">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} claimableCount={claimableCount} />

      <div
        className="min-h-screen flex flex-col transition-[margin] duration-200 pb-16 md:pb-0"
        style={{
          marginLeft: isRTL ? 0 : sidebarW,
          marginRight: isRTL ? sidebarW : 0,
        }}
      >
        <Header sidebarWidth={sidebarW} />
        <main className="flex-1 pt-14">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav claimableCount={claimableCount} />
    </div>
  )
}
