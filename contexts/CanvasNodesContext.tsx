import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Node } from '@xyflow/react';

interface CanvasNodesContextType {
  nodes: Node[];
  setNodes: (nodes: Node[]) => void;
}

const CanvasNodesContext = createContext<CanvasNodesContextType | undefined>(undefined);

export const CanvasNodesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<Node[]>([]);

  return (
    <CanvasNodesContext.Provider value={{ nodes, setNodes }}>
      {children}
    </CanvasNodesContext.Provider>
  );
};

export const useCanvasNodes = () => {
  const context = useContext(CanvasNodesContext);
  if (!context) {
    return { nodes: [], setNodes: () => {} };
  }
  return context;
};



