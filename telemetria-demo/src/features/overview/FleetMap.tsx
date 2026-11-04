import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Vehicle } from '../../data/model'
import { clusterVehicles } from './clustering'
import { SvgFallbackMap } from './SvgFallbackMap'
import { VehicleSummaryCard } from './VehicleSummaryCard'

interface Props {
  vehicles: Vehicle[]
  highlightIds?: Set<string>
  center?: [number, number]
  zoom?: number
  forceFallback?: boolean
  onTilesFailed?: () => void
}

const STATUS_HEX: Record<string, string> = {
  online: '#15803d',
  degraded: '#b45309',
  offline: '#b91c1c',
  parked: '#6b7280',
}

function MarkersLayer({ vehicles, highlightIds }: { vehicles: Vehicle[]; highlightIds?: Set<string> }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })
  const clusters = useMemo(() => clusterVehicles(vehicles, zoom), [vehicles, zoom])

  return (
    <>
      {clusters.map((c) =>
        c.vehicles.length === 1 ? (
          <CircleMarker
            key={c.key}
            center={[c.lat, c.lng]}
            radius={highlightIds?.has(c.vehicles[0].id) ? 8 : 6}
            pathOptions={{
              color: highlightIds?.has(c.vehicles[0].id) ? '#6d28d9' : '#ffffff',
              weight: highlightIds?.has(c.vehicles[0].id) ? 3 : 1.5,
              fillColor: STATUS_HEX[c.worstStatus],
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <VehicleSummaryCard vehicle={c.vehicles[0]} />
            </Popup>
          </CircleMarker>
        ) : (
          <Marker
            key={c.key}
            position={[c.lat, c.lng]}
            icon={L.divIcon({
              className: 'cluster-icon',
              html: `<div class="cluster-pin" style="border-color:${STATUS_HEX[c.worstStatus]}">${c.vehicles.length}</div>`,
              iconSize: [34, 34],
            })}
            eventHandlers={{
              click: () => map.setView([c.lat, c.lng], Math.min(zoom + 2, 13)),
            }}
          >
          </Marker>
        ),
      )}
    </>
  )
}

function ViewController({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom())
  }, [center, zoom, map])
  return null
}

export function FleetMap({ vehicles, highlightIds, center, zoom = 4, forceFallback = false, onTilesFailed }: Props) {
  const [tilesFailed, setTilesFailed] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const errors = useRef(0)
  const loaded = useRef(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!loaded.current && errors.current > 0) setTilesFailed(true)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (tilesFailed) onTilesFailed?.()
  }, [tilesFailed, onTilesFailed])

  if (forceFallback || tilesFailed) {
    return <SvgFallbackMap vehicles={vehicles} highlightIds={highlightIds} />
  }

  return (
    <MapContainer center={center ?? [-9.5, -50]} zoom={zoom} className="h-full w-full" scrollWheelZoom preferCanvas>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{
          tileerror: () => {
            errors.current += 1
            if (errors.current >= 4 && !loaded.current) setTilesFailed(true)
          },
          tileload: () => {
            loaded.current = true
          },
        }}
      />
      <ViewController center={center} zoom={zoom} />
      <MarkersLayer vehicles={vehicles} highlightIds={highlightIds} />
    </MapContainer>
  )
}
