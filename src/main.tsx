import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA (only on web)
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

// Log platform for debugging
console.log('[App] Platform:', Capacitor.getPlatform(), 'Native:', Capacitor.isNativePlatform());

createRoot(document.getElementById("root")!).render(<App />);

