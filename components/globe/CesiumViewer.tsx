'use client'

import 'cesium/Build/Cesium/Widgets/widgets.css'

import { useEffect, useRef } from 'react'
import type { FlightRoute } from '@/lib/flight-types'

type Destination = {
  name: string
  lat: number
  lng: number
}

type Airport = {
  name: string
  lat: number
  lng: number
}

type GlobeMarker = {
  id: string
  name: string
  lat: number
  lng: number
  colorHex: string
  pointSize?: number
}

interface Props {
  ionToken?: string
  destination?: Destination
  startAirport?: Airport
  focusDestination?: boolean
  showFlightPath?: boolean
  autoRotateSlow?: boolean
  flightRoutes?: FlightRoute[]
  flightMarkers?: GlobeMarker[]
}

const AUTO_ROTATE_RESUME_DELAY_MS = 5000
const AUTO_ROTATE_DEGREES_PER_TICK = 0.010
const AUTO_ROTATE_BLEND_SPEED = 0.045

const COUNTRY_GEOJSON_URL = '/geo/world-continents.geojson'

const LAND_COLOR_HEX = '#F192D7'
const OCEAN_COLOR_HEX = '#006EAE'
const SKY_BG_HEX = '#05050a'
function createArcPositions(
  Cesium: any,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const start = Cesium.Cartographic.fromDegrees(from.lng, from.lat, 0)
  const end = Cesium.Cartographic.fromDegrees(to.lng, to.lat, 0)
  const geodesic = new Cesium.EllipsoidGeodesic(start, end)
  const steps = 128
  const surfaceDistance = Math.max(1, geodesic.surfaceDistance)
  const peakHeight = Math.min(560_000, Math.max(80_000, surfaceDistance * 0.045))
  const positions = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = geodesic.interpolateUsingFraction(t)
    const arcHeight = 18_000 + Math.sin(Math.PI * t) * peakHeight
    positions.push(Cesium.Cartesian3.fromRadians(p.longitude, p.latitude, arcHeight))
  }

  return positions
}

function flyCamera(
  viewer: any,
  Cesium: any,
  focusDestination: boolean,
  destination?: Destination
) {
  if (focusDestination && destination) {
    const target = Cesium.Cartesian3.fromDegrees(destination.lng, destination.lat, 0)
    const sphere = new Cesium.BoundingSphere(target, 1)
    viewer.camera.flyToBoundingSphere(sphere, {
      // 40% less zoom-in than before to keep more context around the pin.
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-52), 1_750_000),
      duration: 1.2,
    })
    return
  }

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(15, 22, 22_000_000),
    duration: 1.05,
  })
}

function addPin(
  viewer: any,
  Cesium: any,
  lat: number,
  lng: number,
  label: string,
  colorHex: string,
  pointSize = 10,
  showLabel = false
) {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: {
      pixelSize: pointSize,
      color: Cesium.Color.fromCssColorString(colorHex),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: showLabel
      ? {
          text: label,
          font: '600 12px DM Sans, sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString('#050510'),
          outlineWidth: 3,
          pixelOffset: new Cesium.Cartesian2(0, -24),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.72),
          backgroundPadding: new Cesium.Cartesian2(7, 4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        }
      : undefined,
  })
}

async function loadCountryPolygons(viewer: any, Cesium: any) {
  const ds = await Cesium.GeoJsonDataSource.load(COUNTRY_GEOJSON_URL, {
    clampToGround: false,
  })

  const landColor = Cesium.Color.fromCssColorString(LAND_COLOR_HEX).withAlpha(0.86)

  for (const entity of ds.entities.values) {
    if (!entity.polygon) continue
    entity.polygon.material = landColor
    // Some country features can trigger Cesium outline subdivision errors.
    // Keep filled land polygons and disable outline generation for stability.
    entity.polygon.outline = false
    entity.polygon.height = 2_000
    entity.polygon.perPositionHeight = false
    entity.polygon.closeTop = true
    entity.polygon.closeBottom = true
  }

  viewer.dataSources.add(ds)
  return ds
}

export default function CesiumViewer({
  ionToken,
  destination,
  startAirport,
  focusDestination = false,
  showFlightPath = false,
  autoRotateSlow = false,
  flightRoutes = [],
  flightMarkers = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const cesiumRef = useRef<any>(null)

  const countriesRef = useRef<any>(null)
  const destinationEntityRef = useRef<any>(null)
  const startAirportEntityRef = useRef<any>(null)
  const flightRibbonEntityRef = useRef<any>(null)
  const flightGlowEntityRef = useRef<any>(null)
  const flightRouteEntitiesRef = useRef<any[]>([])
  const flightMarkerEntitiesRef = useRef<any[]>([])

  const removeRotateTickRef = useRef<(() => void) | null>(null)
  const removeInteractionListenersRef = useRef<(() => void) | null>(null)
  const autoRotateEnabledRef = useRef(false)
  const autoRotateBlendRef = useRef(0)
  const lastUserInteractionMsRef = useRef(0)

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    const init = async () => {
      ;(window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesium'

      const Cesium = await import('cesium')
      cesiumRef.current = Cesium

      if (ionToken) {
        Cesium.Ion.defaultAccessToken = ionToken
      }

      const viewer = new Cesium.Viewer(containerRef.current!, {
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        baseLayer: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        msaaSamples: 2,
        requestRenderMode: false,
      })

      viewer.imageryLayers.removeAll()

      const { scene } = viewer
      const sceneAny = scene as any
      scene.globe.baseColor = Cesium.Color.fromCssColorString(OCEAN_COLOR_HEX)
      scene.backgroundColor = Cesium.Color.fromCssColorString(SKY_BG_HEX)
      if (sceneAny.skyBox) sceneAny.skyBox.show = false
      if (sceneAny.sun) sceneAny.sun.show = false
      if (sceneAny.moon) sceneAny.moon.show = false
      if (sceneAny.skyAtmosphere) sceneAny.skyAtmosphere.show = true
      scene.globe.showGroundAtmosphere = true
      scene.globe.enableLighting = false

      try {
        countriesRef.current = await loadCountryPolygons(viewer, Cesium)
      } catch (error) {
        console.warn('Country polygon layer failed to load.', error)
      }

      autoRotateEnabledRef.current = autoRotateSlow && !focusDestination && !showFlightPath
      autoRotateBlendRef.current = autoRotateEnabledRef.current ? 1 : 0
      lastUserInteractionMsRef.current = Date.now() - AUTO_ROTATE_RESUME_DELAY_MS

      const canvas = viewer.scene.canvas as HTMLCanvasElement
      let pointerDown = false
      const markUserInteraction = () => {
        lastUserInteractionMsRef.current = Date.now()
      }
      const onPointerDown = () => {
        pointerDown = true
        markUserInteraction()
      }
      const onPointerMove = () => {
        if (pointerDown) markUserInteraction()
      }
      const onPointerUp = () => {
        pointerDown = false
        markUserInteraction()
      }
      const onWheel = () => {
        markUserInteraction()
      }

      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointerleave', onPointerUp)
      canvas.addEventListener('wheel', onWheel, { passive: true })
      removeInteractionListenersRef.current = () => {
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointerleave', onPointerUp)
        canvas.removeEventListener('wheel', onWheel)
      }

      removeRotateTickRef.current = viewer.clock.onTick.addEventListener(() => {
        if (!autoRotateEnabledRef.current) return

        const now = Date.now()
        const canRotate = now - lastUserInteractionMsRef.current >= AUTO_ROTATE_RESUME_DELAY_MS
        const targetBlend = canRotate ? 1 : 0
        autoRotateBlendRef.current +=
          (targetBlend - autoRotateBlendRef.current) * AUTO_ROTATE_BLEND_SPEED

        if (autoRotateBlendRef.current > 0.001) {
          viewer.camera.rotate(
            Cesium.Cartesian3.UNIT_Z,
            Cesium.Math.toRadians(AUTO_ROTATE_DEGREES_PER_TICK * autoRotateBlendRef.current)
          )
        }
      })

      viewerRef.current = viewer
      flyCamera(viewer, Cesium, focusDestination, destination)
    }

    init().catch(console.error)

    return () => {
      const viewer = viewerRef.current
      if (removeRotateTickRef.current) {
        removeRotateTickRef.current()
        removeRotateTickRef.current = null
      }
      if (removeInteractionListenersRef.current) {
        removeInteractionListenersRef.current()
        removeInteractionListenersRef.current = null
      }
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy()
      }
      viewerRef.current = null
      countriesRef.current = null
      destinationEntityRef.current = null
      startAirportEntityRef.current = null
      flightRibbonEntityRef.current = null
      flightGlowEntityRef.current = null
      flightRouteEntitiesRef.current = []
      flightMarkerEntitiesRef.current = []
      autoRotateEnabledRef.current = false
      autoRotateBlendRef.current = 0
      lastUserInteractionMsRef.current = 0
      cesiumRef.current = null
    }
  }, [ionToken])

  useEffect(() => {
    autoRotateEnabledRef.current = autoRotateSlow && !focusDestination && !showFlightPath
    if (!autoRotateEnabledRef.current) {
      autoRotateBlendRef.current = 0
    }
  }, [autoRotateSlow, focusDestination, showFlightPath])

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium) return

    if (destination) {
      if (!destinationEntityRef.current) {
        destinationEntityRef.current = addPin(
          viewer,
          Cesium,
          destination.lat,
          destination.lng,
          destination.name.toUpperCase(),
          '#F472B6',
          12
        )
      } else {
        destinationEntityRef.current.position = Cesium.Cartesian3.fromDegrees(
          destination.lng,
          destination.lat
        )
        if (destinationEntityRef.current.label) {
          destinationEntityRef.current.label.text = destination.name
        }
      }
    }

    flyCamera(viewer, Cesium, focusDestination, destination)
  }, [destination, focusDestination])

  // Keep existing flight line behavior intact.
  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium) return

    if (startAirport) {
      if (!startAirportEntityRef.current) {
        startAirportEntityRef.current = addPin(
          viewer,
          Cesium,
          startAirport.lat,
          startAirport.lng,
          startAirport.name.toUpperCase(),
          '#60A5FA',
          10
        )
        startAirportEntityRef.current.show = showFlightPath && flightMarkers.length === 0
      } else {
        startAirportEntityRef.current.position = Cesium.Cartesian3.fromDegrees(
          startAirport.lng,
          startAirport.lat
        )
        if (startAirportEntityRef.current.label) {
          startAirportEntityRef.current.label.text = startAirport.name
        }
        startAirportEntityRef.current.show = showFlightPath && flightMarkers.length === 0
      }
    }

    if (destinationEntityRef.current) {
      destinationEntityRef.current.show =
        showFlightPath ? flightMarkers.length === 0 : focusDestination
    }

    const clearFlightPath = () => {
      if (flightRibbonEntityRef.current) {
        viewer.entities.remove(flightRibbonEntityRef.current)
        flightRibbonEntityRef.current = null
      }
      if (flightGlowEntityRef.current) {
        viewer.entities.remove(flightGlowEntityRef.current)
        flightGlowEntityRef.current = null
      }
      if (flightRouteEntitiesRef.current.length) {
        for (const entity of flightRouteEntitiesRef.current) {
          viewer.entities.remove(entity)
        }
        flightRouteEntitiesRef.current = []
      }
    }

    if (!showFlightPath) {
      clearFlightPath()
      return
    }

    if (flightRoutes.length > 0) {
      clearFlightPath()
      const pink = Cesium.Color.fromCssColorString('#EC4899')
      const hotPink = Cesium.Color.fromCssColorString('#F472B6')

      for (const route of flightRoutes) {
        for (const leg of route.legs) {
          const arcPositions = createArcPositions(Cesium, leg.from, leg.to)
          const isPrimary = Boolean(route.highlighted)
          const ribbon = viewer.entities.add({
            polyline: {
              positions: arcPositions,
              width: isPrimary ? 8 : 3,
              material: (isPrimary ? hotPink : pink).withAlpha(isPrimary ? 0.62 : 0.2),
            },
          })
          const glow = viewer.entities.add({
            polyline: {
              positions: arcPositions,
              width: isPrimary ? 16 : 7,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: isPrimary ? 0.3 : 0.12,
                taperPower: 0.6,
                color: (isPrimary ? hotPink : pink).withAlpha(isPrimary ? 0.88 : 0.28),
              }),
            },
          })
          flightRouteEntitiesRef.current.push(ribbon, glow)
        }
      }
      return
    }

    if (!startAirport || !destination) {
      clearFlightPath()
      return
    }

    const arcPositions = createArcPositions(Cesium, startAirport, destination)
    const pink = Cesium.Color.fromCssColorString('#EC4899')
    const hotPink = Cesium.Color.fromCssColorString('#F472B6')

    if (!flightRibbonEntityRef.current) {
      flightRibbonEntityRef.current = viewer.entities.add({
        polyline: {
          positions: arcPositions,
          width: 12,
          material: pink.withAlpha(0.55),
        },
      })
    } else {
      flightRibbonEntityRef.current.polyline.positions = arcPositions
      flightRibbonEntityRef.current.show = true
    }

    if (!flightGlowEntityRef.current) {
      flightGlowEntityRef.current = viewer.entities.add({
        polyline: {
          positions: arcPositions,
          width: 20,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.24,
            taperPower: 0.62,
            color: hotPink.withAlpha(0.9),
          }),
        },
      })
    } else {
      flightGlowEntityRef.current.polyline.positions = arcPositions
      flightGlowEntityRef.current.show = true
    }
  }, [destination, startAirport, focusDestination, showFlightPath, flightRoutes, flightMarkers.length])

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium) return

    for (const entity of flightMarkerEntitiesRef.current) {
      viewer.entities.remove(entity)
    }
    flightMarkerEntitiesRef.current = []

    if (!showFlightPath || !flightMarkers.length) {
      return
    }

    flightMarkerEntitiesRef.current = flightMarkers.map((marker) =>
      addPin(
        viewer,
        Cesium,
        marker.lat,
        marker.lng,
        marker.name,
        marker.colorHex,
        marker.pointSize ?? 10,
        true
      )
    )
  }, [flightMarkers, showFlightPath])

  return <div ref={containerRef} className="h-full w-full" />
}
