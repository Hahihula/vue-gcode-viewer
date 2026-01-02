<script setup>
import { ref } from 'vue';
import GcodeViewer from './components/GcodeViewer.vue';

const gcode = ref(`; Simple Demo
G90 ; Absolute coordinates
G21 ; Dimensions in mm
G1 X0 S0
G1 X10 S100
g1 X10 Y10 S100
G1 X0 Y10 S50
G0 X0 Y0`);

const theme = ref('dark');
const fileInput = ref(null);

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    gcode.value = e.target.result;
  };
  reader.readAsText(file);
  
  // Reset input so the same file can be loaded again
  event.target.value = '';
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const loadExample = () => {
  gcode.value = `; Simple Demo
G90 ; Absolute coordinates
G21 ; Dimensions in mm
G1 X0 Y0 Z0 S0
G1 X10 Y0 Z0 S100
G1 X10 Y10 Z0 S100
G1 X0 Y10 Z0 S50
G1 X0 Y0 Z0 S0
G0 Z5
G1 X5 Y5 Z5 S75
G1 X5 Y5 Z10 S100`;
};

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
};
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <h1>Open Source G-Code Viewer</h1>
        <span class="subtitle">Interactive 3D visualization and editing</span>
      </div>
      
      <div class="header-actions">
        <button @click="toggleTheme" class="action-btn theme-btn" :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
          <span v-if="theme === 'dark'">☀️</span>
          <span v-else>🌙</span>
          {{ theme === 'dark' ? 'Light' : 'Dark' }}
        </button>
        <button @click="triggerFileInput" class="action-btn load-btn">
          📁 Load File
        </button>
        <button @click="loadExample" class="action-btn example-btn">
          📝 Load Example
        </button>
        <a 
          href="https://gitlab.com/hahihula/vue-gcode-viewer" 
          target="_blank" 
          rel="noopener noreferrer"
          class="action-btn gitlab-btn"
        >
          <svg class="gitlab-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
          </svg>
          View Source
        </a>
      </div>
      
      <input 
        ref="fileInput" 
        type="file" 
        accept=".gcode,.nc,.txt,.cnc" 
        @change="handleFileUpload"
        style="display: none;"
      />
    </header>
    
    <GcodeViewer 
      v-model:gcode="gcode" 
      :tessellation="0.05"
      :theme="theme"
      class="viewer-container"
    />
  </div>
</template>

<style>
body { 
  margin: 0; 
  padding: 0; 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app { 
  height: 100vh; 
  width: 100vw; 
  max-width: 100vw; 
  margin: 0; 
  padding: 0; 
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
  color: white;
}

.subtitle {
  font-size: 0.85em;
  opacity: 0.9;
  font-weight: 300;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: inherit;
}

.load-btn {
  background: white;
  color: #667eea;
}

.load-btn:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.theme-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.theme-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.example-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.example-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.gitlab-btn {
  background: #fc6d26;
  color: white;
  font-weight: 600;
}

.gitlab-btn:hover {
  background: #e8590c;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(252, 109, 38, 0.3);
}

.gitlab-icon {
  width: 18px;
  height: 18px;
}

.viewer-container {
  flex: 1;
  overflow: hidden;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-left {
    text-align: center;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .app-header h1 {
    font-size: 1.2em;
  }
  
  .subtitle {
    font-size: 0.8em;
  }
  
  .action-btn {
    flex: 1;
    justify-content: center;
    min-width: 120px;
  }
}

@media (max-width: 480px) {
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>