import type { ReactNode } from 'react'
import { FACTORS, FACTOR_SET } from '../lib'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-gray-600">
        {children}
      </div>
    </section>
  )
}

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">About</h1>
      </header>

      <div className="flex flex-col gap-6 p-4 pb-10">
        <Section title="What this app does">
          <p>
            Trip Consumption Analysis helps you understand the energy use and CO&#8322;
            footprint of your everyday mobility. Track a trip by transport mode, and see
            how much energy and how much CO&#8322; it used, computed from your own GPS
            trace.
          </p>
          <p>All of this stays on your device — nothing is sent to a server.</p>
        </Section>

        <Section title="How to use it">
          <p className="font-medium text-gray-700">Track</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Set your name once, at the top of the Track page.</li>
            <li>Press &ldquo;Start trip&rdquo; and pick a transport mode.</li>
            <li>Changed vehicle? Press &ldquo;Switch mode&rdquo; and pick the new one.</li>
            <li>Press &ldquo;End trip&rdquo; to stop tracking and save the trip.</li>
          </ol>
          <p className="font-medium text-gray-700">History</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Pick a day to see its legs drawn on the map, coloured by mode.</li>
            <li>Totals and a per-mode breakdown are shown below the map.</li>
            <li>Export your trips to a JSON file as a backup, or import one back.</li>
            <li>The 2022 course dataset can be imported from its CSV file as well.</li>
          </ol>
        </Section>

        <Section title="How the numbers are computed">
          <p>
            While tracking, raw GPS points are cleaned — points with poor accuracy, GPS
            jitter while standing still, and implausible speed jumps are all dropped. The
            remaining points are split into legs by transport mode, and each leg&apos;s
            distance is summed from its GPS track. That distance is multiplied by a
            per-passenger-km factor for the leg&apos;s mode to get its energy use and
            CO&#8322;.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">MJ / pkm</th>
                  <th className="px-3 py-2 font-medium">kg CO&#8322; / pkm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FACTORS.map((f) => (
                  <tr key={f.mode}>
                    <td className="px-3 py-2 text-gray-900">{f.label}</td>
                    <td className="px-3 py-2 text-gray-600">{f.mjPerPkm.normal}</td>
                    <td className="px-3 py-2 text-gray-600">{f.kgCo2PerPkm.normal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Source: {FACTOR_SET.source}, factor set {FACTOR_SET.version} &middot; scope:{' '}
            {FACTOR_SET.scope} &middot;{' '}
            <a
              href={FACTOR_SET.url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              factor sheet
            </a>
          </p>
          <p>
            These are average values for each mode and may not perfectly reflect your
            actual vehicle. Rush hour is defined as 07:00–10:00 and 16:30–19:30 (Zurich
            time), but the current mobitool factor set has no separate rush-hour values,
            so rush-hour and normal factors are equal for every mode above.
          </p>
        </Section>

        <Section title="Limitations">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Browsers pause GPS updates when the screen locks, especially on iOS Safari
              — keep the screen on while tracking a trip.
            </li>
            <li>
              The map needs an internet connection to load its basemap tiles. Tracking
              itself does not — trips are recorded and computed on the device.
            </li>
            <li>
              Data is stored only in this browser, on this device. Export it from the
              History page to keep a backup or move it to another device.
            </li>
          </ul>
        </Section>

        <Section title="About">
          <p>
            This app was originally built in 2022 for the course
            &ldquo;Geoinformationstechnologien und -analysen&rdquo; at ETH Zürich, by
            Dario De Luca, Luca Dominiak, Leonard Haas and Raúl Lara. It was rewritten in
            2026 as a browser-only app, with no server or database.
          </p>
          <p>
            <a
              href="https://github.com/teefaxx/trip-consumption-analysis"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              github.com/teefaxx/trip-consumption-analysis
            </a>
          </p>
        </Section>
      </div>
    </div>
  )
}
