import * as THREE from 'three';

/**
 * Integrates a simple scroll-reactive rotation on the TorusKnot.
 */
function initScrollReaction(mesh) {
  let scrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const delta = window.scrollY - scrollY;
    scrollY = window.scrollY;
    mesh.rotation.y += delta * 0.002;
    mesh.rotation.x += delta * 0.001;
  });
}

/**
 * Initialize a fixed background Three.js scene with a scrolling-reactive TorusKnot mesh.
 *
 * @returns {{ pause: () => void, resume: () => void }}
 *   A bridge object that showreel.js uses to pause/resume the RAF loop.
 */
export function initThreeScene() {
  // ========== CSS Injection ==========
  const style = document.createElement('style');
  style.textContent = `
    canvas#bg {
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
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas:    document.getElementById('bg'),
    antialias: true,
    alpha:     true,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  camera.position.z = 5;

  // ========== Mesh: TorusKnot ==========
  const geometry = new THREE.TorusKnotGeometry(2, 0.8, 100, 16);
  const material = new THREE.MeshStandardMaterial({
    wireframe: true,
    color:     0x00ffcc,
    emissive:  0x00aa88,
    roughness: 0.8,
    metalness: 0.2,
  });
  const torusKnot = new THREE.Mesh(geometry, material);
  scene.add(torusKnot);

  // ========== Lighting ==========
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  // ========== Resize Handler ==========
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  // ========== Scroll Reaction ==========
  initScrollReaction(torusKnot);

  // ========== Pauseable Animation Loop ==========
  let _rafId   = null;
  let _running = false;

  function animate() {
    if (!_running) return;

    _rafId = requestAnimationFrame(animate);

    torusKnot.rotation.x += 0.002;
    torusKnot.rotation.y += 0.002;

    renderer.render(scene, camera);
  }

  function pause() {
    _running = false;
    if (_rafId !== null) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  }

  function resume() {
    if (_running) return; // already running — don't double-start
    _running = true;
    animate();
  }

  // Start the loop
  resume();

  // Return RAF bridge for showreel.js
  return { pause, resume };
}
