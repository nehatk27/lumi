import { lazy, Suspense } from 'react'
import type { JSX } from 'react'

const PetWindow = lazy(() => import('./pages/PetWindow'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

export default function App(): JSX.Element {
  const isSettings = window.location.hash === '#/settings'
  return <Suspense fallback={null}>{isSettings ? <SettingsPage /> : <PetWindow />}</Suspense>
}
