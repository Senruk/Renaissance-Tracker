import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#ff4136',
  back: '#ff851b',
  shoulders: '#ffdc00',
  biceps: '#2ecc40',
  triceps: '#39cccc',
  forearms: '#0074d9',
  abs: '#b10dc9',
  quads: '#f012be',
  hamstrings: '#01ff70',
  glutes: '#ff4136',
  calves: '#85144b',
}

interface MusclePart {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  geometry: 'box' | 'sphere' | 'cylinder'
  args: [number, number, number]
  group: string
}

function BodyModel({ onMuscleClick, highlighted }: { onMuscleClick: (g: string) => void; highlighted: string[] }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2
    }
  })

  const parts: MusclePart[] = [
    // Torso
    { group: 'chest', geometry: 'box', args: [1.2, 0.8, 0.6], position: [0, 0.8, 0] },
    { group: 'abs', geometry: 'box', args: [0.7, 0.6, 0.5], position: [0, 0, 0] },
    { group: 'back', geometry: 'box', args: [1.2, 1.4, 0.4], position: [0, 0.8, -0.5] },
    // Shoulders
    { group: 'shoulders', geometry: 'sphere', args: [0.4, 8, 8], position: [-0.8, 1.2, 0] },
    { group: 'shoulders', geometry: 'sphere', args: [0.4, 8, 8], position: [0.8, 1.2, 0] },
    // Arms
    { group: 'biceps', geometry: 'box', args: [0.25, 0.5, 0.25], position: [-0.9, 0.5, 0] },
    { group: 'biceps', geometry: 'box', args: [0.25, 0.5, 0.25], position: [0.9, 0.5, 0] },
    { group: 'triceps', geometry: 'box', args: [0.25, 0.5, 0.25], position: [-0.9, 0.5, -0.2] },
    { group: 'triceps', geometry: 'box', args: [0.25, 0.5, 0.25], position: [0.9, 0.5, -0.2] },
    { group: 'forearms', geometry: 'box', args: [0.2, 0.45, 0.2], position: [-0.95, -0.1, 0] },
    { group: 'forearms', geometry: 'box', args: [0.2, 0.45, 0.2], position: [0.95, -0.1, 0] },
    // Legs
    { group: 'glutes', geometry: 'box', args: [0.5, 0.4, 0.4], position: [-0.3, -0.6, -0.2] },
    { group: 'glutes', geometry: 'box', args: [0.5, 0.4, 0.4], position: [0.3, -0.6, -0.2] },
    { group: 'quads', geometry: 'box', args: [0.35, 0.6, 0.35], position: [-0.3, -1.1, 0] },
    { group: 'quads', geometry: 'box', args: [0.35, 0.6, 0.35], position: [0.3, -1.1, 0] },
    { group: 'hamstrings', geometry: 'box', args: [0.35, 0.6, 0.35], position: [-0.3, -1.1, -0.2] },
    { group: 'hamstrings', geometry: 'box', args: [0.35, 0.6, 0.35], position: [0.3, -1.1, -0.2] },
    { group: 'calves', geometry: 'box', args: [0.25, 0.5, 0.25], position: [-0.3, -1.7, 0] },
    { group: 'calves', geometry: 'box', args: [0.25, 0.5, 0.25], position: [0.3, -1.7, 0] },
    // Head
    { group: 'head', geometry: 'sphere', args: [0.3, 8, 8], position: [0, 2, 0] },
  ]

  return (
    <group ref={groupRef}>
      {parts.map((part, i) => {
        const isHighlighted = highlighted.includes(part.group)
        const color = MUSCLE_COLORS[part.group] || '#666'
        return (
          <mesh
            key={i}
            position={part.position}
            onClick={() => { onMuscleClick(part.group) }}
            onPointerOver={() => { document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = 'default' }}
          >
            {part.geometry === 'box' && <boxGeometry args={part.args} />}
            {part.geometry === 'sphere' && <sphereGeometry args={part.args} />}
            {part.geometry === 'cylinder' && <cylinderGeometry args={part.args as [number, number, number]} />}
            <meshStandardMaterial
              color={isHighlighted ? color : '#444'}
              emissive={isHighlighted ? color : '#000'}
              emissiveIntensity={isHighlighted ? 0.6 : 0}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
        )
      })}
    </group>
  )
}

interface Props {
  highlightedMuscles?: string[]
  onMuscleClick?: (muscle: string) => void
}

export default function BodyDiagram({ highlightedMuscles = [], onMuscleClick = () => {} }: Props) {
  return (
    <div className="h-[350px] w-full">
      <Canvas camera={{ position: [0, 1, 4], fov: 40 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, 5, -5]} intensity={0.3} />
        <BodyModel onMuscleClick={onMuscleClick} highlighted={highlightedMuscles} />
        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.5} />
      </Canvas>
    </div>
  )
}
