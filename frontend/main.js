import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initThreeScene } from './scene.js';

// Initialize the fixed 3D background scene
initThreeScene();


// --- BACKEND INTEGRATION ---
// Uses environment variable set in .env (local) or Vercel dashboard (production)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Function to initialize a mini Three.js scene for a project card
function initCard3D(container, cardElement) {
    const scene = new THREE.Scene();
    
    // Style container for mini viewport
    container.style.position = 'relative';
    container.style.height = '150px';
    container.style.width = '100%';
    container.style.marginBottom = '1rem';
    
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 3, 5);

    // Separate renderer per card
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    // Add OrbitControls so users can rotate the project elements interactively!
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; // Prevent zoom from interfering with page scroll
    controls.enableDamping = true; // Adds physical inertia to spinning
    controls.dampingFactor = 0.05;

    // Film canister geometry (cylinder)
    const geometry = new THREE.CylinderGeometry(1.2, 1.2, 0.4, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        roughness: 0.3, 
        metalness: 0.8 
    });
    const canister = new THREE.Mesh(geometry, material);
    canister.rotation.x = Math.PI / 4;
    scene.add(canister);

    // Lighting setup for the canister
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 5, 2);
    scene.add(ambientLight, dirLight);

    let isHovered = false;
    cardElement.addEventListener('mouseenter', () => isHovered = true);
    cardElement.addEventListener('mouseleave', () => isHovered = false);

    let isVisible = false;
    let animationId;

    // IntersectionObserver to pause rendering when the card is off-screen
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
            if (isVisible) {
                animate();
            } else {
                cancelAnimationFrame(animationId);
            }
        });
    });
    observer.observe(container);

    function animate() {
        if (!isVisible) return;
        animationId = requestAnimationFrame(animate);

        // Allow OrbitControls to process physical inertia
        controls.update();

        // Give it a slightly slower idle rotation if not hovered
        // On hover: spin faster and change color to the accent pink
        if (isHovered) {
            canister.rotation.y += 0.05;
            material.color.setHex(0xff0055);
        } else {
            canister.rotation.y += 0.005;
            canister.rotation.z += 0.002;
            material.color.setHex(0x888888);
        }

        renderer.render(scene, camera);
    }

    // Keep mini-canvas responsive when the card resizes
    const resizeObserver = new ResizeObserver(() => {
        if (container.clientWidth === 0 || container.clientHeight === 0) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);
}

// Fetch Projects
async function fetchProjects() {
    const projectsGrid = document.getElementById('projects-grid');
    try {
        const response = await fetch(`${API_URL}/projects`);
        if (!response.ok) throw new Error('Failed to fetch');
        const projects = await response.json();
        
        if (projects.length === 0) {
            projectsGrid.innerHTML = '<p>No projects found. Add some in the database!</p>';
            return;
        }

        projectsGrid.innerHTML = ''; // clear loading text
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <div class="card-3d-viewport"></div>
                <h3>${project.title}</h3>
                <p><strong>Role:</strong> ${project.role}</p>
                <p>${project.description}</p>
            `;
            projectsGrid.appendChild(card);

            // Initialize the 3D scene inside the new viewport
            const viewport = card.querySelector('.card-3d-viewport');
            initCard3D(viewport, card);
        });

    } catch (error) {
        console.error('Error fetching projects:', error);
        projectsGrid.innerHTML = '<p>Ensure the backend is running to see projects.</p>';
    }
}

// Handle Contact Form
document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    const statusText = document.getElementById('form-status');

    try {
        const response = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        });
        
        if (response.ok) {
            statusText.style.color = '#00ff88';
            statusText.innerText = 'Message sent successfully!';
            e.target.reset();
        } else {
            throw new Error('Failed to send');
        }
    } catch (error) {
        statusText.style.color = '#ff0055';
        statusText.innerText = 'Failed to send message. Please try again.';
    }
});

// Initialize fetching
fetchProjects();

initThreeScene();
