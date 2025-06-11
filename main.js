import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 2, 0);

// Load GLB Platform
const loader = new GLTFLoader();
let platformMesh = null;

loader.load('Maze2.glb', (gltf) => {
    const platform = gltf.scene;
    platform.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material.side = THREE.DoubleSide;
        }
    });
    platform.scale.set(1, 1, 1);
    platform.position.set(0, 0, 0);
    scene.add(platform);

    platform.traverse((child) => {
        if (child.isMesh && !platformMesh) {
            platformMesh = child;
        }
    });
});

// Stickman setup
const stickman = new THREE.Group();
scene.add(stickman);

const headMaterial = new THREE.MeshPhongMaterial({ color: 0x2c2c2c });
const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
const limbMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

const scale = 1.8;
const headRadius = 0.3 * scale;
const torsoHeight = 1.2 * scale;
const limbWidth = 0.06 * scale;
const armLength = 1.0 * scale;
const legLength = 1.3 * scale;

const parts = {};

// Head
parts.head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 16, 16), headMaterial);
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

// Arms
function createArm(length) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(limbWidth, limbWidth, length, 8), limbMaterial);
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    group.add(mesh);
    return group;
}

parts.leftArm = createArm(armLength);
parts.leftArm.position.set(-0.35 * scale, torsoHeight * 0.85, 0);
stickman.add(parts.leftArm);

parts.rightArm = createArm(armLength);
parts.rightArm.position.set(0.35 * scale, torsoHeight * 0.85, 0);
stickman.add(parts.rightArm);

// Legs
function createLeg(length) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(limbWidth, limbWidth, length, 8), limbMaterial);
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    group.add(mesh);
    return group;
}

parts.leftLeg = createLeg(legLength);
parts.leftLeg.position.set(-0.15 * scale, 0, 0);
stickman.add(parts.leftLeg);

parts.rightLeg = createLeg(legLength);
parts.rightLeg.position.set(0.15 * scale, 0, 0);
stickman.add(parts.rightLeg);

stickman.position.y = legLength;

// Animation State
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

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Raycaster for platform collision
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

// Walking animation
function animateWalking(time) {
    if (!state.isWalking) {
        parts.leftArm.rotation.x = THREE.MathUtils.lerp(parts.leftArm.rotation.x, 0, 0.1);
        parts.rightArm.rotation.x = THREE.MathUtils.lerp(parts.rightArm.rotation.x, 0, 0.1);
        parts.leftLeg.rotation.x = THREE.MathUtils.lerp(parts.leftLeg.rotation.x, 0, 0.1);
        parts.rightLeg.rotation.x = THREE.MathUtils.lerp(parts.rightLeg.rotation.x, 0, 0.1);
        return;
    }

    const freq = state.isRunning ? 5 : 3;
    const armAmp = state.isRunning ? 0.8 : 0.5;
    const legAmp = state.isRunning ? 1.0 : 0.6;
    const cycle = Math.sin(time * freq);
    const oppCycle = Math.sin(time * freq + Math.PI);

    parts.leftArm.rotation.x = cycle * armAmp;
    parts.rightArm.rotation.x = oppCycle * armAmp;
    parts.leftLeg.rotation.x = oppCycle * legAmp;
    parts.rightLeg.rotation.x = cycle * legAmp;

    const bob = Math.abs(Math.sin(time * freq * 2)) * 0.05;
    stickman.position.y = state.groundLevel + bob;
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    state.isWalking = false;
    state.isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    let moveSpeed = state.isRunning ? state.runSpeed : state.walkSpeed;

    if (keys['ArrowUp'] || keys['KeyW']) {
        const forward = new THREE.Vector3(Math.sin(stickman.rotation.y), 0, Math.cos(stickman.rotation.y));
        stickman.position.add(forward.multiplyScalar(moveSpeed));
        state.isWalking = true;
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        const backward = new THREE.Vector3(-Math.sin(stickman.rotation.y), 0, -Math.cos(stickman.rotation.y));
        stickman.position.add(backward.multiplyScalar(moveSpeed * 0.6));
        state.isWalking = true;
    }
    if (keys['ArrowLeft'] || keys['KeyA']) stickman.rotation.y += state.turnSpeed;
    if (keys['ArrowRight'] || keys['KeyD']) stickman.rotation.y -= state.turnSpeed;

    if (keys['Space'] && !state.isJumping) {
        state.jumpForce = 0.3;
        state.isJumping = true;
    }

    state.velocity.y += state.gravity;
    state.velocity.y += state.jumpForce;
    state.jumpForce = 0;
    stickman.position.y += state.velocity.y;

    if (platformMesh) {
        raycaster.set(stickman.position.clone().add(new THREE.Vector3(0, 1, 0)), down);
        const intersects = raycaster.intersectObject(platformMesh, true);
        if (intersects.length > 0) {
            const contactY = intersects[0].point.y;
            if (stickman.position.y <= contactY + 0.01) {
                stickman.position.y = contactY;
                state.velocity.y = 0;
                state.isJumping = false;
            }
            state.groundLevel = contactY;
        }
    }

    animateWalking(time);
    controls.update();
    renderer.render(scene, camera);
}

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

camera.position.set(5, 4, 8);
camera.lookAt(0, 2, 0);
animate();
