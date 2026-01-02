// src/composables/useGcodeParser.js
import { ref, computed } from 'vue';
import * as THREE from 'three';

export function useGcodeParser() {
  const vertices = ref([]); // {x, y, z, type, color, laserIntensity}
  const errors = ref([]);   // { lineIndex, message }
  const stats = ref({ lines: 0, moves: 0, time: 0 });

  // Helper to convert G-code to JS Object
  const parseLine = (line) => {
    const data = {};
    // Matches letters followed by numbers (e.g., X10.5, S-100)
    const regex = /([A-Z])(-?\d+(\.\d+)?)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      data[match[1]] = parseFloat(match[1] === 'S' ? match[2] : match[2]); // Keep S as int usually, but float ok
    }
    return data;
  };

  // Helper: Generate color based on Laser Intensity (S)
  // Returns a THREE.Color
  const getLaserColor = (sVal) => {
    // Assume max S is 1000 or 255. Normalize 0 to 1.
    const intensity = Math.min(Math.max(sVal / 1000, 0), 1);
    // Base Red (0.5, 0, 0) -> Bright Red (1, 0, 0)
    const r = 0.5 + (0.5 * intensity);
    const g = 0;
    const b = 0;
    return new THREE.Color(r, g, b);
  };

  const processGcode = (gcode, tessellation = 0.05) => {
    const lines = gcode.split('\n');
    const newVertices = [];
    const newErrors = [];
    
    // Machine State
    let pos = { x: 0, y: 0, z: 0, e: 0, f: 1500, s: 0 };
    let offset = { x: 0, y: 0, z: 0 }; // G92 offsets
    let currentModal = { motion: 'G1', plane: 'G17', units: 'G21' }; // G21 is mm
    
    // Helpers for colors
    const colors = {
      travel: new THREE.Color(0xaaaaaa), // Gray for G0
      cut: new THREE.Color(0x0000ff),    // Blue for G1
      arc: new THREE.Color(0x00ff00),    // Green for G2/G3
      laser: new THREE.Color(0xff0000)   // Red base for Laser
    };

    lines.forEach((lineText, index) => {
      const cleanLine = lineText.split(';')[0].trim().toUpperCase(); // Remove comments
      if (!cleanLine) return;

      const cmd = parseLine(cleanLine);


      // Helper to calculate 3D distance
      const getDistance = (p1, p2) => {
        return Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + 
          Math.pow(p2.y - p1.y, 2) + 
          Math.pow(p2.z - p1.z, 2)
        );
      };

      // Helper to calculate duration (minutes -> seconds)
      // Time (s) = (Distance (mm) / Feedrate (mm/min)) * 60
      const getDuration = (dist, feed) => {
        if (dist === 0) return 0;
        const effectiveFeed = feed > 0 ? feed : 1500; // Fallback
        return (dist / effectiveFeed) * 60;
      };
      
      // Handle Errors (Unknown commands)
      // --- Error Detection ---
      let lineHasError = false;
      let errorMsg = "";

       // Check for G-Code commands without parameters (basic check)
      if ((cmd.G === 0 || cmd.G === 1 || cmd.G === 2 || cmd.G === 3) && 
          cmd.X === undefined && cmd.Y === undefined && cmd.Z === undefined && 
          cmd.I === undefined && cmd.J === undefined) {
         // It's a move command but nowhere to go.
         // Depending on strictness, this might be an error or just ignored.
         // We will ignore it for now, but log it if it's an Arc without radius.
      }

      // Arc validation (must have I/J or R)
      if ((cmd.G === 2 || cmd.G === 3) && cmd.I === undefined && cmd.J === undefined && cmd.R === undefined) {
          lineHasError = true;
          errorMsg = "Arc move missing I, J, or R parameters";
      }
      
      // State Changes
      // Update State
      if (cmd.G) currentModal.motion = `G${cmd.G}`;
      if (cmd.F) pos.f = cmd.F;
      if (cmd.S) pos.s = cmd.S;

      if (cmd.G === 92) {
        if (cmd.X !== undefined) offset.x = pos.x - cmd.X;
        if (cmd.Y !== undefined) offset.y = pos.y - cmd.Y;
        if (cmd.Z !== undefined) offset.z = pos.z - cmd.Z;
        return;
      }

      // Calculate Targets
      let targetX = (cmd.X !== undefined) ? cmd.X + offset.x : pos.x;
      let targetY = (cmd.Y !== undefined) ? cmd.Y + offset.y : pos.y;
      let targetZ = (cmd.Z !== undefined) ? cmd.Z + offset.z : pos.z;

      // --- Calculate Duration & Distances ---
      const dist = Math.sqrt(
        Math.pow(targetX - pos.x, 2) + 
        Math.pow(targetY - pos.y, 2) + 
        Math.pow(targetZ - pos.z, 2)
      );
      
      const isRapid = currentModal.motion === 'G0';
      const feed = isRapid ? 5000 : (pos.f > 0 ? pos.f : 1500);
      const duration = dist > 0 ? (dist / feed) * 60 : 0;

      // --- Determine Colors (Gradient Logic) ---
      // We calculate color at START and END of segment
      let startColor, endColor;

      if (isRapid) {
          startColor = colors.travel;
          endColor = colors.travel;
      } else if (pos.s > 0 || (cmd.S !== undefined && cmd.S > 0)) {
          // LASER LOGIC
          const startS = pos.s;
          const endS = (cmd.S !== undefined) ? cmd.S : pos.s;
          startColor = getLaserColor(startS);
          endColor = getLaserColor(endS);
      } else {
          // CUT/EXTRUDE LOGIC
          startColor = colors.cut;
          endColor = colors.cut;
      }

      // Push Vertex
      if (!lineHasError) {
          newVertices.push({
              start: { x: pos.x, y: pos.y, z: pos.z },
              end: { x: targetX, y: targetY, z: targetZ },
              startColor: startColor,
              endColor: endColor,
              distance: dist,
              duration: duration,
              lineIndex: index
          });
      } else {
          // Push error
          newErrors.push({ lineIndex: index, message: errorMsg });
      }
      // Update current Position
      pos.x = targetX; 
      pos.y = targetY; 
      pos.z = targetZ;

      // Generate Vertices
      if (currentModal.motion === 'G0') {
        const dist = getDistance(pos, {x: targetX, y: targetY, z: targetZ});
        // Use 5000mm/min default for G0 if F not set, or use a specific rapid feed
        const feed = 5000; 
        const duration = getDuration(dist, feed);
        // Rapid Move
        newVertices.push({
          start: { ...pos },
          end: { x: targetX, y: targetY, z: targetZ },
          type: 'travel',
          distance: dist,
          duration: duration,
          color: colors.travel,
          feed: pos.f || feed,
          lineIndex: index
        });
        pos.x = targetX; pos.y = targetY; pos.z = targetZ;
      } 
      else if (currentModal.motion === 'G1') {
        const dist = getDistance(pos, {x: targetX, y: targetY, z: targetZ});
        const isLaser = pos.s > 0;
        const duration = getDuration(dist, pos.f);
        newVertices.push({
          start: { ...pos },
          end: { x: targetX, y: targetY, z: targetZ },
          type: isLaser ? 'laser' : 'cut',
          distance: dist,
          duration: duration,
          color: isLaser ? colors.laser : colors.cut,
          laserIntensity: isLaser ? pos.s : 0,
          feed: pos.f > 0 ? pos.f : 500, // Fallback
          lineIndex: index
        });
        pos.x = targetX; pos.y = targetY; pos.z = targetZ;
      }
      else if (currentModal.motion === 'G2' || currentModal.motion === 'G3') {
        // Arc Move (Simplified: Assumes I,J form)
        // TODO: Implementing full Arc math. 
        // We will approximate with small lines (tessellation)
        
        const clockwise = currentModal.motion === 'G2';
        const centerX = pos.x + (cmd.I || 0);
        const centerY = pos.y + (cmd.J || 0);
        
        // Calculate start angle and end angle
        const startAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
        const endAngle = Math.atan2(targetY - centerY, targetX - centerX);
        const radius = Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2));

        // Simple interpolation (Needs better logic for full circles > 180deg, but works for MVP)
        // A robust implementation calculates angular difference and direction.
        let angle = startAngle;
        // Rough approximation for demo steps:
        const steps = Math.max(5, Math.floor(radius / tessellation)); 
        
        let currentX = pos.x;
        let currentY = pos.y;
        let currentZ = pos.z;
        
        for (let i = 0; i < steps; i++) {
            // This is a naive arc approximation. 
            // For production, use standard trig to step from startAngle to endAngle
            const nextAngle = startAngle + ((endAngle - startAngle) * (i + 1) / steps);
            const nextX = centerX + radius * Math.cos(nextAngle);
            const nextY = centerY + radius * Math.sin(nextAngle);
            // Z linear interp
            const nextZ = pos.z + (targetZ - pos.z) * (i + 1) / steps;

            const segmentDist = getDistance(
              {x: currentX, y: currentY, z: currentZ},
              {x: nextX, y: nextY, z: nextZ}
            );
            const segmentDuration = getDuration(segmentDist, pos.f);

             newVertices.push({
              start: { x: currentX, y: currentY, z: currentZ },
              end: { x: nextX, y: nextY, z: nextZ },
              type: 'arc',
              distance: segmentDist,
              duration: segmentDuration,
              color: colors.arc,
              feed: pos.f > 0 ? pos.f : 500,
              lineIndex: index
            });
            currentX = nextX; currentY = nextY; currentZ = nextZ;
        }
        pos.x = targetX; pos.y = targetY; pos.z = targetZ;
      }
    });

    let accumulatedTime = 0;
    newVertices.forEach(v => {
      v.startTime = accumulatedTime;
      accumulatedTime += v.duration;
    });

    vertices.value = newVertices;
    stats.value = { lines: lines.length, moves: newVertices.length };
    return { vertices: newVertices, errors: newErrors };
  };

  return { processGcode, vertices, errors, stats };
}