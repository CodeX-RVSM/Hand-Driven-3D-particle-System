import * as THREE from 'three';

// --- 1. Global Configuration ---
const PARTICLE_COUNT = 25000; // High density for the "Gemini" look
let handX = 0, handY = 0, expansion = 1.0;
let currentTargetArr;
let activeColor = new THREE.Color(0x00f2ff);

// --- 2. Generate Shape Templates (Target Coordinates) ---
const sphereTarget = new Float32Array(PARTICLE_COUNT * 3);
const heartTarget = new Float32Array(PARTICLE_COUNT * 3);
const saturnTarget = new Float32Array(PARTICLE_COUNT * 3);

for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    // --- Sphere Template ---
    const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
    const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
    sphereTarget[i3] = Math.cos(theta) * Math.sin(phi) * 5;
    sphereTarget[i3 + 1] = Math.sin(theta) * Math.sin(phi) * 5;
    sphereTarget[i3 + 2] = Math.cos(phi) * 5;

    // --- Heart Template ---
    const t = Math.random() * Math.PI * 2;
    heartTarget[i3] = (16 * Math.pow(Math.sin(t), 3)) * 0.35;
    heartTarget[i3 + 1] = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.35;
    heartTarget[i3 + 2] = (Math.random() - 0.5) * 2;

    // --- Saturn Template (Sphere + Ring) ---
    if (i < PARTICLE_COUNT * 0.6) {
        const sPhi = Math.acos(-1 + (2 * i) / (PARTICLE_COUNT * 0.6));
        const sTheta = Math.sqrt(PARTICLE_COUNT * 0.6 * Math.PI) * sPhi;
        saturnTarget[i3] = Math.cos(sTheta) * Math.sin(sPhi) * 4;
        saturnTarget[i3 + 1] = Math.sin(sTheta) * Math.sin(sPhi) * 4;
        saturnTarget[i3 + 2] = Math.cos(sPhi) * 4;
    } else {
        const angle = Math.random() * Math.PI * 2;
        const r = 6.5 + Math.random() * 2.5;
        saturnTarget[i3] = Math.cos(angle) * r;
        saturnTarget[i3 + 1] = (Math.random() - 0.5) * 0.4;
        saturnTarget[i3 + 2] = Math.sin(angle) * r;
    }
}
currentTargetArr = sphereTarget; // Set default shape

// --- 3. Three.js Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geo = new THREE.BufferGeometry();
const posArray = new Float32Array(PARTICLE_COUNT * 3);
const colArray = new Float32Array(PARTICLE_COUNT * 3);

// Fill with random initial positions
for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 100;
    colArray[i] = Math.random();
}

geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));

const loader = new THREE.TextureLoader();
const sprite = loader.load('https://threejs.org/examples/textures/sprites/disc.png');

const mat = new THREE.PointsMaterial({
    size: 0.07,
    map: sprite,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.8
});

const points = new THREE.Points(geo, mat);
scene.add(points);
camera.position.z = 20;

// --- 4. Hand Tracking Logic ---
const videoElement = document.getElementById('input_video');
const guideVideo = document.getElementById('guide_video');
const shapeNameEl = document.getElementById('shape-name');

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({ 
    maxNumHands: 1, 
    modelComplexity: 1, 
    minDetectionConfidence: 0.6 
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const lm = results.multiHandLandmarks[0];
        
        // Landmark 8 = Index Finger Tip, Landmark 4 = Thumb Tip
        // Map camera coordinates to 3D space
        handX = (lm[8].x - 0.5) * -40; 
        handY = (lm[8].y - 0.5) * -30;

        // Zoom: Pinch distance between Index and Thumb
        const dist = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y);
        expansion = THREE.MathUtils.lerp(expansion, dist * 10, 0.15);

        // Shape Switching based on Hand vertical position
        if (lm[8].y < 0.25) { 
            currentTargetArr = saturnTarget; 
            if(shapeNameEl) shapeNameEl.innerText = "Saturn";
            activeColor.set(0xffaa00); // Golden Saturn
        } else if (lm[8].y > 0.75) { 
            currentTargetArr = heartTarget; 
            if(shapeNameEl) shapeNameEl.innerText = "Heart";
            activeColor.set(0xff0066); // Pink Heart
        } else {
            currentTargetArr = sphereTarget;
            if(shapeNameEl) shapeNameEl.innerText = "Sphere";
            activeColor.set(0x00f2ff); // Cyan Sphere
        }
    }
});

const cam = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
        if (!guideVideo.srcObject) guideVideo.srcObject = videoElement.srcObject;
    },
    width: 640, height: 480
});
cam.start();

// --- 5. Animation Loop (The "Engine") ---
function animate() {
    requestAnimationFrame(animate);
    
    const positions = points.geometry.attributes.position.array;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        
        // Apply Zoom (expansion) to the template, then add hand tracking offset
        const tx = (currentTargetArr[i3] * expansion) + handX;
        const ty = (currentTargetArr[i3 + 1] * expansion) + handY;
        const tz = (currentTargetArr[i3 + 2] * expansion);

        // Interpolation (Smooth Morphing)
        // Adjust 0.07 to make them move faster or slower
        positions[i3] += (tx - positions[i3]) * 0.07;
        positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.07;
        positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.07;
    }
    
    // Smoothly transition material color
    mat.color.lerp(activeColor, 0.05);
    
    points.geometry.attributes.position.needsUpdate = true;
    points.rotation.y += 0.002; // Slow rotation
    
    renderer.render(scene, camera);
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});