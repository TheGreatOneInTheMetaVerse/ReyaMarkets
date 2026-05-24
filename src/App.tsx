import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './lib/wagmi'
import { ContractProvider, useContractContext } from './context/ContractContext'
import { ToastProvider } from './components/ui/Toast'
import { AppShell } from './layout/AppShell'
import { LandingPage } from './pages/LandingPage'
import { MarketsPage } from './pages/MarketsPage'
import { BetsPage } from './pages/BetsPage'
import { PerpsPage } from './pages/PerpsPage'
import { PricesPage } from './pages/PricesPage'
import './i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: false },
  },
})

function AppRoutes() {
  const { userBets } = useContractContext()
  const claimableCount = userBets.filter(b => b.canClaim).length

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppShell claimableCount={claimableCount} />}>
        <Route index element={<MarketsPage />} />
        <Route path="bets" element={<BetsPage />} />
        <Route path="perps" element={<PerpsPage />} />
        <Route path="prices" element={<PricesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ContractProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </ContractProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
