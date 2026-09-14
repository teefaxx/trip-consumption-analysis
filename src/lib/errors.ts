export class TripTooShortError extends Error {
  constructor(message = 'Trip has fewer than 2 usable trackpoints after cleaning') {
    super(message)
    this.name = 'TripTooShortError'
  }
}
