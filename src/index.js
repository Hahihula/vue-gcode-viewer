import GcodeViewer from './components/GcodeViewer.vue'

// Export the component
export { GcodeViewer }

// Export for use with app.use()
export default {
  install(app) {
    app.component('GcodeViewer', GcodeViewer)
  }
}