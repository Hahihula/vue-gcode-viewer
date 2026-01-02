<template>
  <div class="gcode-viewer-container" ref="container">
    <!-- Toolbar -->
    <div class="toolbar">
      <button @click="toggleSidebar">{{ showSidebar ? 'Hide Editor' : 'Show Editor' }}</button>
      <button v-if="needsReload" @click="reloadView" class="reload-button">🔄 Reload View</button>
      <div class="controls">
        <button @click="stop">⏹</button>
        <button @click="prevStep">⏮</button>
        <button @click="togglePlay">{{ isPlaying ? '⏸' : '▶' }}</button>
        <button @click="nextStep">⏭</button>
      </div>
      <div class="speed-control">
        <span>{{ playbackSpeed }}x</span>
        <input type="range" min="0.1" max="10" step="0.1" v-model.number="playbackSpeed">
      </div>
    </div>

    <div class="content">
      <!-- Sidebar (CodeMirror) -->
      <div v-show="showSidebar" class="sidebar">
        <div ref="editorContainer" class="editor-container"></div>
      </div>

      <!-- 3D Viewport -->
      <div ref="canvasContainer" class="canvas-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { ViewPlugin, Decoration } from '@codemirror/view';
import { useGcodeParser } from '../composables/useGcodeParser';

// Props
const props = defineProps({
  gcode: { type: String, default: '' },
  tessellation: { type: Number, default: 0.05 }
});

const emit = defineEmits(['update:gcode']);

// --- State ---
const container = ref(null);
const canvasContainer = ref(null);
const editorContainer = ref(null);
const showSidebar = ref(true);
const playbackSpeed = ref(1.0);
const isPlaying = ref(false);
const currentSegmentIndex = ref(0);
const simTime = ref(0); // Tracks current time in seconds
const parseErrors = ref([]);
const needsReload = ref(false); // Track if gcode changed
const lastRenderedChecksum = ref(0); // Track checksum of last rendered gcode


// --- Parser ---
const { processGcode, vertices } = useGcodeParser();

// --- Simple Checksum Function ---
const calculateChecksum = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
};


// --- Three.js Globals ---
let scene, camera, renderer, lineMesh, headGroup;
let animationId;

// --- CodeMirror Globals ---
let cmView;

// --- CodeMirror Decorations (Highlighting) ---
const activeLineMark = Decoration.line({ class: 'active-line' });
const errorLineMark = Decoration.line({ class: 'error-line' });

// The plugin that handles highlighting based on state
const syncHighlightPlugin = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = this.getDecorations(view);
  }
  update(update) {
    this.decorations = this.getDecorations(update.view);
  }
  getDecorations(view) {
    const decorations = [];
    // Highlight active simulation line
    const currentVert = vertices.value[currentSegmentIndex.value];
    if (currentVert) {
        decorations.push(activeLineMark.range(view.state.doc.line(currentVert.lineIndex + 1).from));
    }
    return Decoration.set(decorations);
  }
}, { decorations: v => v.decorations });

// --- Watch for external gcode changes ---
watch(() => props.gcode, (newGcode) => {
  if (cmView && cmView.state.doc.toString() !== newGcode) {
    // Update editor content
    cmView.dispatch({
      changes: {
        from: 0,
        to: cmView.state.doc.length,
        insert: newGcode
      }
    });
    
    // Mark as needing reload
    const newChecksum = calculateChecksum(newGcode);
    if (newChecksum !== lastRenderedChecksum.value) {
      needsReload.value = true;
    }
  }
});

// --- Initialization ---
onMounted(() => {
  initThree();
  initEditor();
  window.addEventListener('resize', onWindowResize);
  renderGcode(); // Initial render
  lastRenderedChecksum.value = calculateChecksum(props.gcode);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  if (cmView) cmView.destroy();
  if (renderer) renderer.dispose();
});

const createHighlightPlugin = (errorList) => {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = this.getDecorations(view);
    }
    update(update) {
      this.decorations = this.getDecorations(update.view);
    }
    getDecorations(view) {
      const decorations = [];
      
      // 1. Active Line (Simulation)
      const currentVert = vertices.value[currentSegmentIndex.value];
      if (currentVert) {
          decorations.push(activeLineMark.range(view.state.doc.line(currentVert.lineIndex + 1).from));
      }

      // 2. Error Lines (Parser)
      errorList.forEach(err => {
          // err.lineIndex is 0-based from parser. CodeMirror lines are 1-based in .line()
          decorations.push(errorLineMark.range(view.state.doc.line(err.lineIndex + 1).from));
      });

      return Decoration.set(decorations);
    }
  }, { decorations: v => v.decorations });
};

// --- Editor Setup ---
const initEditor = () => {
  const startState = EditorState.create({
    doc: props.gcode,
    extensions: [
      basicSetup,
      createHighlightPlugin(parseErrors.value), 
      EditorView.theme({
        "&": { height: "100%" },
        ".active-line": { backgroundColor: "#4444ff33" }, 
        ".error-line": { backgroundColor: "#ff000033" },   
        ".cm-line": { textAlign: "left", cursor: "pointer" }
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newGcode = update.state.doc.toString();
          emit('update:gcode', newGcode);
          
          // Check if gcode changed from last rendered version using checksum
          const newChecksum = calculateChecksum(newGcode);
          if (newChecksum !== lastRenderedChecksum.value) {
            needsReload.value = true;
          }
        }
      }),
      // Add click handler for lines
      EditorView.domEventHandlers({
        click: (event, view) => {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos !== null) {
            const line = view.state.doc.lineAt(pos);
            const lineNumber = line.number - 1; // Convert to 0-based
            jumpToLine(lineNumber);
          }
          return false;
        }
      })
    ]
  });
  cmView = new EditorView({ state: startState, parent: editorContainer.value });
};

// --- Three.js Setup ---
const initThree = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1e1e);

  // Grid (rotated so Z is up instead of Y)
  const gridHelper = new THREE.GridHelper(200, 20);
  gridHelper.rotation.x = Math.PI / 2; // Rotate 90 degrees to make Z-axis vertical
  scene.add(gridHelper);

  // Axes (Z is now up, Y is depth)
  // Red = X, Green = Y (depth), Blue = Z (up)
  const axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);

  // Camera positioned to view the rotated coordinate system
  const aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
  // Position camera so it looks down at the XY plane with Z going up
  camera.position.set(100, -100, 100); // X, Y(depth), Z(up)
  camera.up.set(0, 0, 1); // Set Z as the up direction
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
  canvasContainer.value.appendChild(renderer.domElement);

  // Add OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  // Add an animation loop to update controls
  const animateLoop = () => {
    requestAnimationFrame(animateLoop);
    controls.update(); // necessary for damping
    renderer.render(scene, camera);
  };
  animateLoop();
};

// --- Core: Rendering Gcode to 3D ---
const renderGcode = () => {
  if (!scene) return;

  // 1. Parse
  const result = processGcode(props.gcode, props.tessellation);
  parseErrors.value = result.errors;

  if (cmView) {
    cmView.dispatch({}); 
  }

  // 2. Clear old lines
  if (lineMesh) {
    scene.remove(lineMesh);
    lineMesh.geometry.dispose();
    lineMesh.material.dispose();
  }

  // 3. Build Geometry
  const positions = [];
  const colors = [];
  
  vertices.value.forEach(v => {
    // Positions
    positions.push(v.start.x, v.start.y, v.start.z);
    positions.push(v.end.x, v.end.y, v.end.z);
    // Helper to ensure we have a THREE.Color object (handles Hex Integers, Strings, or existing Objects)
    const cStart = new THREE.Color(v.startColor); 
    const cEnd = new THREE.Color(v.endColor);

    // Push the normalized float values (0.0 to 1.0)
    colors.push(cStart.r, cStart.g, cStart.b);
    colors.push(cEnd.r, cEnd.g, cEnd.b);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({ vertexColors: true });
  lineMesh = new THREE.LineSegments(geometry, material);
  scene.add(lineMesh);

  // 4. Reset Head
  updateHeadPosition(0);
  
  // 5. Auto-Camera (Simple Bounding Box)
  geometry.computeBoundingSphere();
  const center = geometry.boundingSphere.center;
  const radius = geometry.boundingSphere.radius;
  const distance = radius * 2.5;
  camera.position.set(center.x + distance, center.y - distance, center.z + distance);
  camera.lookAt(center);
  
  // 6. Update state
  lastRenderedChecksum.value = calculateChecksum(props.gcode);
  needsReload.value = false;
};

// --- Reload View Handler ---
const reloadView = () => {
  // Stop playback
  isPlaying.value = false;
  cancelAnimationFrame(animationId);
  
  // Reset simulation
  simTime.value = 0;
  currentSegmentIndex.value = 0;
  
  // Re-render
  renderGcode();
  
  // Update editor highlighting
  if (cmView) cmView.dispatch({});
};

// --- Jump to Line Handler ---
const jumpToLine = (lineNumber) => {
  // Find the vertex that corresponds to this line
  const vertexIndex = vertices.value.findIndex(v => v.lineIndex === lineNumber);
  
  if (vertexIndex !== -1) {
    // Stop playback if running
    isPlaying.value = false;
    cancelAnimationFrame(animationId);
    
    // Jump to that vertex
    currentSegmentIndex.value = vertexIndex;
    simTime.value = vertices.value[vertexIndex].startTime;
    
    // Update head position
    updateHeadPositionAtTime(simTime.value);
    
    // Update editor highlighting
    if (cmView) cmView.dispatch({});
  }
};

// --- Simulation Logic ---
let lastTime = 0;

const animate = (time) => {
  if (!isPlaying.value) return;

  const delta = (time - lastTime) / 1000; // Real seconds passed since last frame
  lastTime = time;

  // Increment simulation time by delta * speed multiplier
  simTime.value += delta * playbackSpeed.value;

  // Check bounds
  // We get the total duration from the last vertex (startTime + duration)
  const totalDuration = vertices.value.length > 0 
    ? (vertices.value[vertices.value.length - 1].startTime + vertices.value[vertices.value.length - 1].duration)
    : 0;

  if (simTime.value >= totalDuration) {
    isPlaying.value = false;
    simTime.value = totalDuration; // Clamp to end
    updateHeadPositionAtTime(simTime.value);
    return;
  }

  updateHeadPositionAtTime(simTime.value);
  
  // Trigger CodeMirror Highlight
  // We need to find which segment index corresponds to simTime to highlight the line
  const activeIndex = getSegmentIndexAtTime(simTime.value);
  if (currentSegmentIndex.value !== activeIndex) {
      currentSegmentIndex.value = activeIndex;
      if (cmView) cmView.dispatch({});
  }

  animationId = requestAnimationFrame(animate);
};

// Helper to find which segment we are on
const getSegmentIndexAtTime = (time) => {
    // Optimization: Binary search is better for huge files, 
    // but linear find is fine for typical G-code (thousands of lines).
    // We look for the vertex where startTime <= time < (startTime + duration)
    
    // Since vertices are sorted by time, we can iterate.
    // Note: We cache currentSegmentIndex to optimize starting point
    let idx = currentSegmentIndex.value;
    if (idx >= vertices.value.length) idx = vertices.value.length - 1;

    // Look ahead
    while (idx < vertices.value.length - 1) {
        const v = vertices.value[idx];
        const nextV = vertices.value[idx + 1];
        if (time >= v.startTime && time < nextV.startTime) {
            return idx;
        }
        idx++;
    }
    return vertices.value.length - 1;
};

// New function to update head based on absolute time
const updateHeadPositionAtTime = (time) => {
    const index = getSegmentIndexAtTime(time);
    const v = vertices.value[index];
    
    if (!v) return;

    // Calculate interpolation factor (0.0 to 1.0)
    // How far are we into this specific segment?
    const timeIntoSegment = time - v.startTime;
    let t = 0;
    if (v.duration > 0) {
        t = timeIntoSegment / v.duration;
    } else {
        t = 0; // Prevent divide by zero for zero-length moves
    }

    // Clamp t
    if (t > 1) t = 1;
    if (t < 0) t = 0;

    // Linear Interpolation (Lerp)
    const currentX = v.start.x + (v.end.x - v.start.x) * t;
    const currentY = v.start.y + (v.end.y - v.start.y) * t;
    const currentZ = v.start.z + (v.end.z - v.start.z) * t;

    // Update Head Mesh
    if (!headGroup) {
        const coneGeo = new THREE.ConeGeometry(1, 4, 8);
        // Rotate geometry so cone points +Z locally (aligns with forward movement if we handle rotation)
        coneGeo.rotateX(-Math.PI / 2); 
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        headGroup = new THREE.Mesh(coneGeo, mat);
        scene.add(headGroup);
    }

    headGroup.position.set(currentX, currentY, currentZ);
};


const updateHeadPosition = (index) => {
  if (index >= vertices.value.length) return;
  const v = vertices.value[index];
  if (!headGroup) {
      // Create Head
      const coneGeo = new THREE.ConeGeometry(1, 4, 16);
      coneGeo.rotateX(3 * Math.PI / 2); // Orient cone along Z (local) which points forward
      coneGeo.translate(0, 0, 2); // Move to center of cone
      const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      headGroup = new THREE.Mesh(coneGeo, mat);
      scene.add(headGroup);
  }
  
  // Update position
  headGroup.position.set(v.end.x, v.end.y, v.end.z);
};

// --- UI Handlers ---
const togglePlay = () => {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
      lastTime = performance.now();
      animate(lastTime);
  } else {
      cancelAnimationFrame(animationId);
  }
};

const stop = () => {
  isPlaying.value = false;
  cancelAnimationFrame(animationId);
  simTime.value = 0; // Reset time
  currentSegmentIndex.value = 0;
  updateHeadPositionAtTime(0);
  if (cmView) cmView.dispatch({});
};

const nextStep = () => {
  let nextIdx = currentSegmentIndex.value + 1;
  if (nextIdx >= vertices.value.length) nextIdx = vertices.value.length - 1;
  
  // Jump time to the start of that segment
  simTime.value = vertices.value[nextIdx].startTime;
  updateHeadPositionAtTime(simTime.value);
  currentSegmentIndex.value = nextIdx;
  if (cmView) cmView.dispatch({});
};

const prevStep = () => {
  let prevIdx = currentSegmentIndex.value - 1;
  if (prevIdx < 0) prevIdx = 0;
  
  simTime.value = vertices.value[prevIdx].startTime;
  updateHeadPositionAtTime(simTime.value);
  currentSegmentIndex.value = prevIdx;
  if (cmView) cmView.dispatch({});
};

const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value;
  setTimeout(() => {
    if(camera && renderer) {
        camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
    }
  }, 100);
};

const onWindowResize = () => {
  if (!camera || !renderer) return;
  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
};

</script>

<style scoped>
.gcode-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  border: 1px solid #444;
}
.toolbar {
  height: 40px;
  background: #2d2d2d;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 10px;
  color: white;
}
.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.canvas-container {
  flex: 1;
  background: #111;
  overflow: hidden;
  position: relative;
}
.sidebar {
  width: 400px;
  border-left: 1px solid #444;
  display: flex;
  flex-direction: column;
}
.editor-container {
  flex: 1;
  overflow: auto;
}
button {
  background: #444;
  color: white;
  border: none;
  padding: 4px 10px;
  cursor: pointer;
}
button:hover { background: #555; }
.reload-button {
  background: #ff6b35;
  font-weight: bold;
}
.reload-button:hover {
  background: #ff8555;
}
.controls { display: flex; gap: 5px; }
.speed-control { margin-left: auto; display: flex; gap: 5px; align-items: center; }
.editor-container .cm-line{
  text-align: left;
}
</style>