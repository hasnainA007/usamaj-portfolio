import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
//  VERTEX SHADER
//  - Layered sine/cosine wave animation driven by uTime
//  - Mouse repulsion: particles near the cursor bulge upward
//  - Depth-of-field hint: point size shrinks for out-of-focus particles
// ═══════════════════════════════════════════════════════════════════
const vertexShader = /* glsl */`
  uniform float uTime;
  uniform vec2  uMouse;   // smooth-lerped NDC mouse [-1,1]
  uniform float uDpr;

  attribute float aSize;
  attribute float aPhase;  // random phase offset per particle
  attribute float aSpeed;  // random speed multiplier per particle

  varying float vHeight;
  varying float vMouseDist;
  varying float vFocus;    // 0 = in focus, 1 = fully blurred

  void main() {
    vec3 pos = position;

    // ── Wave 1: primary horizontal swell ──────────────────────
    float w1 = sin(pos.x * 0.28 + uTime * 0.72 + aPhase) * 1.5;
    // ── Wave 2: secondary cross-axis swell ────────────────────
    float w2 = cos(pos.z * 0.20 + uTime * 0.48 + aPhase * 0.7) * 1.0;
    // ── Wave 3: small high-freq ripple for organic texture ────
    float w3 = sin((pos.x + pos.z) * 0.14 + uTime * aSpeed) * 0.55;

    pos.y += w1 + w2 + w3;

    // ── Mouse repulsion ───────────────────────────────────────
    //   Map NDC mouse coords to approximate world-XZ footprint
    vec2 mouseWorld = uMouse * 16.0;
    float dist = length(vec2(pos.x, pos.z) - mouseWorld);
    float repulsion = smoothstep(5.5, 0.0, dist) * 4.0;
    pos.y += repulsion;
    vMouseDist = dist;

    // ── Depth-of-field ────────────────────────────────────────
    //   Focal plane is at y ≈ 0.  Particles far from it get
    //   smaller + dimmer (simulated DOF without a render target).
    float focus = clamp(abs(pos.y) / 4.5, 0.0, 1.0);
    vFocus  = focus;
    vHeight = pos.y;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Perspective-correct point size with DOF modulation
    float dofScale = mix(1.0, 0.35, focus * 0.65);
    gl_PointSize = aSize * uDpr * dofScale * (260.0 / -mvPosition.z);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

// ═══════════════════════════════════════════════════════════════════
//  FRAGMENT SHADER
//  - Soft circular disc with a bright core + wide glow halo
//  - Three-stop colour ramp: accent-pink → violet → site cyan
//  - Mouse-proximity brightening for an interactive highlight
//  - Additive blending in THREE gives natural HDR bloom feel
// ═══════════════════════════════════════════════════════════════════
const fragmentShader = /* glsl */`
  uniform float uOpacity;

  varying float vHeight;
  varying float vMouseDist;
  varying float vFocus;

  void main() {
    // Circular discard
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if (d > 0.5) discard;

    // Two-layer glow: tight core + soft halo
    float core  = 1.0 - smoothstep(0.00, 0.16, d);
    float halo  = 1.0 - smoothstep(0.16, 0.50, d);
    float glow  = core * 1.0 + halo * 0.38;

    // ── Colour ramp (height-driven) ───────────────────────────
    //   low  → #ff0055  (site accent red-pink)
    //   mid  → #8c00ff  (violet bridge)
    //   high → #00ffcc  (site cyan from original scene)
    float t = clamp((vHeight + 3.2) / 6.4, 0.0, 1.0);
    vec3 cLow  = vec3(1.00, 0.00, 0.333);
    vec3 cMid  = vec3(0.55, 0.00, 1.000);
    vec3 cHigh = vec3(0.00, 1.00, 0.800);
    vec3 color = t < 0.5
      ? mix(cLow,  cMid,  t * 2.0)
      : mix(cMid, cHigh, (t - 0.5) * 2.0);

    // Particles near the mouse glow white-hot
    float proximity = 1.0 - clamp(vMouseDist / 5.5, 0.0, 1.0);
    color = mix(color, vec3(1.0, 0.85, 1.0), proximity * 0.55);
    color = min(color, vec3(1.6)); // allow slight over-white for glow

    // DOF dims out-of-focus particles
    float dofAlpha = mix(1.0, 0.22, vFocus * 0.8);

    gl_FragColor = vec4(color, glow * uOpacity * dofAlpha);
  }
`;

// ═══════════════════════════════════════════════════════════════════
//  CONFIG — tweak these to reshape the field
// ═══════════════════════════════════════════════════════════════════
const COLS    = 115;   // particles per row
const ROWS    = 115;   // number of rows
const SPACING = 0.38;  // world-unit gap between particles
const COUNT   = COLS * ROWS;  // ~13 225 points — very fast with ShaderMaterial

// ═══════════════════════════════════════════════════════════════════
//  initThreeScene()
//  Exported factory — builds and starts the particle scene.
//  Returns { pause, resume } for the showreel.js RAF bridge.
// ═══════════════════════════════════════════════════════════════════
export function initThreeScene() {

  // ── CSS: lock the canvas behind all content ──────────────────
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    canvas#bg {
      position: fixed;
      inset: 0;
      width: 100vw !important;
      height: 100vh !important;
      z-index: -1;
      pointer-events: none;
    }
  `;
  document.head.appendChild(styleTag);

  // ── Scene ────────────────────────────────────────────────────
  const scene = new THREE.Scene();

  // ── Camera ───────────────────────────────────────────────────
  //   Positioned above and slightly forward to create a depth
  //   perspective that feels cinematic, not top-down.
  const camera = new THREE.PerspectiveCamera(
    52,
    window.innerWidth / window.innerHeight,
    0.5,
    300
  );
  const CAM_BASE = new THREE.Vector3(0, 9, 20);
  camera.position.copy(CAM_BASE);
  camera.lookAt(0, 0, 0);

  // ── Renderer ─────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas:    document.getElementById('bg'),
    antialias: false,  // Points don't need MSAA; saves fillrate
    alpha:     true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ── Geometry: flat XZ grid, Y animated by shader ─────────────
  const positions = new Float32Array(COUNT * 3);
  const aSizes    = new Float32Array(COUNT);
  const aPhases   = new Float32Array(COUNT);
  const aSpeeds   = new Float32Array(COUNT);

  const halfW = ((COLS - 1) * SPACING) / 2;
  const halfH = ((ROWS - 1) * SPACING) / 2;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i           = r * COLS + c;
      positions[i * 3]     = c * SPACING - halfW;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = r * SPACING - halfH;
      aSizes[i]   = Math.random() * 2.2 + 1.4; // 1.4 – 3.6
      aPhases[i]  = Math.random() * Math.PI * 2;
      aSpeeds[i]  = Math.random() * 0.5 + 0.3;  // 0.3 – 0.8
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(aSizes,    1));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(aPhases,   1));
  geo.setAttribute('aSpeed',   new THREE.BufferAttribute(aSpeeds,   1));

  // ── Shader Material ───────────────────────────────────────────
  const uniforms = {
    uTime:    { value: 0.0 },
    uMouse:   { value: new THREE.Vector2(0, 0) },
    uOpacity: { value: 0.0 },   // starts transparent for fade-in
    uDpr:     { value: Math.min(window.devicePixelRatio, 2) },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,  // natural HDR glow, no dark edges
    defines: { USE_SIZEATTENUATION: '' }, // ensure perspective attenuation is on
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ── Mouse / Touch tracking ────────────────────────────────────
  const rawMouse    = new THREE.Vector2(0, 0);
  const smoothMouse = new THREE.Vector2(0, 0);

  function handleMouse(clientX, clientY) {
    rawMouse.x =  (clientX / window.innerWidth)  * 2 - 1;
    rawMouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  window.addEventListener('mousemove', (e) => handleMouse(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) handleMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  // ── Responsive resize ────────────────────────────────────────
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    uniforms.uDpr.value = dpr;
  });

  // ── Camera inertia target ────────────────────────────────────
  const camTarget = new THREE.Vector3().copy(CAM_BASE);

  // ── Clock for deterministic timing ───────────────────────────
  const clock = new THREE.Clock(false);

  // ── RAF bridge state ─────────────────────────────────────────
  let _rafId   = null;
  let _running = false;

  // ── Animation loop ────────────────────────────────────────────
  function animate() {
    if (!_running) return;
    _rafId = requestAnimationFrame(animate);

    const t = clock.getElapsedTime();

    // ── Fade-in intro (2 s) ──────────────────────────────────
    if (uniforms.uOpacity.value < 1.0) {
      uniforms.uOpacity.value = Math.min(t / 2.0, 1.0);
    }

    // ── Smooth mouse with inertia (lerp factor = ease strength) ─
    smoothMouse.lerp(rawMouse, 0.048);
    uniforms.uMouse.value.copy(smoothMouse);

    // ── Camera drifts gently toward mouse with heavy inertia ──
    camTarget.x = CAM_BASE.x + smoothMouse.x * 2.8;
    camTarget.y = CAM_BASE.y + smoothMouse.y * 1.4;
    camera.position.lerp(camTarget, 0.035);
    camera.lookAt(0, 0, 0);

    // ── Drive time uniform ────────────────────────────────────
    uniforms.uTime.value = t;

    renderer.render(scene, camera);
  }

  // ── Pause / Resume (showreel.js bridge) ───────────────────────
  function pause() {
    _running = false;
    if (_rafId !== null) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  }

  function resume() {
    if (_running) return;   // guard against double-start
    _running = true;
    clock.start();
    animate();
  }

  resume();

  return { pause, resume };
}
