import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BlockData, BlockType, Point, CanvasState, Edge, HandleType, BlockCategory } from './types';
import { Block } from './components/Block';
import { Toolbar, ThemeId } from './components/Toolbar';
import { Intro } from './components/Intro'; 
import { Sidebar } from './components/Sidebar';
import { Menu } from './components/Icons';
import { generateBlockFromPrompt } from './services/geminiService';
import { LoginModal } from './components/LoginModal';
import { saveWorkspaceToCloud, subscribeToWorkspace } from './services/firebaseService';
import { useAuth } from './contexts/AuthContext';

const INITIAL_ZOOM = 1;

// -- Geometry Helpers --

function getControlPoints(p1: Point, p2: Point, h1: HandleType, h2: HandleType) {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const getOffset = (h: HandleType): Point => {
      switch(h) {
          case 'top': return { x: 0, y: -1 };
          case 'bottom': return { x: 0, y: 1 };
          case 'left': return { x: -1, y: 0 };
          case 'right': return { x: 1, y: 0 };
      }
  };
  const o1 = getOffset(h1);
  const o2 = getOffset(h2);
  const cpDist = Math.min(dist * 0.5, 150);
  return {
      cp1: { x: p1.x + o1.x * cpDist, y: p1.y + o1.y * cpDist },
      cp2: { x: p2.x + o2.x * cpDist, y: p2.y + o2.y * cpDist }
  };
}

function getPointOnBezier(t: number, p1: Point, cp1: Point, cp2: Point, p2: Point): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
        x: mt3 * p1.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p2.x,
        y: mt3 * p1.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p2.y
    };
}

function distance(p1: Point, p2: Point) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function getClosestPointOnBezier(point: Point, p1: Point, p2: Point, h1: HandleType, h2: HandleType): Point {
    const { cp1, cp2 } = getControlPoints(p1, p2, h1, h2);
    let minDist = Infinity;
    let bestPoint = p1;
    
    // Scan the bezier curve for the closest point
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = getPointOnBezier(t, p1, cp1, cp2, p2);
        const d = distance(point, p);
        if (d < minDist) {
            minDist = d;
            bestPoint = p;
        }
    }
    return bestPoint;
}

function isPointNearBezier(point: Point, p1: Point, p2: Point, h1: HandleType, h2: HandleType, threshold: number = 25): boolean {
    const { cp1, cp2 } = getControlPoints(p1, p2, h1, h2);
    const samples = 15;
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const p = getPointOnBezier(t, p1, cp1, cp2, p2);
        if (distance(point, p) < threshold) return true;
    }
    return false;
}

// Unified input helper
const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if ('clientX' in e) {
        return { x: e.clientX, y: e.clientY };
    }
    return { x: 0, y: 0 };
};

export default function App() {
  // -- State --
  const [showIntro, setShowIntro] = useState(true);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [history, setHistory] = useState<{blocks: BlockData[], edges: Edge[]}[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('lumina-dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [preventOverlap, setPreventOverlap] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Auth Context
  const { user, signOutUser, isGuest } = useAuth();

  // AI State
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null);

  // Refs for high-freq access in event handlers
  const blocksRef = useRef(blocks);
  const edgesRef = useRef(edges);
  
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // -- Initialization & Persistence --
  useEffect(() => {
    // 1. Load Local Data (always first for offline/speed)
    const savedData = localStorage.getItem('nukenote-data');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            setBlocks(parsed.blocks || []);
            setEdges(parsed.edges || []);
        } catch (e) {
            console.error('Failed to load save data', e);
        }
    }
  }, []);

  // -- Data Sync --
  
  // Save to Local + Cloud
  useEffect(() => {
    const saveData = { blocks, edges };
    localStorage.setItem('nukenote-data', JSON.stringify(saveData));
    
    // Save to Firestore if logged in AND not a guest
    if (user && !isGuest) {
        const timeout = setTimeout(() => {
            saveWorkspaceToCloud(user.uid, saveData);
        }, 1500); // 1.5s debounce
        return () => clearTimeout(timeout);
    }
  }, [blocks, edges, user, isGuest]);

  // Load from Cloud on Login
  useEffect(() => {
      if (user && !isGuest) {
          const unsubscribe = subscribeToWorkspace(user.uid, (data) => {
              if (data) {
                  // If cloud data exists, load it
                  setBlocks(data.blocks || []);
                  setEdges(data.edges || []);
              }
          });
          return () => unsubscribe();
      }
  }, [user, isGuest]);

  // -- Actions --

  const handleLogout = async () => {
      await signOutUser();
      handleClear(); // Optional: clear workspace for privacy on logout
  };

  const handleDeploy = () => {
      alert("Sharing feature coming soon!");
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ blocks, edges }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nukenote-backup-${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target?.result as string);
            if (parsed.blocks) setBlocks(parsed.blocks);
            if (parsed.edges) setEdges(parsed.edges);
            setIsSidebarOpen(false);
        } catch (err) {
            alert('Invalid file format');
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleClear = () => {
      setBlocks([]);
      setEdges([]);
      setHistory([]);
      setIsSidebarOpen(false);
  };

  // Connection State
  const [connecting, setConnecting] = useState<{fromId: string, fromHandle: HandleType, mousePos: Point} | null>(null);

  // Canvas Viewport State
  const [canvasState, setCanvasState] = useState<CanvasState>({
    scale: INITIAL_ZOOM,
    pan: { x: 0, y: 0 }
  });

  const [isPanning, setIsPanning] = useState(false);
  // Track if mouse moved during down-up cycle to distinguish click vs drag
  const hasMovedRef = useRef(false);
  const lastMousePos = useRef<Point>({ x: 0, y: 0 });
  const startMousePos = useRef<Point>({ x: 0, y: 0 });
  
  // Dragging State
  const [draggingBlock, setDraggingBlock] = useState<{id: string, startX: number, startY: number, initialBlockX: number, initialBlockY: number} | null>(null);

  // -- Effects --

  useEffect(() => {
    // Reset classes
    document.documentElement.classList.remove('dark', 'theme-lumina-light', 'theme-lumina-dark', 'theme-crimson', 'theme-slate', 'theme-contrast');
    
    // Add specific theme class
    document.documentElement.classList.add(`theme-${currentTheme}`);

    // Determine if it counts as 'dark mode' for base Tailwind classes
    const isLight = currentTheme === 'lumina-light';
    if (!isLight) {
        document.documentElement.classList.add('dark');
    }
  }, [currentTheme]);

  // -- Actions --

  const pushHistory = () => {
    setHistory(prev => [...prev.slice(-10), JSON.parse(JSON.stringify({ blocks, edges }))]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setBlocks(previous.blocks);
    setEdges(previous.edges);
    setHistory(prev => prev.slice(0, -1));
  };

  const addBlock = (type: BlockType, xOffset = 0, yOffset = 0) => {
    pushHistory();
    // If offsets provided (e.g. click), use them relative to viewport, else center
    let x, y;
    
    if (xOffset !== 0 || yOffset !== 0) {
        // xOffset/yOffset are raw client coords here for click-to-spawn
        x = (xOffset - canvasState.pan.x) / canvasState.scale;
        y = (yOffset - canvasState.pan.y) / canvasState.scale;
    } else {
        x = (-canvasState.pan.x + window.innerWidth / 2) / canvasState.scale - 100;
        y = (-canvasState.pan.y + window.innerHeight / 2) / canvasState.scale - 50;
    }

    let content: any = '';
    let w = 240;
    let h = 120;
    let title = 'Note';
    let category: BlockCategory | undefined;

    if (type === 'checklist') {
        content = [{id: '1', text: 'New Item', checked: false}];
        title = 'Checklist';
        h = 160;
    } else if (type === 'code') {
        content = '// Type your code here';
        title = 'Code Snippet';
        w = 300;
        h = 200;
        category = 'code';
    } else if (type === 'table') {
        content = {
            headers: ['DONE', 'TITLE', 'NOTES'],
            rows: [
                ['false', 'Cardio', '30 mins'],
                ['false', 'Weights', 'Leg day']
            ],
            columnTypes: ['checkbox', 'text', 'text']
        };
        title = 'Fitness Plan';
        category = 'fitness';
        w = 320;
        h = 220;
    } else if (type === 'image') {
        title = 'Image';
        h = 200;
    }

    if (xOffset !== 0) {
        x = x - w / 2;
        y = y - h / 2;
    }

    const newBlock: BlockData = {
      id: uuidv4(),
      type,
      x,
      y,
      w,
      h,
      content,
      title,
      category
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelection(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<BlockData>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    pushHistory();
    setBlocks(prev => prev.filter(b => b.id !== id));
    setEdges(prev => prev.filter(e => e.fromId !== id && e.toId !== id));
    if (selection === id) setSelection(null);
  };

  const deleteEdge = (id: string) => {
    pushHistory();
    setEdges(prev => prev.filter(e => e.id !== id));
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      pushHistory();
      const newBlock = {
        ...block,
        id: uuidv4(),
        x: block.x + 20,
        y: block.y + 20,
        title: block.title ? `${block.title} (Copy)` : undefined
      };
      setBlocks(prev => [...prev, newBlock]);
      setSelection(newBlock.id);
    }
  };

  const handleConnectStart = (id: string, handle: HandleType, e: React.MouseEvent | React.TouchEvent) => {
     const pos = getClientPos(e);
     const mouseX = (pos.x - canvasState.pan.x) / canvasState.scale;
     const mouseY = (pos.y - canvasState.pan.y) / canvasState.scale;
     setConnecting({ fromId: id, fromHandle: handle, mousePos: { x: mouseX, y: mouseY } });
  };

  const handleConnectEnd = (toId: string, toHandle: HandleType) => {
    if (connecting && connecting.fromId !== toId) {
       pushHistory();
       const newEdge: Edge = {
           id: uuidv4(),
           fromId: connecting.fromId,
           toId,
           fromHandle: connecting.fromHandle,
           toHandle
       };
       setEdges(prev => [...prev, newEdge]);
    }
    setConnecting(null);
  };

  const getHandlePosition = (blockId: string, handle: HandleType, currentBlocks: BlockData[]): Point | null => {
      const block = currentBlocks.find(b => b.id === blockId);
      if (!block) return null;
      switch (handle) {
          case 'top': return { x: block.x + block.w / 2, y: block.y };
          case 'bottom': return { x: block.x + block.w / 2, y: block.y + block.h };
          case 'left': return { x: block.x, y: block.y + block.h / 2 };
          case 'right': return { x: block.x + block.w, y: block.y + block.h / 2 };
      }
      return { x: block.x, y: block.y };
  };

  const getPathString = (p1: Point, p2: Point, h1: HandleType, h2: HandleType) => {
      const { cp1, cp2 } = getControlPoints(p1, p2, h1, h2);
      return `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
  };

  const handleAiSubmit = async (prompt: string) => {
    setAiLoading(true);
    const centerX = (-canvasState.pan.x + window.innerWidth / 2) / canvasState.scale;
    const centerY = (-canvasState.pan.y + window.innerHeight / 2) / canvasState.scale;

    const newBlock = await generateBlockFromPrompt(prompt, {x: centerX, y: centerY});
    if (newBlock) {
      pushHistory();
      setBlocks(prev => [...prev, newBlock]);
      setSelection(newBlock.id);
      setAiMode(false); 
    }
    setAiLoading(false);
  };

  // -- Canvas Interaction --

  const handleCanvasDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getClientPos(e);
    if ('button' in e && e.button !== 0 && e.button !== 1) return;
    if ('target' in e && e.target !== e.currentTarget) return;

    setIsPanning(true);
    lastMousePos.current = { x: pos.x, y: pos.y };
    startMousePos.current = { x: pos.x, y: pos.y };
    hasMovedRef.current = false;
    setSelection(null); 
  };

  const handleGlobalMove = useCallback((e: MouseEvent | TouchEvent) => {
    const pos = getClientPos(e);

    if (isPanning || draggingBlock) {
        hasMovedRef.current = true;
    }

    if (isPanning) {
      const dx = pos.x - lastMousePos.current.x;
      const dy = pos.y - lastMousePos.current.y;
      setCanvasState(prev => ({
        ...prev,
        pan: { x: prev.pan.x + dx, y: prev.pan.y + dy }
      }));
      lastMousePos.current = { x: pos.x, y: pos.y };
    }

    if (draggingBlock) {
        if(e.cancelable) e.preventDefault(); 

        const dx = (pos.x - draggingBlock.startX) / canvasState.scale;
        const dy = (pos.y - draggingBlock.startY) / canvasState.scale;
        
        let nextX = draggingBlock.initialBlockX + dx;
        let nextY = draggingBlock.initialBlockY + dy;
        
        if (preventOverlap) {
            const currentBlockData = blocksRef.current.find(b => b.id === draggingBlock.id);
            if (currentBlockData) {
                 const others = blocksRef.current.filter(b => b.id !== draggingBlock.id);
                 const { w, h } = currentBlockData;

                 const rectX = { x: nextX, y: currentBlockData.y, w, h };
                 const hitX = others.some(other => 
                    rectX.x < other.x + other.w &&
                    rectX.x + rectX.w > other.x &&
                    rectX.y < other.y + other.h &&
                    rectX.y + rectX.h > other.y
                 );
                 if (hitX) nextX = currentBlockData.x;

                 const rectY = { x: nextX, y: nextY, w, h };
                 const hitY = others.some(other => 
                    rectY.x < other.x + other.w &&
                    rectY.x + rectY.w > other.x &&
                    rectY.y < other.y + other.h &&
                    rectY.y + rectY.h > other.y
                 );
                 if (hitY) nextY = currentBlockData.y;
            }
        }

        updateBlock(draggingBlock.id, { x: nextX, y: nextY });

        const currentBlocks = blocksRef.current; 
        const currentEdges = edgesRef.current;
        const draggingBlockData = currentBlocks.find(b => b.id === draggingBlock.id);

        if (draggingBlockData) {
            const center = { 
                x: nextX + draggingBlockData.w / 2, 
                y: nextY + draggingBlockData.h / 2 
            };
            
            let foundEdgeId: string | null = null;
            
            for (const edge of currentEdges) {
                if (edge.fromId === draggingBlock.id || edge.toId === draggingBlock.id) continue;
                
                const p1 = getHandlePosition(edge.fromId, edge.fromHandle, currentBlocks);
                const p2 = getHandlePosition(edge.toId, edge.toHandle, currentBlocks);
                
                if (p1 && p2 && isPointNearBezier(center, p1, p2, edge.fromHandle, edge.toHandle, 40)) {
                    foundEdgeId = edge.id;
                    break;
                }
            }
            setHighlightedEdgeId(prev => prev !== foundEdgeId ? foundEdgeId : prev);
        }
    }

    if (connecting) {
        const mouseX = (pos.x - canvasState.pan.x) / canvasState.scale;
        const mouseY = (pos.y - canvasState.pan.y) / canvasState.scale;
        setConnecting(prev => prev ? { ...prev, mousePos: { x: mouseX, y: mouseY } } : null);
    }

  }, [isPanning, draggingBlock, connecting, canvasState, preventOverlap]);

  const handleGlobalUp = useCallback((e: MouseEvent | TouchEvent) => {
    const pos = getClientPos(e);

    if (isPanning && !hasMovedRef.current) {
        addBlock('text', pos.x, pos.y);
    }

    if (draggingBlock && highlightedEdgeId) {
        const edge = edgesRef.current.find(e => e.id === highlightedEdgeId);
        if (edge) {
            pushHistory();
            const draggingBlockObj = blocksRef.current.find(b => b.id === draggingBlock.id);
            
            if (draggingBlockObj) {
                const p1 = getHandlePosition(edge.fromId, edge.fromHandle, blocksRef.current);
                const p2 = getHandlePosition(edge.toId, edge.toHandle, blocksRef.current);
                
                if (p1 && p2) {
                     const currentCenter = {
                         x: draggingBlockObj.x + draggingBlockObj.w / 2,
                         y: draggingBlockObj.y + draggingBlockObj.h / 2
                     };
                     
                     const snapPoint = getClosestPointOnBezier(currentCenter, p1, p2, edge.fromHandle, edge.toHandle);
                     
                     const newBlockX = snapPoint.x - draggingBlockObj.w / 2;
                     const newBlockY = snapPoint.y - draggingBlockObj.h / 2;
                     
                     updateBlock(draggingBlock.id, { x: newBlockX, y: newBlockY });

                     let newInHandle: HandleType = 'left'; 
                     let newOutHandle: HandleType = 'right';

                     if (edge.fromHandle === 'bottom' || edge.toHandle === 'top') {
                        newInHandle = 'top';
                        newOutHandle = 'bottom';
                     } else if (edge.fromHandle === 'top' || edge.toHandle === 'bottom') {
                         newInHandle = 'bottom';
                         newOutHandle = 'top';
                     } else if (edge.fromHandle === 'right' || edge.toHandle === 'left') {
                         newInHandle = 'left';
                         newOutHandle = 'right';
                     }

                     const newEdge1: Edge = {
                        id: uuidv4(),
                        fromId: edge.fromId,
                        toId: draggingBlock.id,
                        fromHandle: edge.fromHandle,
                        toHandle: newInHandle
                    };
                    
                    const newEdge2: Edge = {
                        id: uuidv4(),
                        fromId: draggingBlock.id,
                        toId: edge.toId,
                        fromHandle: newOutHandle,
                        toHandle: edge.toHandle
                    };
                    
                    setEdges(prev => prev.filter(e => e.id !== edge.id).concat([newEdge1, newEdge2]));
                }
            }
            setHighlightedEdgeId(null);
        }
    }

    setIsPanning(false);
    setDraggingBlock(null);
    setHighlightedEdgeId(null); 
    if (connecting) {
        setConnecting(null);
    }
  }, [isPanning, connecting, canvasState, draggingBlock, highlightedEdgeId]); 

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [handleGlobalMove, handleGlobalUp]);

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.001; 
      const delta = -e.deltaY * zoomIntensity;
      const newScale = Math.min(Math.max(0.1, canvasState.scale * (1 + delta)), 5);
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const newPanX = mouseX - (mouseX - canvasState.pan.x) * (newScale / canvasState.scale);
      const newPanY = mouseY - (mouseY - canvasState.pan.y) * (newScale / canvasState.scale);

      setCanvasState({
          scale: newScale,
          pan: { x: newPanX, y: newPanY }
      });
  };

  const handleBlockDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
      const pos = getClientPos(e);
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.closest('button')) {
         setSelection(id);
         return;
      }

      if (target.closest('[data-drag-handle]')) {
          const block = blocks.find(b => b.id === id);
          if (block) {
              setDraggingBlock({
                  id,
                  startX: pos.x,
                  startY: pos.y,
                  initialBlockX: block.x,
                  initialBlockY: block.y
              });
              pushHistory(); 
          }
      }
      setSelection(id);
      e.stopPropagation(); 
  };

  return (
    <div 
        className="w-screen h-screen overflow-hidden flex flex-col relative select-none" 
        onWheel={handleWheel}
    >
      {showIntro && <Intro onComplete={() => setShowIntro(false)} />}
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

      <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
          currentTheme={currentTheme}
          setTheme={setCurrentTheme}
          onExport={handleExport}
          onImport={handleImport}
          onClear={handleClear}
          preventOverlap={preventOverlap}
          setPreventOverlap={setPreventOverlap}
          user={user}
          // The existence of config is now assumed in the code (it's hardcoded), but we could check service.
          isCloudConfigured={true} 
          onSetupCloud={() => setShowLoginModal(true)} // "Setup Cloud" becomes "Sign In" action essentially
          onLogin={() => setShowLoginModal(true)}
          onLogout={handleLogout}
          onDeploy={handleDeploy}
      />
      
      {/* Top Left Menu Trigger */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="absolute top-4 left-4 z-50 p-2.5 bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-transform active:scale-95"
      >
        <Menu className="w-5 h-5" />
      </button>

      <Toolbar 
        onAddBlock={(type) => addBlock(type, 0, 0)} 
        onUndo={handleUndo} 
        canUndo={history.length > 0} 
        onAiSubmit={handleAiSubmit}
        aiMode={aiMode}
        setAiMode={setAiMode}
        isLoading={aiLoading}
      />

      {/* Infinite Canvas */}
      <div 
        className={`flex-1 w-full h-full relative grid-bg transition-colors duration-300 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleCanvasDown}
        onTouchStart={handleCanvasDown}
      >
        <div 
          className="absolute origin-top-left will-change-transform"
          style={{
            transform: `translate(${canvasState.pan.x}px, ${canvasState.pan.y}px) scale(${canvasState.scale})`
          }}
        >
          {/* Edges Layer */}
          <svg className="absolute top-0 left-0 overflow-visible w-1 h-1 pointer-events-none" style={{ zIndex: 0 }}>
              <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" className="fill-gray-500 dark:fill-gray-400" />
                  </marker>
                  <marker id="arrowhead-highlight" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" className="fill-primary-500" />
                  </marker>
                  <marker id="arrowhead-delete" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" className="fill-red-500" />
                  </marker>
              </defs>
              {edges.map(edge => {
                  const p1 = getHandlePosition(edge.fromId, edge.fromHandle, blocks);
                  const p2 = getHandlePosition(edge.toId, edge.toHandle, blocks);
                  if (!p1 || !p2) return null;
                  
                  const isHighlighted = edge.id === highlightedEdgeId;
                  
                  return (
                      <g 
                        key={edge.id}
                        className="group cursor-pointer pointer-events-auto"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteEdge(edge.id);
                        }}
                      >
                          <path 
                              d={getPathString(p1, p2, edge.fromHandle, edge.toHandle)}
                              stroke="transparent"
                              strokeWidth="20"
                              fill="none"
                          />

                          {isHighlighted && (
                            <path 
                                d={getPathString(p1, p2, edge.fromHandle, edge.toHandle)}
                                stroke="rgba(139, 92, 246, 0.5)"
                                strokeWidth="8"
                                fill="none"
                                className="animate-pulse pointer-events-none"
                            />
                          )}
                          <path 
                            d={getPathString(p1, p2, edge.fromHandle, edge.toHandle)}
                            stroke={isHighlighted ? "#8b5cf6" : "#6b7280"}
                            strokeWidth={isHighlighted ? "3" : "2"}
                            fill="none"
                            markerEnd={isHighlighted ? "url(#arrowhead-highlight)" : "url(#arrowhead)"}
                            className="transition-colors duration-200 group-hover:stroke-red-500"
                          />
                      </g>
                  );
              })}
              {connecting && (() => {
                  const p1 = getHandlePosition(connecting.fromId, connecting.fromHandle, blocks);
                  if (!p1) return null;
                  return (
                      <path
                        d={`M ${p1.x} ${p1.y} L ${connecting.mousePos.x} ${connecting.mousePos.y}`}
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        fill="none"
                      />
                  );
              })()}
          </svg>

          {/* Blocks Layer */}
          {blocks.map(block => (
            <div 
              key={block.id} 
              onMouseDown={(e) => handleBlockDown(e, block.id)}
              onTouchStart={(e) => handleBlockDown(e, block.id)}
            >
                <Block
                    block={block}
                    isSelected={selection === block.id}
                    onUpdate={updateBlock}
                    onDelete={deleteBlock}
                    onDuplicate={duplicateBlock}
                    onSelect={setSelection}
                    onConnectStart={handleConnectStart}
                    onConnectEnd={handleConnectEnd}
                    scale={canvasState.scale}
                />
            </div>
          ))}
        </div>
        
        {blocks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-gray-300 dark:text-gray-800 mb-4 tracking-tight">Tap Anywhere to Create</h2>
                    <p className="text-gray-400 dark:text-gray-600">Drag to pan • Scroll to zoom</p>
                </div>
            </div>
        )}
      </div>

       <div className="fixed bottom-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-gray-500 border border-gray-200 dark:border-gray-700 pointer-events-none z-50">
           {Math.round(canvasState.scale * 100)}%
       </div>
    </div>
  );
}