# Vue G-Code Viewer

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge&logo=gitlab)](https://hahihula.gitlab.io/vue-gcode-viewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?style=for-the-badge&logo=vue.js)](https://vuejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-latest-black?style=for-the-badge&logo=three.js)](https://threejs.org/)

An interactive, open-source G-Code viewer and editor built with Vue 3, Three.js, and CodeMirror. Visualize, edit, and simulate CNC toolpaths directly in your browser with real-time 3D rendering.

![G-Code Viewer Screenshot](https://via.placeholder.com/800x450.png?text=Add+Screenshot+Here)

## ✨ Features

- 🎨 **Interactive 3D Visualization** - Real-time rendering of G-Code toolpaths with Three.js
- ✏️ **Built-in Code Editor** - Syntax highlighting and live editing with CodeMirror
- ▶️ **Playback Controls** - Step through, play, pause, and control simulation speed
- 🎯 **Click-to-Navigate** - Click any line in the editor to jump to that position in 3D
- 🌓 **Dark/Light Theme** - Beautiful themes for comfortable viewing
- 📁 **File Support** - Load `.gcode`, `.nc`, `.txt`, and `.cnc` files
- 🔄 **Live Reload** - Automatic detection of code changes with reload prompt
- 📊 **Color-Coded Paths** - Spindle speed visualization with color gradients
- 🚀 **Zero Dependencies Installation** - Works standalone or integrates into existing Vue projects
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## 🚀 Quick Start - Live Demo

**Try it now without installation!**

👉 **[Open Live Demo](https://hahihula.gitlab.io/vue-gcode-viewer)** 👈

The live demo runs on GitLab Pages and includes:
- Sample G-Code to get started
- File upload functionality
- Full editing and visualization capabilities
- No backend required - everything runs in your browser!

## 📦 Installation

### Using in Your Vue 3 Project

#### 1. Install Dependencies

```bash
npm install three three-stdlib codemirror @codemirror/state @codemirror/view
```

#### 2. Copy Component Files

Copy the following files to your project:

```
src/
├── components/
│   └── GcodeViewer.vue
└── composables/
    └── useGcodeParser.js
```

#### 3. Use in Your Component

```vue
<script setup>
import { ref } from 'vue';
import GcodeViewer from './components/GcodeViewer.vue';

const gcode = ref(`G90
G21
G1 X10 Y10 Z5 F1000
G1 X20 Y20 Z10 F1500`);

const theme = ref('dark'); // or 'light'
</script>

<template>
  <GcodeViewer 
    v-model:gcode="gcode"
    :theme="theme"
    :tessellation="0.05"
  />
</template>
```

## 🎮 Component API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gcode` | String | `''` | G-Code content (use with `v-model:gcode`) |
| `theme` | String | `'dark'` | UI theme: `'dark'` or `'light'` |
| `tessellation` | Number | `0.05` | Arc tessellation quality (lower = smoother curves) |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:gcode` | String | Emitted when G-Code is edited |

### Example with All Options

```vue
<template>
  <GcodeViewer 
    v-model:gcode="myGcode"
    :theme="currentTheme"
    :tessellation="0.02"
    @update:gcode="handleGcodeChange"
    style="height: 600px;"
  />
</template>

<script setup>
import { ref } from 'vue';
import GcodeViewer from './components/GcodeViewer.vue';

const myGcode = ref('');
const currentTheme = ref('dark');

const handleGcodeChange = (newCode) => {
  console.log('G-Code updated:', newCode);
};
</script>
```

## 🎯 Supported G-Code Commands

The viewer currently supports the most common G-Code commands:

- **G0/G1** - Linear moves (rapid/feed)
- **G2/G3** - Arc moves (clockwise/counter-clockwise)
- **G17/G18/G19** - Plane selection (XY/XZ/YZ)
- **G20/G21** - Units (inches/millimeters)
- **G90/G91** - Positioning mode (absolute/relative)
- **S** parameter - Spindle speed (visualized as color)
- **F** parameter - Feed rate

Comments (`;` and parentheses) are supported and ignored during parsing.

## 🛠️ Development

### Prerequisites

- Node.js 16+ and npm
- Vue 3 project setup

### Local Development

1. Clone the repository:
```bash
git clone https://gitlab.com/hahihula/vue-gcode-viewer.git
cd vue-gcode-viewer
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Project Structure

```
vue-gcode-viewer/
├── src/
│   ├── components/
│   │   └── GcodeViewer.vue       # Main viewer component
│   ├── composables/
│   │   └── useGcodeParser.js     # G-Code parsing logic
│   └── App.vue                   # Demo application
├── public/
├── package.json
└── README.md
```

## 🎨 Customization

### Theming

The component supports both dark and light themes. You can switch themes dynamically:

```vue
<script setup>
import { ref } from 'vue';

const theme = ref('dark');

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
};
</script>

<template>
  <button @click="toggleTheme">Toggle Theme</button>
  <GcodeViewer :theme="theme" v-model:gcode="gcode" />
</template>
```

### Adjusting Arc Quality

Control the smoothness of arc rendering with the `tessellation` prop:

```vue
<!-- Smoother arcs (more vertices, slower) -->
<GcodeViewer :tessellation="0.01" v-model:gcode="gcode" />

<!-- Faster rendering (fewer vertices, more angular) -->
<GcodeViewer :tessellation="0.1" v-model:gcode="gcode" />
```

## 🤝 Contributing

We love contributions! Whether it's bug fixes, new features, or documentation improvements, all contributions are welcome.

### How to Contribute

1. **Fork the repository** on GitLab
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Merge Request** on GitLab

### Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://gitlab.com/hahihula/vue-gcode-viewer/-/issues/new) on GitLab!

When reporting bugs, please include:
- Your browser and version
- Steps to reproduce the issue
- Sample G-Code that demonstrates the problem (if applicable)
- Screenshots or error messages

### Development Guidelines

- Follow Vue 3 composition API best practices
- Write clear, commented code
- Test your changes with various G-Code files
- Update documentation for new features
- Keep dependencies minimal and up-to-date

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 vue-gcode-viewer contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 🙏 Acknowledgments

Built with these amazing open-source projects:

- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [Three.js](https://threejs.org/) - 3D graphics library
- [CodeMirror 6](https://codemirror.net/) - Code editor component
- [three-stdlib](https://github.com/pmndrs/three-stdlib) - Three.js utilities

## 📚 Resources

- **Live Demo**: https://hahihula.gitlab.io/vue-gcode-viewer
- **Repository**: https://gitlab.com/hahihula/vue-gcode-viewer
- **Issues**: https://gitlab.com/hahihula/vue-gcode-viewer/-/issues
- **Merge Requests**: https://gitlab.com/hahihula/vue-gcode-viewer/-/merge_requests

## 🗺️ Roadmap

Future features we're considering:

- [ ] Export simulation as video/GIF
- [ ] Multi-file project support
- [ ] Tool change visualization
- [ ] Measurement tools
- [ ] Custom color schemes
- [ ] Performance optimizations for large files
- [ ] Additional G-Code dialect support
- [ ] 3D printing specific features (layer visualization)

Have an idea? [Open an issue](https://gitlab.com/hahihula/vue-gcode-viewer/-/issues/new) and let's discuss it!

## 💬 Support

- 📧 For questions and discussions, use [GitLab Issues](https://gitlab.com/hahihula/vue-gcode-viewer/-/issues)
- 🐛 For bug reports, [create a new issue](https://gitlab.com/hahihula/vue-gcode-viewer/-/issues/new)
- 💡 For feature requests, [open an issue](https://gitlab.com/hahihula/vue-gcode-viewer/-/issues/new) with the `enhancement` label

---

<p align="center">
  Made with ❤️ by the open-source community
</p>

<p align="center">
  <a href="https://gitlab.com/hahihula/vue-gcode-viewer">⭐ Star this project on GitLab</a>
</p>