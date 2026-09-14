export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">About</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Trip Consumption Analysis estimates the energy and CO&#8322; footprint of
        your trips from on-device GPS traces, entirely in the browser.
      </p>
    </div>
  )
}
