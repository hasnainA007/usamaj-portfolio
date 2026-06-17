import * as THREE from 'three';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Integrates GSAP ScrollTrigger to fly the camera through the model
 * and accelerate the mesh's rotation on scroll.
 */
export function initScrollAnimations(camera, mesh) {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: document.body,
      start: "top top",
      end: "+=200%",
      scrub: 1
    }
  });

  // Fly camera through the center of the Torus Knot
  tl.to(camera.position, {
    z: -2,
    ease: "power1.inOut",
    onUpdate: () => {
      camera.updateProjectionMatrix();
    }
  }, "start");

  // Accelerate Torus Knot Y-axis rotation simultaneously
  tl.to(mesh.rotation, {
    y: Math.PI * 4, // Several extra continuous spins
    ease: "power1.inOut"
  }, "start");
}

/**
 * Initialize a fixed background Three.js scene with a scrolling-reactive TorusKnot mesh.
 * The canvas stays fixed behind all HTML content as the user scrolls.
 */
export function initThreeScene() {
  // ========== CSS Injection ==========
  const style = document.createElement('style');
  style.textContent = `
    canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      pointer-events: none;
      display: block;
    }
  `;
  document.head.appendChild(style);

  // ========== Scene Setup ==========
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true 
  });

  // Configure renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // Set camera position
  camera.position.z = 5;

  // ========== Mesh: TorusKnot ==========
  const geometry = new THREE.TorusKnotGeometry(2, 0.8, 100, 16);
  const material = new THREE.MeshStandardMaterial({
    wireframe: true,
    color: 0x00ffcc,
    emissive: 0x00aa88,
    roughness: 0.8,
    metalness: 0.2
  });
  const torusKnot = new THREE.Mesh(geometry, material);
  scene.add(torusKnot);

  // ========== Lighting ==========
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // ========== Window Resize Handler ==========
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
  };

  window.addEventListener('resize', handleResize);

  // ========== Animation Loop ==========
  const animate = () => {
    requestAnimationFrame(animate);

    // Subtle continuous rotation (baseline)
    torusKnot.rotation.x += 0.002;
    torusKnot.rotation.y += 0.002;

    renderer.render(scene, camera);
  };

  // Bind GSAP Scroll Animations automatically
  initScrollAnimations(camera, torusKnot);

  animate();
}
