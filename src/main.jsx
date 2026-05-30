import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  });
}

function showFatalError(msg) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7A2E2E;color:white;padding:16px;font-family:monospace;font-size:13px;white-space:pre-wrap;max-height:50vh;overflow:auto';
  div.textContent = 'ERROR CAPTURADO:\n' + msg;
  document.body.appendChild(div);
}

window.addEventListener('error', (e) => {
  showFatalError((e.message || 'error') + '\n' + (e.filename || '') + ':' + (e.lineno || '') + '\n' + (e.error?.stack || ''));
});

window.addEventListener('unhandledrejection', (e) => {
  showFatalError('PROMESA RECHAZADA:\n' + (e.reason?.message || e.reason || 'unknown') + '\n' + (e.reason?.stack || ''));
});

class RootErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('Root boundary caught:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', background: '#7A2E2E', color: 'white', minHeight: '100vh' }}>
          <h2 style={{ marginBottom: 12 }}>ERROR CAPTURADO POR BOUNDARY</h2>
          <p style={{ marginBottom: 8 }}>{this.state.error?.message}</p>
          <pre style={{ fontSize: 11, textAlign: 'left', overflow: 'auto', maxHeight: '40vh', background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 4 }}>
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'white', color: '#7A2E2E', cursor: 'pointer', fontSize: 15 }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
