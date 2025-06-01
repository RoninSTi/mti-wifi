'use client';

import React, { useState, useRef, useCallback } from 'react';
import { HierarchicalSidenav } from './HierarchicalSidenav';

interface ResizablePanelProps {
  children: React.ReactNode;
}

export const ResizablePanel = ({ children }: ResizablePanelProps) => {
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 256px (w-64)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = mouseMoveEvent.clientX;
        // Set min width of 200px and max width of 500px
        if (newWidth >= 200 && newWidth <= 500) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  // Attach global mouse events for smooth dragging
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <>
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="border-r bg-muted/20 h-full overflow-hidden"
        style={{ width: `${sidebarWidth}px` }}
      >
        <HierarchicalSidenav />
      </div>

      {/* Resizer */}
      <div
        className="w-1 cursor-col-resize bg-border hover:bg-border/80 transition-colors flex-shrink-0"
        onMouseDown={startResizing}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </>
  );
};
