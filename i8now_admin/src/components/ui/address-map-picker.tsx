"use client"

import { useEffect, useMemo, useState } from "react"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MapPinIcon, SearchIcon } from "lucide-react"

type Suggestion = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    state_district?: string
  }
}

type AddressMapPickerProps = {
  label: string
  placeholder: string
  value: string
  onValueChange: (value: string) => void
  lat?: number | null
  lng?: number | null
  onLocationPick: (next: { address: string; lat: number; lng: number; suggestion?: Suggestion }) => void
}

const markerIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#111827;border:2px solid #ffffff;box-shadow:0 0 0 2px #11182733;"></div>',
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const INDIA_CENTER: [number, number] = [22.9734, 78.6569]

export function AddressMapPicker({
  label,
  placeholder,
  value,
  onValueChange,
  lat,
  lng,
  onLocationPick,
}: AddressMapPickerProps) {
  const [query, setQuery] = useState(value)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search")
        url.searchParams.set("q", q)
        url.searchParams.set("format", "json")
        url.searchParams.set("addressdetails", "1")
        url.searchParams.set("limit", "6")
        const res = await fetch(url.toString(), { signal: controller.signal })
        const json = (await res.json()) as Suggestion[]
        setSuggestions(json)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const current = useMemo<[number, number]>(() => {
    if (typeof lat === "number" && typeof lng === "number") return [lat, lng]
    return INDIA_CENTER
  }, [lat, lng])

  function pickSuggestion(s: Suggestion) {
    const nextLat = Number(s.lat)
    const nextLng = Number(s.lon)
    onValueChange(s.display_name)
    onLocationPick({ address: s.display_name, lat: nextLat, lng: nextLng, suggestion: s })
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-3">
          <div className="relative">
            <Input
              value={query}
              placeholder={placeholder}
              className="h-11 px-3"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                const next = e.target.value
                setQuery(next)
                onValueChange(next)
                setOpen(true)
              }}
            />
            {open && (loading || suggestions.length > 0) ? (
              <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                {loading ? <p className="px-2 py-1.5 text-xs text-muted-foreground">Searching location...</p> : null}
                {!loading &&
                  suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      type="button"
                      className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                      onClick={() => pickSuggestion(s)}
                    >
                      <SearchIcon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">{s.display_name}</span>
                    </button>
                  ))}
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="h-3.5 w-3.5" />
              Search suggestions
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen((v) => !v)}>
              {open ? "Hide results" : "Show results"}
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <MapContainer center={current} zoom={13} className="h-[340px] w-full" scrollWheelZoom>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker
              position={current}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng()
                  onLocationPick({ address: value, lat: p.lat, lng: p.lng })
                },
              }}
            />
            <MapClickHandler onPick={(nextLat, nextLng) => onLocationPick({ address: value, lat: nextLat, lng: nextLng })} />
            <MapRecenter center={current} />
          </MapContainer>
        </div>
      </div>
      <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Marker updates location automatically.
      </div>
    </div>
  )
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [center, map])
  return null
}
