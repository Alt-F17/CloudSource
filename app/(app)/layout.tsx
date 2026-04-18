import { AppStateProvider } from '@/components/app/AppStateProvider'
import { BudgetModals } from '@/components/app/BudgetModals'
import { TripCreatorModal } from '@/components/app/TripCreatorModal'
import NimbusWidget from '@/components/mascot/NimbusWidget'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      {children}
      <BudgetModals />
      <NimbusWidget />
      <TripCreatorModal />
    </AppStateProvider>
  )
}
