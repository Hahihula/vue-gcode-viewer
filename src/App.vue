<script setup>
import { ref } from 'vue';
import GcodeViewer from './components/GcodeViewer.vue';

const gcode = ref(`; Simple Demo
G21 ; Set to mm
G90 ; Absolute positioning
G0 X0 Y0 Z5
G1 Z0 F1000
; Draw a square
G1 X10 Y10 S500
G1 X20 Y10 S1000
G1 X20 Y20
G1 X10 Y20
G1 X10 Y10
; Lift and move home
G0 Z5
G0 X0 Y0`);
</script>

<template>
  <div style="height: 100vh; display: flex; flex-direction: column;">
    <h1 style="margin: 0; padding: 10px; background: #fff; border-bottom: 1px solid #ccc;">
      Open Source G-Code Viewer
    </h1>
    <GcodeViewer 
      v-model:gcode="gcode" 
      :tessellation="0.05"
      style="flex: 1;" 
    />
  </div>
</template>

<style>
body { margin: 0; padding: 0; font-family: sans-serif; }
h1 { font-size: 1.5em; color: #333; }
#app { height: 100vh; width: 100vw; max-width: 100vw; margin: 0xp; padding: 0; }
</style>