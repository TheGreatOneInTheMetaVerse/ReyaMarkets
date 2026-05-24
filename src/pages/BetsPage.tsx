import { useTranslation } from 'react-i18next'
import { MyBetsTab } from '../components/markets/MyBetsTab'
import { Panel } from '../components/ui/Panel'

export function BetsPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-1">{t('bets.subtitle')}</p>
        <p className="text-sm text-reya-text-secondary">{t('bets.description')}</p>
      </div>
      <MyBetsTab />
    </div>
  )
}
