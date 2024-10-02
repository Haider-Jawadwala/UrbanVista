import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function Earth() {
  const earthRef = useRef();
  const cloudsRef = useRef();

  const textures = useTexture({
    map: '/textures/8k_earth_daymap.jpg',
    normalMap: '/textures/8k_earth_normal_map.jpg',
    specularMap: '/textures/8k_earth_specular_map.jpg',
    cloudsMap: '/textures/8k_earth_clouds.jpg',
  });

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    earthRef.current.rotation.y = elapsedTime / 6;
    cloudsRef.current.rotation.y = elapsedTime / 6;
  });

  return (
    <>
      <ambientLight intensity={15} />
      <pointLight color="#f6f3ea" position={[2, 0, 5]} intensity={5} />
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhongMaterial
          map={textures.cloudsMap}
          opacity={0.3}
          depthWrite={true}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhongMaterial specularMap={textures.specularMap} />
        <meshStandardMaterial
          map={textures.map}
          normalMap={textures.normalMap}
          metalness={0.4}
          roughness={0.7}
        />
      </mesh>
    </>
  );
}

export default function EarthCanvas() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }} style={{ background: 'black' }}>
        <Earth />
      </Canvas>
    </div>
  );
}
