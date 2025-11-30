export type BlockType = 'text' | 'image' | 'checklist' | 'code' | 'table';
export type HandleType = 'top' | 'right' | 'bottom' | 'left';
export type BlockCategory = 'fitness' | 'study' | 'code' | 'general';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface TableContent {
  headers: string[];
  rows: string[][];
  columnTypes?: ('text' | 'checkbox')[]; 
}

export interface BlockData {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string | ChecklistItem[] | TableContent; 
  title?: string; // Optional title for blocks
  category?: BlockCategory;
}

export interface Edge {
  id: string;
  fromId: string;
  toId: string;
  fromHandle: HandleType;
  toHandle: HandleType;
}

export interface Page {
  id: string;
  name: string;
  blocks: BlockData[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface CanvasState {
  scale: number;
  pan: Point;
}