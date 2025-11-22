import type { HierarchyNode } from './HierarchyNode';

/**
 * === Backend → Webview messages ===
 */

export interface TreeDataMessage {
    type: 'treeData';
    payload: HierarchyNode; // The full hierarchy tree
}

/**
 * === Webview → Backend messages ===
 */

export interface OpenFileMessage {
    type: 'openFile';
    payload: string; // filePath to open
}

export interface RefreshRequestMessage {
    type: 'refresh';
}

/**
 * Union types for stricter checking
 */

export type OutgoingMessage = TreeDataMessage;
export type IncomingMessage = OpenFileMessage | RefreshRequestMessage;
