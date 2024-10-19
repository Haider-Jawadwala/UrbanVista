import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeJS360View = ({ imageUrl, onClose }) => {
  const mountRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    let camera, scene, renderer;
    let isUserInteracting = false;
    let onPointerDownMouseX = 0, onPointerDownMouseY = 0;
    let lon = 0, onPointerDownLon = 0;
    let lat = 0, onPointerDownLat = 0;
    let phi = 0, theta = 0;

    const init = () => {
      if (!mountRef.current) return;

      const container = mountRef.current;
      camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 1, 1100);
      scene = new THREE.Scene();
      sceneRef.current = scene;

      const geometry = new THREE.SphereGeometry(500, 60, 40);
      geometry.scale(-1, 1, 1);

      const texture = new THREE.TextureLoader().load(imageUrl, () => {
        setIsLoading(false);
      });
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      renderer = new THREE.WebGLRenderer();
      rendererRef.current = renderer;
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      container.style.touchAction = 'none';
      container.addEventListener('pointerdown', onPointerDown);
    };

    const onPointerDown = (event) => {
      if (event.isPrimary === false) return;

      isUserInteracting = true;
      onPointerDownMouseX = event.clientX;
      onPointerDownMouseY = event.clientY;
      onPointerDownLon = lon;
      onPointerDownLat = lat;

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (event) => {
      if (event.isPrimary === false) return;

      if (isUserInteracting) {
        lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon;
        lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
      }
    };

    const onPointerUp = () => {
      isUserInteracting = false;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    const onWheel = (event) => {
      const fov = camera.fov + event.deltaY * 0.05;
      camera.fov = THREE.MathUtils.clamp(fov, 10, 75);
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      requestAnimationFrame(animate);
      update();
    };

    const update = () => {
      if (!camera || !renderer || !scene) return;

      lat = Math.max(-85, Math.min(85, lat));
      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);

      camera.position.x = 100 * Math.sin(phi) * Math.cos(theta);
      camera.position.y = 100 * Math.cos(phi);
      camera.position.z = 100 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };

    init();
    animate();

    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;

      const container = mountRef.current;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    mountRef.current?.addEventListener('wheel', onWheel);

    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      
      if (rendererRef.current && rendererRef.current.domElement && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (sceneRef.current) {
        sceneRef.current.clear();
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [imageUrl]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full h-full max-w-4xl max-h-4xl bg-gray-900 rounded-lg overflow-hidden">
        <div ref={mountRef} className="w-full h-full" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="loading-circle"></div>
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors duration-200 z-10"
        >
          Close
        </button>
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded z-10">
          <p className="text-sm">Tip: Click and drag to look around. Use mouse wheel or pinch to zoom.</p>
        </div>
      </div>
    </div>
  );
};

export default ThreeJS360View;