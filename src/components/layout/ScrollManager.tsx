import { useEffect } from 'react';

export function ScrollManager() {
  useEffect(() => {
    // Reset any lingering scroll locks
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    document.body.style.width = '';
    
    // Ensure proper viewport meta tag
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
    
    // Add CSS overscroll behavior
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overscroll-behavior-y: none;
        -webkit-overflow-scrolling: touch;
        position: fixed;
        width: 100%;
        height: 100%;
      }
      #root {
        height: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.height = '';
      document.body.style.width = '';
    };
  }, []);
  
  return null;
} 