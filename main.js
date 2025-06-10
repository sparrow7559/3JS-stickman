import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 2, 0);

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x4a5d23,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// Stickman Group
const stickman = new THREE.Group();
scene.add(stickman);

// Materials
const headMaterial = new THREE.MeshPhongMaterial({ color: 0x2c2c2c });
const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
const limbMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

// Stickman proportions
const scale = 1.8;
const headRadius = 0.3 * scale;
const torsoHeight = 1.2 * scale;
const limbWidth = 0.06 * scale;
const armLength = 1.0 * scale;
const legLength = 1.3 * scale;

// Create stickman parts
const parts = {};

// Head
parts.head = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, 16, 16),
    headMaterial
);
parts.head.position.set(0, torsoHeight + headRadius, 0);
parts.head.castShadow = true;
stickman.add(parts.head);

// Torso
parts.torso = new THREE.Mesh(
    new THREE.CylinderGeometry(limbWidth * 1.2, limbWidth * 1.2, torsoHeight, 8),
    bodyMaterial
);
parts.torso.position.set(0, torsoHeight / 2, 0);
parts.torso.castShadow = true;
stickman.add(parts.torso);

// FIXED: Create limb with proper pivot point for arms
function createArm(length, width = limbWidth) {
    const armGroup = new THREE.Group();
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(width, width, length, 8),
        limbMaterial
    );
    // Position the arm mesh so it hangs down from the shoulder
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    armGroup.add(mesh);
    return armGroup;
}

// FIXED: Create limb with proper pivot point for legs
function createLeg(length, width = limbWidth) {
    const legGroup = new THREE.Group();
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(width, width, length, 8),
        limbMaterial
    );
    // Position the leg mesh so it hangs down from the hip
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    legGroup.add(mesh);
    return legGroup;
}

// FIXED: Left Arm - positioned at shoulder level
parts.leftArm = createArm(armLength);
parts.leftArm.position.set(-0.35 * scale, torsoHeight * 0.85, 0); // Higher shoulder position
stickman.add(parts.leftArm);

// FIXED: Right Arm - positioned at shoulder level  
parts.rightArm = createArm(armLength);
parts.rightArm.position.set(0.35 * scale, torsoHeight * 0.85, 0); // Higher shoulder position
stickman.add(parts.rightArm);

// Left Leg
parts.leftLeg = createLeg(legLength);
parts.leftLeg.position.set(-0.15 * scale, 0, 0);
stickman.add(parts.leftLeg);

// Right Leg
parts.rightLeg = createLeg(legLength);
parts.rightLeg.position.set(0.15 * scale, 0, 0);
stickman.add(parts.rightLeg);

// Position stickman above ground
stickman.position.y = legLength;

// Animation state
const state = {
    isWalking: false,
    isRunning: false,
    isJumping: false,
    velocity: new THREE.Vector3(0, 0, 0),
    jumpForce: 0,
    gravity: -0.02,
    walkSpeed: 0.05,
    runSpeed: 0.12,
    turnSpeed: 0.06,
    groundLevel: legLength
};

// Keyboard input
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    e.preventDefault();
});

// FIXED: Animation function with proper arm movement
function animateWalking(time) {
    if (!state.isWalking) {
        // Return to neutral pose
        parts.leftArm.rotation.x = THREE.MathUtils.lerp(parts.leftArm.rotation.x, 0, 0.1);
        parts.rightArm.rotation.x = THREE.MathUtils.lerp(parts.rightArm.rotation.x, 0, 0.1);
        parts.leftLeg.rotation.x = THREE.MathUtils.lerp(parts.leftLeg.rotation.x, 0, 0.1);
        parts.rightLeg.rotation.x = THREE.MathUtils.lerp(parts.rightLeg.rotation.x, 0, 0.1);
        return;
    }

    const frequency = state.isRunning ? 5 : 3;
    const armAmplitude = state.isRunning ? 0.8 : 0.5; // Reduced for more natural look
    const legAmplitude = state.isRunning ? 1.0 : 0.6;
    
    const cycle = Math.sin(time * frequency);
    const oppositeCycle = Math.sin(time * frequency + Math.PI);
    
    // FIXED: Arms swing naturally from shoulders
    parts.leftArm.rotation.x = cycle * armAmplitude;
    parts.rightArm.rotation.x = oppositeCycle * armAmplitude;
    
    // Legs swing from hips
    parts.leftLeg.rotation.x = oppositeCycle * legAmplitude;
    parts.rightLeg.rotation.x = cycle * legAmplitude;
    
    // Subtle body movement
    const bodyBob = Math.abs(Math.sin(time * frequency * 2)) * 0.05;
    stickman.position.y = state.groundLevel + bodyBob;
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Handle input
    state.isWalking = false;
    state.isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    
    let moveSpeed = state.isRunning ? state.runSpeed : state.walkSpeed;
    
    if (keys['ArrowUp'] || keys['KeyW']) {
        const forward = new THREE.Vector3(
            Math.sin(stickman.rotation.y),
            0,
            Math.cos(stickman.rotation.y)
        );
        stickman.position.add(forward.multiplyScalar(moveSpeed));
        state.isWalking = true;
    }
    
    if (keys['ArrowDown'] || keys['KeyS']) {
        const backward = new THREE.Vector3(
            -Math.sin(stickman.rotation.y),
            0,
            -Math.cos(stickman.rotation.y)
        );
        stickman.position.add(backward.multiplyScalar(moveSpeed * 0.6));
        state.isWalking = true;
    }
    
    if (keys['ArrowLeft'] || keys['KeyA']) {
        stickman.rotation.y += state.turnSpeed;
    }
    
    if (keys['ArrowRight'] || keys['KeyD']) {
        stickman.rotation.y -= state.turnSpeed;
    }
    
    // Jumping
    if (keys['Space'] && !state.isJumping) {
        state.jumpForce = 0.3;
        state.isJumping = true;
    }
    
    // Physics
    state.velocity.y += state.gravity;
    state.velocity.y += state.jumpForce;
    state.jumpForce = 0;
    
    stickman.position.y += state.velocity.y;
    
    // Ground collision
    if (stickman.position.y <= state.groundLevel) {
        stickman.position.y = state.groundLevel;
        state.velocity.y = 0;
        state.isJumping = false;
    }
    
    // Animate stickman
    animateWalking(time);
    
    // Update controls
    controls.update();
    
    // Render
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize camera
camera.position.set(5, 4, 8);
camera.lookAt(0, 2, 0);

// Start animation
animate();