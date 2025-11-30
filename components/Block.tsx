import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BlockData, ChecklistItem, HandleType, TableContent } from '../types';
import { Trash, Copy, Sparkles, Move, Plus, Dumbbell, Book, Type, Code as CodeIcon, TableIcon, BoldIcon, ItalicIcon, UnderlineIcon, LinkIcon, XIcon, Undo } from './Icons';
import { improveText } from '../services/geminiService';

interface BlockProps {
  block: BlockData;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<BlockData>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSelect: (id: string) => void;
  onConnectStart: (id: string, handle: HandleType, e: React.MouseEvent | React.TouchEvent) => void;
  onConnectEnd: (id: string, handle: HandleType) => void;
  scale: number;
}

// -- Helpers --
const stripHtmlStyles = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const elements = div.querySelectorAll('*');
    elements.forEach(el => {
        // Keep only structural tags, remove styling attributes
        el.removeAttribute('style');
        el.removeAttribute('class');
        el.removeAttribute('color');
        el.removeAttribute('bgcolor');
    });
    return div.innerHTML;
};

// -- Rich Text Editor --

const RichTextEditor = ({ 
    initialValue, 
    onChange, 
    onAiQuery,
    className, 
    placeholder,
    isSelected 
}: { 
    initialValue: string, 
    onChange: (val: string) => void, 
    onAiQuery: (text: string, action: 'summarize' | 'polish' | 'expand') => Promise<string>,
    className?: string, 
    placeholder?: string,
    isSelected: boolean
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [toolbarState, setToolbarState] = useState<{show: boolean, x: number, y: number} | null>(null);
    const [mode, setMode] = useState<'format' | 'link' | 'ai'>('format');
    const [linkUrl, setLinkUrl] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const selectionRange = useRef<Range | null>(null);

    // Sync content from props
    useEffect(() => {
        if (editorRef.current) {
             const isFocused = document.activeElement === editorRef.current;
             const currentContent = editorRef.current.innerHTML;
             
             if (!isFocused || currentContent !== initialValue) {
                 if (currentContent !== initialValue) {
                    editorRef.current.innerHTML = initialValue;
                 }
             }
        }
    }, [initialValue]);

    // Update toolbar position logic
    const updateToolbarPosition = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            setToolbarState(null);
            setMode('format');
            return;
        }

        const range = selection.getRangeAt(0);
        const container = editorRef.current;
        
        if (container && container.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect();
            
            if (rect.width > 0 && rect.height > 0) {
                 setToolbarState({
                    show: true,
                    x: rect.left + (rect.width / 2),
                    y: rect.top - 10 
                });
                selectionRange.current = range.cloneRange();
            } else {
                setToolbarState(null);
            }
        } else {
            if (toolbarRef.current && !toolbarRef.current.contains(range.commonAncestorContainer)) {
                 setToolbarState(null);
            }
        }
    };

    useEffect(() => {
        const handleSelectionChange = () => {
            if (toolbarRef.current && toolbarRef.current.contains(document.activeElement)) return;
            updateToolbarPosition();
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        window.addEventListener('resize', () => setToolbarState(null));
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('resize', () => setToolbarState(null));
        };
    }, []);

    const restoreSelection = () => {
        const selection = window.getSelection();
        if (selectionRange.current) {
            selection?.removeAllRanges();
            selection?.addRange(selectionRange.current);
        }
    };

    const handleFormat = (command: string, value: string | undefined = undefined) => {
        restoreSelection();
        document.execCommand(command, false, value);
        if (editorRef.current) onChange(editorRef.current.innerHTML);
        requestAnimationFrame(updateToolbarPosition);
    };

    const handleAddLink = () => {
        if (linkUrl) {
            handleFormat('createLink', linkUrl);
            setMode('format');
            setLinkUrl('');
            setToolbarState(null); 
        }
    };

    const handleAiAction = async (action: 'summarize' | 'polish' | 'expand') => {
        restoreSelection();
        const selection = window.getSelection();
        const selectedText = selection?.toString();
        
        if (selectedText) {
            setAiLoading(true);
            const newText = await onAiQuery(selectedText, action);
            setAiLoading(false);
            
            // Replace selection with new text
            restoreSelection();
            document.execCommand('insertHTML', false, newText);
            if (editorRef.current) onChange(editorRef.current.innerHTML);
            setToolbarState(null);
        }
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
        updateToolbarPosition();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const html = e.clipboardData.getData('text/html');
        
        // Prefer HTML but strip bad styles, fallback to text
        const content = html ? stripHtmlStyles(html) : text;
        
        document.execCommand('insertHTML', false, content);
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const handleLinkClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link && !e.ctrlKey && !e.metaKey) {
             window.open(link.href, '_blank');
        }
    };

    return (
        <>
            <div
                ref={editorRef}
                contentEditable
                className={`w-full h-full bg-transparent outline-none p-3 block-content overflow-y-auto cursor-text 
                    text-gray-900 dark:text-gray-100
                    [&_a]:!text-blue-500 dark:[&_a]:!text-blue-400 [&_a]:underline [&_a]:cursor-pointer 
                    [&_b]:font-bold [&_i]:italic [&_u]:underline
                    [&_*]:!bg-transparent 
                    [&_*]:!text-inherit
                    empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400`}
                onInput={handleInput}
                onPaste={handlePaste}
                onClick={handleLinkClick}
                onScroll={() => setToolbarState(null)}
                data-placeholder={placeholder}
                style={{ minHeight: '100px' }} 
            />
            
            {/* Floating Toolbar Portal */}
            {toolbarState && toolbarState.show && createPortal(
                <div 
                    ref={toolbarRef}
                    style={{ 
                        position: 'fixed',
                        left: toolbarState.x, 
                        top: toolbarState.y, 
                        transform: 'translate(-50%, -100%)',
                        zIndex: 9999,
                        pointerEvents: 'auto'
                    }}
                    onMouseDown={(e) => {
                        if ((e.target as HTMLElement).tagName !== 'INPUT') {
                            e.preventDefault();
                        }
                    }}
                >
                    <div className="flex flex-col items-center animate-pop-in origin-bottom">
                        <div className="bg-gray-900 text-white rounded-lg shadow-xl flex items-center p-1 gap-1 mb-2 border border-gray-700 select-none">
                            
                            {mode === 'format' && (
                                <>
                                    <button onClick={() => handleFormat('bold')} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Bold"><BoldIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleFormat('italic')} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Italic"><ItalicIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleFormat('underline')} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Underline"><UnderlineIcon className="w-4 h-4" /></button>
                                    <div className="w-px h-4 bg-gray-700 mx-1"/>
                                    <button onClick={() => setMode('link')} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
                                    <div className="w-px h-4 bg-gray-700 mx-1"/>
                                    <button onClick={() => setMode('ai')} className="p-1.5 hover:bg-primary-900/50 text-primary-400 rounded transition-colors" title="AI Actions"><Sparkles className="w-4 h-4" /></button>
                                </>
                            )}

                            {mode === 'link' && (
                                <div className="flex items-center gap-2 px-1">
                                    <input 
                                        type="text" 
                                        className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1 outline-none text-white w-48 placeholder-gray-500"
                                        placeholder="Paste URL..."
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault(); 
                                                handleAddLink();
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <button onClick={handleAddLink} className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded font-medium">Link</button>
                                    <button onClick={() => setMode('format')} className="p-1 hover:bg-gray-700 rounded"><XIcon className="w-3 h-3" /></button>
                                </div>
                            )}

                            {mode === 'ai' && (
                                <div className="flex items-center gap-1">
                                    {aiLoading ? (
                                        <div className="px-3 py-1 text-xs text-primary-400 flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 animate-spin" /> Thinking...
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => handleAiAction('polish')} className="px-2 py-1 text-xs hover:bg-gray-700 rounded transition-colors">Polish</button>
                                            <button onClick={() => handleAiAction('summarize')} className="px-2 py-1 text-xs hover:bg-gray-700 rounded transition-colors">Summarize</button>
                                            <button onClick={() => handleAiAction('expand')} className="px-2 py-1 text-xs hover:bg-gray-700 rounded transition-colors">Expand</button>
                                            <div className="w-px h-4 bg-gray-700 mx-1"/>
                                            <button onClick={() => setMode('format')} className="p-1 hover:bg-gray-700 rounded text-gray-400"><Undo className="w-3 h-3" /></button>
                                        </>
                                    )}
                                </div>
                            )}

                        </div>
                        {/* Tiny arrow */}
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

// -- AutoResizeTextarea (Used for Table) --

const AutoResizeTextarea = ({ 
  value, 
  onChange, 
  className, 
  placeholder 
}: { 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, 
  className?: string, 
  placeholder?: string 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      spellCheck={false}
      style={{ resize: 'none', overflow: 'hidden' }} 
    />
  );
};

export const Block: React.FC<BlockProps> = ({
  block,
  isSelected,
  onUpdate,
  onDelete,
  onDuplicate,
  onSelect,
  onConnectStart,
  onConnectEnd,
  scale
}) => {
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
      if (titleRef.current) {
          titleRef.current.style.height = 'auto';
          // Cap height at roughly 2 lines (~44px based on line-height)
          const newHeight = Math.min(titleRef.current.scrollHeight, 44); 
          titleRef.current.style.height = `${newHeight}px`;
      }
  }, [block.title]);

  // -- Helpers --
  const getCategoryIcon = () => {
    if (block.category === 'fitness') return <Dumbbell className="w-4 h-4 text-orange-500" />;
    if (block.category === 'study') return <Book className="w-4 h-4 text-blue-500" />;
    if (block.category === 'code') return <CodeIcon className="w-4 h-4 text-green-500" />;
    
    const lowerTitle = (block.title || '').toLowerCase();
    if (lowerTitle.includes('fit') || lowerTitle.includes('gym') || lowerTitle.includes('workout')) 
        return <Dumbbell className="w-4 h-4 text-orange-500" />;
    if (lowerTitle.includes('study') || lowerTitle.includes('book') || lowerTitle.includes('read')) 
        return <Book className="w-4 h-4 text-blue-500" />;
    if (block.type === 'table') return <TableIcon className="w-4 h-4 text-primary-500" />;

    return <Type className="w-4 h-4 text-gray-400" />;
  };

  // -- Content Renderers --
  const handleChecklistToggle = (itemId: string) => {
    if (Array.isArray(block.content)) {
      const newContent = (block.content as ChecklistItem[]).map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      onUpdate(block.id, { content: newContent });
    }
  };

  const handleChecklistAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const target = e.currentTarget;
      if (target.value.trim() && Array.isArray(block.content)) {
         const newItem: ChecklistItem = {
             id: Math.random().toString(36).substr(2, 9),
             text: target.value,
             checked: false
         };
         onUpdate(block.id, { content: [...(block.content as ChecklistItem[]), newItem] });
         target.value = '';
      }
    }
  };

  const handleAiQuery = async (text: string, action: 'summarize' | 'polish' | 'expand') => {
    let prompt = "";
    switch(action) {
      case 'summarize': prompt = "Summarize this selection concisely. Return result as HTML fragment (using <b>, <i> if needed)."; break;
      case 'polish': prompt = "Fix grammar and improve tone. Return result as HTML fragment."; break;
      case 'expand': prompt = "Expand on this idea. Return result as HTML fragment."; break;
    }
    return await improveText(text, prompt);
  };

  // -- Table Logic --
  const updateTableCell = (rowIndex: number, colIndex: number, value: string, isHeader: boolean = false) => {
      const tableData = block.content as TableContent;
      if (isHeader) {
          const newHeaders = [...tableData.headers];
          newHeaders[colIndex] = value;
          onUpdate(block.id, { content: { ...tableData, headers: newHeaders } });
      } else {
          const newRows = [...tableData.rows];
          newRows[rowIndex] = [...newRows[rowIndex]];
          newRows[rowIndex][colIndex] = value;
          onUpdate(block.id, { content: { ...tableData, rows: newRows } });
      }
  };

  const addTableRow = () => {
      const tableData = block.content as TableContent;
      const newRow = new Array(tableData.headers.length).fill('');
      onUpdate(block.id, { content: { ...tableData, rows: [...tableData.rows, newRow] } });
  };

  const addTableCol = () => {
      const tableData = block.content as TableContent;
      const newHeaders = [...tableData.headers, 'NEW'];
      const newRows = tableData.rows.map(row => [...row, '']);
      const newColTypes = tableData.columnTypes ? [...tableData.columnTypes, 'text'] : undefined; 
      onUpdate(block.id, { content: { ...tableData, headers: newHeaders, rows: newRows, columnTypes: newColTypes as any } });
  };

  const toggleTableCheckbox = (rowIndex: number, colIndex: number) => {
       const tableData = block.content as TableContent;
       const currentRowVal = tableData.rows[rowIndex][colIndex];
       const newVal = currentRowVal === 'true' ? 'false' : 'true';
       updateTableCell(rowIndex, colIndex, newVal);
  };

  const renderContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <RichTextEditor
            isSelected={isSelected}
            initialValue={block.content as string}
            onChange={(newContent) => onUpdate(block.id, { content: newContent })}
            onAiQuery={handleAiQuery}
            placeholder="Start typing or paste from Wikipedia..."
          />
        );
      case 'code':
        return (
          <div className="w-full h-full flex flex-col">
            <div className="bg-gray-900 text-xs text-gray-400 px-3 py-1.5 rounded-t-md font-mono select-none flex justify-between items-center">
              <span>Code</span>
              <span className="text-[10px] opacity-50">JS/TS/PY</span>
            </div>
            <textarea
              className="w-full flex-1 bg-gray-800 text-green-400 p-3 font-mono text-sm resize-none outline-none block-content"
              value={block.content as string}
              onChange={(e) => onUpdate(block.id, { content: e.target.value })}
              spellCheck={false}
            />
          </div>
        );
      case 'checklist':
        return (
          <div className="w-full h-full overflow-y-auto p-3 block-content">
            {(block.content as ChecklistItem[]).map((item) => (
              <div key={item.id} className="flex items-center gap-3 mb-2 group">
                <button
                  onClick={() => handleChecklistToggle(item.id)}
                  className={`w-5 h-5 border rounded-md flex items-center justify-center transition-all ${
                    item.checked ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-400 hover:border-primary-400'
                  }`}
                >
                  {item.checked && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeWidth="3"/></svg>}
                </button>
                <input
                   className={`bg-transparent w-full outline-none transition-all ${item.checked ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}
                   value={item.text}
                   onChange={(e) => {
                     const newContent = (block.content as ChecklistItem[]).map(i => i.id === item.id ? {...i, text: e.target.value} : i);
                     onUpdate(block.id, { content: newContent });
                   }}
                />
                <button
                  onClick={() => {
                     const newContent = (block.content as ChecklistItem[]).filter(i => i.id !== item.id);
                     onUpdate(block.id, { content: newContent });
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <Trash className="w-3.5 h-3.5"/>
                </button>
              </div>
            ))}
             <input
              className="bg-transparent border-b border-dashed border-gray-300 dark:border-gray-700 w-full outline-none text-sm text-gray-500 mt-2 placeholder-gray-400 py-1"
              placeholder="+ Add item"
              onKeyDown={handleChecklistAdd}
            />
          </div>
        );
      case 'image':
         return (
             <div className="w-full h-full relative group flex items-center justify-center overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 block-content">
                 {(block.content as string) ? (
                     <img src={block.content as string} alt="Block content" className="w-full h-full object-cover pointer-events-none" />
                 ) : (
                     <div className="text-center p-4">
                         <p className="text-xs text-gray-500 mb-2">Enter Image URL</p>
                         <input
                            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs"
                            placeholder="https://..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onUpdate(block.id, { content: e.currentTarget.value });
                                }
                            }}
                         />
                     </div>
                 )}
             </div>
         )
      case 'table':
        const tableData = block.content as TableContent;
        // Default column types if not provided
        const colTypes = tableData.columnTypes || new Array(tableData.headers.length).fill('text');
        
        return (
            <div className="w-full h-full overflow-hidden flex flex-col block-content">
                {/* Dark Header Row */}
                <div className="flex w-full bg-black/5 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                    {tableData.headers.map((header, idx) => (
                         <div key={idx} className={`flex-1 min-w-[50px] border-r border-gray-300 dark:border-gray-700 last:border-r-0 relative group/col ${idx === 0 && colTypes[idx] === 'checkbox' ? 'max-w-[50px]' : ''}`}>
                            <input 
                                className="w-full bg-transparent outline-none font-bold text-[10px] tracking-wider text-gray-500 dark:text-gray-400 uppercase py-2 px-2 text-left"
                                value={header}
                                onChange={(e) => updateTableCell(0, idx, e.target.value, true)}
                            />
                        </div>
                    ))}
                </div>
                
                {/* Table Body */}
                <div className="overflow-auto flex-1 custom-scrollbar">
                    {tableData.rows.map((row, rIdx) => (
                        <div key={rIdx} className="flex w-full border-b border-gray-200 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                            {row.map((cell, cIdx) => {
                                const isCheckbox = colTypes[cIdx] === 'checkbox';
                                return (
                                    <div key={cIdx} className={`flex-1 min-w-[50px] border-r border-gray-200 dark:border-gray-800/50 last:border-r-0 flex items-start ${isCheckbox ? 'justify-center max-w-[50px]' : ''}`}>
                                        {isCheckbox ? (
                                            <button 
                                                onClick={() => toggleTableCheckbox(rIdx, cIdx)}
                                                className={`w-4 h-4 mt-2.5 rounded-full border border-gray-400 dark:border-gray-600 flex items-center justify-center transition-all ${cell === 'true' ? 'bg-blue-500 border-blue-500' : 'hover:border-blue-400'}`}
                                            >
                                                {cell === 'true' && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                            </button>
                                        ) : (
                                            <AutoResizeTextarea
                                                className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200 py-2 px-2"
                                                value={cell}
                                                onChange={(e) => updateTableCell(rIdx, cIdx, e.target.value)}
                                                placeholder=""
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
                
                {/* Footer Actions */}
                 <div className="flex gap-2 p-2 border-t border-gray-200 dark:border-gray-800">
                    <button onClick={addTableRow} className="text-[10px] px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <Plus className="w-3 h-3"/> Row
                    </button>
                    {/* Only allow adding generic columns via button for now */}
                    <button onClick={addTableCol} className="text-[10px] px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-1 text-gray-600 dark:text-gray-300">
                         <Plus className="w-3 h-3"/> Col
                    </button>
                </div>
            </div>
        )
      default:
        return null;
    }
  };

  // -- Interaction Handlers --

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, direction: 'se' | 'sw' | 'ne' | 'nw') => {
    e.stopPropagation();
    // Don't prevent default on touch, otherwise panning might get weird, but actually we do want to prevent default for resize
    if(e.cancelable) e.preventDefault(); 
    
    // Unified point extraction
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const startX = clientX;
    const startY = clientY;
    const startW = block.w;
    const startH = block.h;
    const startBlockX = block.x;
    const startBlockY = block.y;
    const minW = 150;
    const minH = 100;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const moveY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;

      const deltaX = (moveX - startX) / scale;
      const deltaY = (moveY - startY) / scale;

      let newW = startW;
      let newH = startH;
      let newX = startBlockX;
      let newY = startBlockY;

      // Vertical resizing
      if (direction.includes('s')) {
        newH = Math.max(minH, startH + deltaY);
      } else if (direction.includes('n')) {
        let dY = deltaY;
        if (startH - dY < minH) {
            dY = startH - minH;
        }
        newH = startH - dY;
        newY = startBlockY + dY;
      }

      // Horizontal resizing
      if (direction.includes('e')) {
        newW = Math.max(minW, startW + deltaX);
      } else if (direction.includes('w')) {
        let dX = deltaX;
        if (startW - dX < minW) {
             dX = startW - minW;
        }
        newW = startW - dX;
        newX = startBlockX + dX;
      }

      onUpdate(block.id, { w: newW, h: newH, x: newX, y: newY });
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  const handleTypes: HandleType[] = ['top', 'right', 'bottom', 'left'];

  return (
    <div
      className={`absolute transition-shadow duration-300 group flex flex-col
        ${isSelected ? 'z-50 ring-2 ring-primary-500 shadow-xl shadow-primary-500/20' : 'z-10 shadow-lg shadow-gray-400/20 dark:shadow-black/40 hover:shadow-xl hover:shadow-gray-400/30'}
        bg-white/95 dark:bg-gray-800/95 rounded-xl backdrop-blur-md 
        border border-gray-300 dark:border-gray-700
      `}
      style={{
        transform: `translate(${block.x}px, ${block.y}px)`,
        width: block.w,
        height: block.h,
        // Permanent glow/stroke effect requested
        boxShadow: isSelected 
            ? '0 0 0 2px rgba(139, 92, 246, 1), 0 10px 33px -5px rgba(139, 92, 246, 0.45)' 
            : undefined
      }}
      onMouseDown={(e) => {
          onSelect(block.id);
      }}
      onTouchStart={(e) => {
          onSelect(block.id);
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Node Connection Points (Visible on Hover/Select) */}
      {handleTypes.map((h) => (
        <div
            key={h}
            className={`absolute w-4 h-4 md:w-3 md:h-3 bg-white border-2 border-primary-500 rounded-full opacity-0 group-hover:opacity-100 hover:scale-125 cursor-crosshair z-20 transition-all
              ${h === 'top' ? '-top-2 left-1/2 -translate-x-1/2' : ''}
              ${h === 'bottom' ? '-bottom-2 left-1/2 -translate-x-1/2' : ''}
              ${h === 'left' ? 'top-1/2 -translate-y-1/2 -left-2' : ''}
              ${h === 'right' ? 'top-1/2 -translate-y-1/2 -right-2' : ''}
            `}
            onMouseDown={(e) => { e.stopPropagation(); onConnectStart(block.id, h, e); }}
            onMouseUp={(e) => { e.stopPropagation(); onConnectEnd(block.id, h); }}
            onTouchStart={(e) => { e.stopPropagation(); onConnectStart(block.id, h, e); }}
            onTouchEnd={(e) => { e.stopPropagation(); onConnectEnd(block.id, h); }}
        />
      ))}

      {/* Header / Drag Handle */}
      <div
        className="h-10 flex items-center justify-between px-3 border-b border-gray-200 dark:border-gray-700/50 cursor-grab active:cursor-grabbing handle bg-gray-50/50 dark:bg-transparent rounded-t-xl"
        data-drag-handle
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
            <Move className="w-4 h-4 text-gray-400 shrink-0" />
            {getCategoryIcon()}
            
            {/* Editable Title */}
            <textarea
                ref={titleRef}
                value={block.title || ''}
                onChange={(e) => onUpdate(block.id, { title: e.target.value })}
                placeholder="Note"
                rows={1}
                className="bg-transparent font-semibold text-sm text-gray-700 dark:text-gray-200 outline-none resize-none overflow-hidden w-full placeholder-gray-400/70"
                style={{ 
                    minHeight: '20px',
                    // Approx 2 lines (line-height ~1.25rem * 2)
                    maxHeight: '44px' 
                }}
            />
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button onClick={() => onDuplicate(block.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500">
             <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(block.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
             <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
         {renderContent()}
      </div>

      {/* Resize Handles - 4 Corners */}
      {isSelected && (
        <>
            <div className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-20 touch-none" onMouseDown={(e) => handleResizeStart(e, 'se')} onTouchStart={(e) => handleResizeStart(e, 'se')} />
            <div className="absolute bottom-0 left-0 w-6 h-6 cursor-nesw-resize z-20 touch-none" onMouseDown={(e) => handleResizeStart(e, 'sw')} onTouchStart={(e) => handleResizeStart(e, 'sw')} />
            <div className="absolute top-0 right-0 w-6 h-6 cursor-nesw-resize z-20 touch-none" onMouseDown={(e) => handleResizeStart(e, 'ne')} onTouchStart={(e) => handleResizeStart(e, 'ne')} />
            <div className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-20 touch-none" onMouseDown={(e) => handleResizeStart(e, 'nw')} onTouchStart={(e) => handleResizeStart(e, 'nw')} />
            
            {/* Improved Visual Indicators for resize handles */}
            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-primary-500 rounded-full pointer-events-none shadow-sm" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-2 border-primary-400/50 rounded-full pointer-events-none" />
            <div className="absolute top-1 right-1 w-2 h-2 border-2 border-primary-400/50 rounded-full pointer-events-none" />
            <div className="absolute top-1 left-1 w-2 h-2 border-2 border-primary-400/50 rounded-full pointer-events-none" />
        </>
      )}
    </div>
  );
};