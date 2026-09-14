import type { Trip } from '../lib/types'

export interface TripExport {
  format: 'trip-consumption-analysis/v1'
  exportedAt: string
  profileName: string
  trips: Trip[]
}

export interface TripStore {
  saveTrip(trip: Trip): Promise<void>
  getTrip(id: string): Promise<Trip | undefined>
  /** @param dateISO 'YYYY-MM-DD', a local Zurich calendar date */
  listTripsOnDate(dateISO: string): Promise<Trip[]>
  listAllTrips(): Promise<Trip[]>
  deleteTrip(id: string): Promise<void>
  exportAll(): Promise<TripExport>
  importAll(data: TripExport): Promise<{ imported: number; skipped: number }>
}
