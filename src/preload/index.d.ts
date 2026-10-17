import type { LumiApi } from '../shared/types'

declare global {
  interface Window {
    lumi: LumiApi
  }
}
