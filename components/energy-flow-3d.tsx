"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame, extend } from "@react-three/fiber"
import { OrbitControls, Sphere, Box, Text, Trail } from "@react-three/drei"
import * as THREE from "three"
import { motion } from "framer-motion"

// Extend Three.js with custom materials if needed
extend({ OrbitControls })

// Energy source data
const energySources = {
  solar: { position: [-3, 2, 0], color: "#fbbf24", label: "Solar", current: 4.2 },
  battery: { position: [0, -2, 0], color: "#3b82f6", label: "Battery", current: 2.1 },
  grid: { position: [3, 2, 0], color: "#ef4444", label: "Grid", current: 1.5 },
  home: { position: [0, 0, 0], color: "#10b981", label: "Home", current: 7.8 }
}

// Animated particle component
function EnergyParticle({ start, end, color, delay = 0 }: {
  start: [number, number, number]
  end: [number, number, number]
  color: string
  delay?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const progress = useRef(0)

  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    progress.current += delta * 0.5
    if (progress.current > 1 + delay) progress.current = delay
    
    const t = Math.max(0, Math.min(1, (progress.current - delay) / 1))
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 + 1,
        (start[2] + end[2]) / 2
      ),
      new THREE.Vector3(...end)
    ])
    
    const point = curve.getPoint(t)
    meshRef.current.position.copy(point)
    
    // Fade effect
    const material = meshRef.current.material as THREE.MeshBasicMaterial
    material.opacity = t > 0 ? Math.sin(t * Math.PI) * 0.8 : 0
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0} />
    </mesh>
  )
}

// Energy flow visualization
function EnergyFlow() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
  })

  // Generate particles for energy flow
  const particles = useMemo(() => {
    const flows = [
      { from: energySources.solar.position, to: energySources.home.position, color: energySources.solar.color, count: 8 },
      { from: energySources.battery.position, to: energySources.home.position, color: energySources.battery.color, count: 5 },
      { from: energySources.grid.position, to: energySources.home.position, color: energySources.grid.color, count: 3 }
    ]

    return flows.flatMap(flow => 
      Array.from({ length: flow.count }, (_, i) => ({
        ...flow,
        delay: i * 0.3
      }))
    )
  }, [])

  return (
    <group ref={groupRef}>
      {/* Energy sources */}
      {Object.entries(energySources).map(([key, source]) => (
        <group key={key} position={source.position}>
          {/* Main sphere */}
          <Sphere args={[0.3]} position={[0, 0, 0]}>
            <meshPhongMaterial 
              color={source.color} 
              emissive={source.color}
              emissiveIntensity={0.2}
              shininess={100}
            />
          </Sphere>
          
          {/* Glow effect */}
          <Sphere args={[0.4]} position={[0, 0, 0]}>
            <meshBasicMaterial 
              color={source.color} 
              transparent 
              opacity={0.1}
            />
          </Sphere>
          
          {/* Label */}
          <Text
            position={[0, -0.7, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {source.label}
          </Text>
          
          {/* Energy value */}
          <Text
            position={[0, -0.9, 0]}
            fontSize={0.15}
            color={source.color}
            anchorX="center"
            anchorY="middle"
          >
            {source.current} kWh
          </Text>
        </group>
      ))}

      {/* Energy particles */}
      {particles.map((particle, i) => (
        <EnergyParticle
          key={i}
          start={particle.from as [number, number, number]}
          end={particle.to as [number, number, number]}
          color={particle.color}
          delay={particle.delay}
        />
      ))}

      {/* Connection lines */}
      {Object.entries(energySources).map(([key, source]) => {
        if (key === 'home') return null
        
        const homePos = energySources.home.position
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...source.position),
          new THREE.Vector3(...homePos)
        ])
        
        return (
          <line key={`line-${key}`} geometry={geometry}>
            <lineBasicMaterial color="#374151" opacity={0.3} transparent />
          </line>
        )
      })}

      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
    </group>
  )
}

// Main 3D Energy Flow Component
export function EnergyFlow3D() {
  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <EnergyFlow />
        <OrbitControls 
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  )
} 