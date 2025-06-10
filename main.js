import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Light blue background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 5);
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1, 0); // Set the orbit target to the stickman's center

// Add a ground plane
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x808080,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2;
ground.position.y = -0.1;
scene.add(ground);

// Stickman hierarchy
const stickman = new THREE.Group();
scene.add(stickman);

// Materials
const material = new THREE.MeshPhongMaterial({ color: 0x000000 });

// Remove previous stickman creation code
while (stickman.children.length > 0) stickman.remove(stickman.children[0]);

// Proportions
const bodyHeight = 2.5;
const limbThickness = 0.05;
const headRadius = 0.3;

// Body (vertical line)
const bodyTop = new THREE.Vector3(0, bodyHeight, 0);
const bodyBottom = new THREE.Vector3(0, 0, 0);
const body = new THREE.Mesh(
    new THREE.CylinderGeometry(limbThickness, limbThickness, bodyHeight, 8),
    material
);
body.position.y = bodyHeight / 2;
stickman.add(body);

// Head (circle above body)
const head = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, 16, 16),
    material
);
head.position.y = bodyHeight + headRadius;
stickman.add(head);

// Helper to create a limb between two points
function createLimb(start, end, thickness = limbThickness) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const limb = new THREE.Mesh(
        new THREE.CylinderGeometry(thickness, thickness, length, 8),
        material
    );

    // Align the cylinder along the direction vector
    limb.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), // Default cylinder up
        direction.clone().normalize()
    );

    limb.position.copy(midPoint);
    return limb;
}

// Arms (attach just below the head, angle out at 45°)
const armBase = new THREE.Vector3(0, bodyHeight - 0.15, 0);
const armLength = 2.0;
const armAngle = Math.PI / 4;
const leftArmEnd = armBase.clone().add(new THREE.Vector3(-Math.sin(armAngle) * armLength, Math.cos(armAngle) * armLength, 0));
const rightArmEnd = armBase.clone().add(new THREE.Vector3(Math.sin(armAngle) * armLength, Math.cos(armAngle) * armLength, 0));
const leftArmMesh = createLimb(armBase, leftArmEnd);
const rightArmMesh = createLimb(armBase, rightArmEnd);
stickman.add(leftArmMesh);
stickman.add(rightArmMesh);

// Legs (attach at bottom of body, angle out at 30°)
const legBase = new THREE.Vector3(0, 0, 0);
const legLength = 2.2;
const legAngle = Math.PI / 6;
const leftLegEnd = legBase.clone().add(new THREE.Vector3(-Math.sin(legAngle) * legLength, -Math.cos(legAngle) * legLength, 0));
const rightLegEnd = legBase.clone().add(new THREE.Vector3(Math.sin(legAngle) * legLength, -Math.cos(legAngle) * legLength, 0));
const leftLegMesh = createLimb(legBase, leftLegEnd);
const rightLegMesh = createLimb(legBase, rightLegEnd);
stickman.add(leftLegMesh);
stickman.add(rightLegMesh);

// --- Limb Animation ---
// Animate limbs in the animation loop
const animateStickmanLimbs = (time, isWalking = true, isRunning = false) => {
    // Walking/running animation
    const speed = isRunning ? 2.5 : 1.5;
    const swing = isWalking ? Math.sin(time * speed) * 0.7 : 0;
    const swingOpp = isWalking ? Math.sin(time * speed + Math.PI) * 0.7 : 0;
    leftArmMesh.rotation.x = swing;
    rightArmMesh.rotation.x = swingOpp;
    leftLegMesh.rotation.x = swingOpp;
    rightLegMesh.rotation.x = swing;
};

// Position camera
camera.position.set(5, 3, 5);
camera.lookAt(0, 1, 0);

// Animation state
const state = {
    isWalking: false,
    isRunning: false,
    isJumping: false,
    direction: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    jumpForce: 0,
    gravity: -0.01,
    speed: 0.05,
    runSpeed: 0.1,
    turnSpeed: 0.05
};

// Keyboard controls
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    Shift: false
};

window.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update movement
    state.direction.set(0, 0, 0);
    state.isWalking = false;
    state.isRunning = keys.Shift;

    if (keys.ArrowUp) {
        state.direction.z = -1;
        state.isWalking = true;
    }
    if (keys.ArrowDown) {
        state.direction.z = 1;
        state.isWalking = true;
    }
    if (keys.ArrowLeft) {
        stickman.rotation.y += state.turnSpeed;
    }
    if (keys.ArrowRight) {
        stickman.rotation.y -= state.turnSpeed;
    }

    // Jumping
    if (keys.Space && !state.isJumping) {
        state.jumpForce = 0.2;
        state.isJumping = true;
    }

    // Apply gravity and jumping
    state.velocity.y += state.gravity;
    state.velocity.y += state.jumpForce;
    state.jumpForce = 0;

    // Update position (move in facing direction)
    const moveSpeed = state.isRunning ? state.runSpeed : state.speed;
    if (state.isWalking) {
        const forward = new THREE.Vector3(0, 0, state.direction.z).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            stickman.rotation.y
        );
        stickman.position.add(forward.multiplyScalar(moveSpeed));
    }
    stickman.position.y += state.velocity.y;

    // Ground collision
    if (stickman.position.y <= 0) {
        stickman.position.y = 0;
        state.velocity.y = 0;
        state.isJumping = false;
    }

    controls.update();
    animateStickmanLimbs(Date.now() * 0.001, state.isWalking, state.isRunning);
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();
