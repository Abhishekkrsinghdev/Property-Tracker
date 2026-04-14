import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ActivePropertyState {
  propertyId: string | null
  setPropertyId: (id: string) => void
  clear: () => void
}

/**
 * Persists the active property ID across sessions.
 * Most users have one property — this auto-selects it.
 * Multi-property support just means letting the user switch here.
 */
export const useActiveProperty = create<ActivePropertyState>()(
  persist(
    (set) => ({
      propertyId: null,
      setPropertyId: (id) => set({ propertyId: id }),
      clear: () => set({ propertyId: null }),
    }),
    { name: 'proptrack-active-property' }
  )
)