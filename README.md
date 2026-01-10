
# MindSpark AI 🧠✨

An intelligent mind-mapping tool that transforms topics into interactive, hierarchical visualizations using Gemini (or OpenAI) and D3.js.

## 🚀 Features
- **AI-Powered Generation**: Instantly create complex maps from a single prompt.
- **Deep Exploration**: Double-click any node to expand it further using AI.
- **Native D3 Visualization**: High-performance, zoomable, and draggable canvas.
- **Multi-Provider**: Supports Google Gemini and OpenAI-compatible endpoints.
- **Export**: Save your mind maps as SVG or JSON.

## 🛠️ Deployment to GitHub Pages

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Ensure your API key is available. If using GitHub Actions for deployment, add it to your repository secrets.

3. **Build and Deploy**:
   ```bash
   npm run build
   ```
   The project is configured for static hosting. Simply point GitHub Pages to the `dist` folder.

## 📄 License
MIT
