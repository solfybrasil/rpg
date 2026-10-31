import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DiceCanvas3DProps {
  dice: number[]; // e.g. [4, 5]
  isRolling: boolean;
}

// Mapeamento de rotações finais para a face desejada apontar para a câmera (+Z)
// Em BoxGeometry:
// Mat 0 (+X): Face 1
// Mat 1 (-X): Face 6
// Mat 2 (+Y): Face 2
// Mat 3 (-Y): Face 5
// Mat 4 (+Z): Face 3
// Mat 5 (-Z): Face 4
const TARGET_FACE_ROTATIONS: Record<number, { x: number; y: number; z: number }> = {
  3: { x: 0, y: 0, z: 0 },
  4: { x: 0, y: Math.PI, z: 0 },
  1: { x: 0, y: -Math.PI / 2, z: 0 },
  6: { x: 0, y: Math.PI / 2, z: 0 },
  2: { x: Math.PI / 2, y: 0, z: 0 },
  5: { x: -Math.PI / 2, y: 0, z: 0 },
};

/**
 * Cria textura procedural em Canvas 2D para cada face do dado
 * Estilo Dark Fantasy: Fundo grafite/obsidiana escuro com borda dourada fina e pips dourados reluzentes
 */
function createDiceFaceTexture(value: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // 1. Fundo obsidiana escuro com degradê radial sutil
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 1.4);
    grad.addColorStop(0, '#1c1c22');
    grad.addColorStop(1, '#0e0e12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // 2. Borda dourada ornamentada fina
    ctx.strokeStyle = 'rgba(245, 182, 91, 0.45)';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, size - 16, size - 16);

    ctx.strokeStyle = 'rgba(245, 182, 91, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, size - 32, size - 32);

    // 3. Pips dourados
    ctx.fillStyle = '#f5b65b';
    ctx.shadowColor = '#ffd59a';
    ctx.shadowBlur = 12;

    const r = 18;
    const drawDot = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const c = size / 2;
    const q1 = size / 3.4;
    const q3 = size - q1;

    switch (value) {
      case 1:
        drawDot(c, c);
        break;
      case 2:
        drawDot(q1, q1);
        drawDot(q3, q3);
        break;
      case 3:
        drawDot(q1, q1);
        drawDot(c, c);
        drawDot(q3, q3);
        break;
      case 4:
        drawDot(q1, q1);
        drawDot(q3, q1);
        drawDot(q1, q3);
        drawDot(q3, q3);
        break;
      case 5:
        drawDot(q1, q1);
        drawDot(q3, q1);
        drawDot(c, c);
        drawDot(q1, q3);
        drawDot(q3, q3);
        break;
      case 6:
        drawDot(q1, q1);
        drawDot(q3, q1);
        drawDot(q1, c);
        drawDot(q3, c);
        drawDot(q1, q3);
        drawDot(q3, q3);
        break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const DiceCanvas3D: React.FC<DiceCanvas3DProps> = ({ dice, isRolling }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Three.js Scene, Camera & Renderer
    const scene = new THREE.Scene();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Iluminação Cinematográfica Dark Fantasy
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const goldKeyLight = new THREE.DirectionalLight(0xf5b65b, 2.8);
    goldKeyLight.position.set(4, 6, 6);
    scene.add(goldKeyLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    rimLight.position.set(-5, -3, 4);
    scene.add(rimLight);

    const goldGlowLight = new THREE.PointLight(0xf5b65b, 1.8, 12);
    goldGlowLight.position.set(0, -1, 3);
    scene.add(goldGlowLight);

    // 3. Materiais das 6 faces
    const faceTextures = [1, 6, 2, 5, 3, 4].map((val) => createDiceFaceTexture(val));
    const diceMaterials = faceTextures.map(
      (tex) =>
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.28,
          metalness: 0.2,
        }),
    );

    // 4. Criação dos dois cubos d6
    const geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);

    const dieMesh1 = new THREE.Mesh(geometry, diceMaterials);
    const dieMesh2 = new THREE.Mesh(geometry, diceMaterials);

    const basePositions = [
      { x: -1.35, y: 0, z: 0 },
      { x: 1.35, y: 0, z: 0 },
    ];

    dieMesh1.position.set(basePositions[0].x, basePositions[0].y, basePositions[0].z);
    dieMesh2.position.set(basePositions[1].x, basePositions[1].y, basePositions[1].z);

    scene.add(dieMesh1);
    scene.add(dieMesh2);

    // 5. Estado de animação física dos dados
    let animProgress = 1; // 1 = repouso
    const animDuration = 1.25; // 1.25s de rolagem
    let startTime = performance.now();

    const d1Value = dice[0] || 1;
    const d2Value = dice[1] || 1;

    const targetRot1 = TARGET_FACE_ROTATIONS[d1Value] || TARGET_FACE_ROTATIONS[1];
    const targetRot2 = TARGET_FACE_ROTATIONS[d2Value] || TARGET_FACE_ROTATIONS[1];

    if (isRolling) {
      animProgress = 0;
      startTime = performance.now();
    }

    // 6. Loop de Renderização
    let reqId = 0;
    const animate = (time: number) => {
      reqId = requestAnimationFrame(animate);

      const elapsed = (time - startTime) / 1000;
      if (animProgress < 1) {
        animProgress = Math.min(1, elapsed / animDuration);
        // Easing cúbico
        const t = 1 - Math.pow(1 - animProgress, 3);

        // Queda com quique
        const bounce = Math.sin(animProgress * Math.PI) * (1 - animProgress) * 2.2;

        dieMesh1.position.y = basePositions[0].y + bounce;
        dieMesh2.position.y = basePositions[1].y + bounce;

        // Rotação em espiral convergindo para a face alvo
        const spinTurns = (1 - animProgress) * 6;
        dieMesh1.rotation.x = targetRot1.x + spinTurns * 2.5;
        dieMesh1.rotation.y = targetRot1.y + spinTurns * 3.1;
        dieMesh1.rotation.z = targetRot1.z + spinTurns * 1.8;

        dieMesh2.rotation.x = targetRot2.x + spinTurns * 3.4;
        dieMesh2.rotation.y = targetRot2.y - spinTurns * 2.8;
        dieMesh2.rotation.z = targetRot2.z + spinTurns * 2.1;
      } else {
        // Repouso suave: leve flutuação mística
        const gentle = Math.sin(time * 0.0015);
        dieMesh1.position.y = basePositions[0].y + gentle * 0.05;
        dieMesh2.position.y = basePositions[1].y - gentle * 0.05;

        dieMesh1.rotation.x = targetRot1.x + gentle * 0.03;
        dieMesh1.rotation.y = targetRot1.y + gentle * 0.04;
        dieMesh1.rotation.z = targetRot1.z;

        dieMesh2.rotation.x = targetRot2.x - gentle * 0.03;
        dieMesh2.rotation.y = targetRot2.y - gentle * 0.04;
        dieMesh2.rotation.z = targetRot2.z;
      }

      renderer.render(scene, camera);
    };

    reqId = requestAnimationFrame(animate);

    // 7. Redimensionamento
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup completo
    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      faceTextures.forEach((t) => t.dispose());
      diceMaterials.forEach((m) => m.dispose());
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [dice, isRolling]);

  return (
    <div
      ref={containerRef}
      data-testid="dice-3d-canvas-container"
      className="w-full h-72 sm:h-80 md:h-96 flex items-center justify-center relative cursor-default select-none pointer-events-none"
    />
  );
};

export default DiceCanvas3D;
