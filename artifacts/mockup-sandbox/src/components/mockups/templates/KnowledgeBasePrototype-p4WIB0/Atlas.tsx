import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Star, MoreHorizontal, ChevronRight, 
  ChevronDown, FileText, Hash, Clock, Settings, 
  PanelLeftClose, PanelLeft, Bell, Inbox, 
  CheckCircle2, Circle, TerminalSquare, MessageSquareQuote,
  Command, PenSquare
} from 'lucide-react';
import { cn } from './lib/utils';

// --- MOCK DATA ---

type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'quote' | 'code' | 'todo';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

interface PageNode {
  id: string;
  title: string;
  icon: React.ElementType;
  isFavorite: boolean;
  content: Block[];
  children?: PageNode[];
}

const INITIAL_DATA: PageNode[] = [
  {
    id: 'p1',
    title: 'Product Roadmap',
    icon: Hash,
    isFavorite: true,
    content: [
      { id: 'b1', type: 'h1', content: 'Q3 Product Roadmap' },
      { id: 'b2', type: 'p', content: 'This document outlines the core priorities for the upcoming quarter. Our primary focus is on expanding the enterprise offering and improving core performance.' },
      { id: 'b3', type: 'h2', content: 'Enterprise Features' },
      { id: 'b4', type: 'todo', content: 'SSO Integration (Okta, Azure AD)', checked: true },
      { id: 'b5', type: 'todo', content: 'Advanced Role-Based Access Control', checked: false },
      { id: 'b6', type: 'todo', content: 'Audit Logs & Compliance Export', checked: false },
      { id: 'b7', type: 'h2', content: 'Performance Goals' },
      { id: 'b8', type: 'p', content: 'We need to reduce P99 latency across the board.' },
      { id: 'b9', type: 'quote', content: '"Speed is a feature. Every 100ms matters for user retention."' },
      { id: 'b10', type: 'code', content: 'const threshold = 100;\nif (latency > threshold) {\n  alertOps();\n}' },
    ],
    children: [
      {
        id: 'p1-1',
        title: 'Q3 Enterprise Specs',
        icon: FileText,
        isFavorite: false,
        content: [
          { id: 'c1', type: 'h1', content: 'Enterprise Specifications' },
          { id: 'c2', type: 'p', content: 'Detailed specs for the enterprise push.' }
        ]
      }
    ]
  },
  {
    id: 'p2',
    title: 'Engineering Guild',
    icon: TerminalSquare,
    isFavorite: true,
    content: [
      { id: 'e1', type: 'h1', content: 'Engineering Guild' },
      { id: 'e2', type: 'p', content: 'Welcome to the engineering knowledge base.' }
    ],
    children: [
      {
        id: 'p2-1',
        title: 'Architecture Overview',
        icon: FileText,
        isFavorite: false,
        content: [
          { id: 'a1', type: 'h1', content: 'System Architecture' },
          { id: 'a2', type: 'p', content: 'High level overview of our microservices.' }
        ]
      },
      {
        id: 'p2-2',
        title: 'Deployment Guide',
        icon: FileText,
        isFavorite: false,
        content: [
          { id: 'd1', type: 'h1', content: 'How to Deploy' },
          { id: 'd2', type: 'code', content: 'pnpm run build\npnpm run deploy' }
        ]
      }
    ]
  },
  {
    id: 'p3',
    title: 'Marketing Campaigns',
    icon: MessageSquareQuote,
    isFavorite: false,
    content: [
      { id: 'm1', type: 'h1', content: 'Marketing Campaigns' },
      { id: 'm2', type: 'p', content: 'Active and upcoming campaigns.' }
    ]
  },
  {
    id: 'p4',
    title: 'Meeting Notes',
    icon: Clock,
    isFavorite: false,
    content: [
      { id: 'n1', type: 'h1', content: 'Meeting Notes' },
      { id: 'n2', type: 'p', content: 'Archive of all team standups and syncs.' }
    ]
  }
];

// --- COMPONENTS ---

export default function Atlas() {
  const [pages, setPages] = useState<PageNode[]>(INITIAL_DATA);
  const [activePageId, setActivePageId] = useState<string>('p1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['p1', 'p2']));

  // Helper to find a page by id
  const findPage = (nodes: PageNode[], id: string): PageNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findPage(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const activePage = useMemo(() => findPage(pages, activePageId), [pages, activePageId]);

  const toggleFavorite = (id: string) => {
    const updateNode = (nodes: PageNode[]): PageNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, isFavorite: !node.isFavorite };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setPages(updateNode(pages));
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const createPage = () => {
    const newId = `new-${Date.now()}`;
    const newPage: PageNode = {
      id: newId,
      title: 'Untitled',
      icon: FileText,
      isFavorite: false,
      content: [
        { id: `b-${Date.now()}`, type: 'h1', content: '' }
      ]
    };
    setPages([...pages, newPage]);
    setActivePageId(newId);
  };

  const updateBlockContent = (blockId: string, content: string) => {
    if (!activePage) return;
    
    const updateNode = (nodes: PageNode[]): PageNode[] => {
      return nodes.map(node => {
        if (node.id === activePageId) {
          return {
            ...node,
            content: node.content.map(b => b.id === blockId ? { ...b, content } : b)
          };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setPages(updateNode(pages));
  };

  const toggleTodo = (blockId: string) => {
    if (!activePage) return;
    
    const updateNode = (nodes: PageNode[]): PageNode[] => {
      return nodes.map(node => {
        if (node.id === activePageId) {
          return {
            ...node,
            content: node.content.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b)
          };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setPages(updateNode(pages));
  };

  const getAllFavorites = (nodes: PageNode[]): PageNode[] => {
    let favs: PageNode[] = [];
    for (const node of nodes) {
      if (node.isFavorite) favs.push(node);
      if (node.children) favs = favs.concat(getAllFavorites(node.children));
    }
    return favs;
  };

  const favorites = useMemo(() => getAllFavorites(pages), [pages]);

  const renderTree = (nodes: PageNode[], level = 0) => {
    return nodes.map(node => {
      // Very simple filter matching
      const matchesSearch = node.title.toLowerCase().includes(searchQuery.toLowerCase());
      const hasMatchingChild = node.children && node.children.some(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (searchQuery && !matchesSearch && !hasMatchingChild) {
        return null;
      }

      const isExpanded = expandedNodes.has(node.id);
      const isActive = activePageId === node.id;
      const IconCmp = node.icon;

      return (
        <div key={node.id}>
          <div 
            className={cn(
              "group flex items-center h-8 px-2 mx-2 rounded-md cursor-pointer text-sm select-none transition-colors",
              isActive ? "bg-black/5 text-black font-medium" : "text-neutral-600 hover:bg-black/5"
            )}
            style={{ paddingLeft: `${(level * 12) + 8}px` }}
            onClick={() => setActivePageId(node.id)}
          >
            <div 
              className="w-5 h-5 flex items-center justify-center mr-1 text-neutral-400 hover:text-black rounded-sm transition-colors"
              onClick={(e) => {
                if (node.children && node.children.length > 0) {
                  toggleExpand(node.id, e);
                }
              }}
            >
              {node.children && node.children.length > 0 ? (
                isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <div className="w-3.5 h-3.5" /> // Spacer
              )}
            </div>
            <IconCmp className={cn("w-4 h-4 mr-2", isActive ? "text-black" : "text-neutral-500")} />
            <span className="truncate flex-1">{node.title}</span>
            <div className={cn(
              "flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity",
              node.isFavorite && "opacity-100"
            )}>
              <div 
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 text-neutral-400 hover:text-black transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(node.id);
                }}
              >
                <Star className={cn("w-3.5 h-3.5", node.isFavorite && "fill-yellow-400 text-yellow-400")} />
              </div>
            </div>
          </div>
          {node.children && isExpanded && (
            <div>
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="w-full h-full bg-white flex text-neutral-900 font-['Inter',sans-serif] overflow-hidden antialiased">
      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
        }
      `}</style>
      
      {/* Sidebar */}
      <div 
        className={cn(
          "flex-shrink-0 bg-[#F7F7F5] border-r border-neutral-200 transition-all duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "w-[260px]" : "w-0 border-r-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="h-12 flex items-center px-4 justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 font-medium cursor-pointer hover:bg-black/5 px-2 py-1 -ml-2 rounded transition-colors">
            <div className="w-5 h-5 bg-black rounded flex items-center justify-center text-white">
              <Command className="w-3 h-3" />
            </div>
            <span className="text-sm">Acme Corp</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </div>
          <div className="flex space-x-1">
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-neutral-500 transition-colors" title="Notifications">
              <Bell className="w-4 h-4" />
            </button>
            <button 
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-neutral-500 transition-colors" 
              onClick={() => setSidebarOpen(false)}
              title="Close Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 flex-shrink-0">
          <div className="flex items-center bg-black/5 hover:bg-black/10 transition-colors rounded-md px-2 py-1.5 cursor-text group text-sm text-neutral-500">
            <Search className="w-4 h-4 mr-2" />
            <input 
              type="text" 
              placeholder="Search or jump to..." 
              className="bg-transparent border-none outline-none w-full placeholder:text-neutral-500 text-black"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="text-[10px] font-medium border border-neutral-300 rounded px-1.5 py-0.5 bg-white shadow-sm opacity-100 group-focus-within:opacity-0 transition-opacity flex items-center space-x-0.5">
              <span>⌘</span><span>K</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Menu Items */}
          <div className="mb-4">
            <div className="flex items-center h-8 px-4 mx-2 rounded-md hover:bg-black/5 cursor-pointer text-sm text-neutral-600 transition-colors">
              <Inbox className="w-4 h-4 mr-2" />
              <span>Inbox</span>
            </div>
            <div className="flex items-center h-8 px-4 mx-2 rounded-md hover:bg-black/5 cursor-pointer text-sm text-neutral-600 transition-colors">
              <Settings className="w-4 h-4 mr-2" />
              <span>Settings & Members</span>
            </div>
          </div>

          {/* Favorites */}
          {favorites.length > 0 && !searchQuery && (
            <div className="mb-4">
              <div className="px-4 text-xs font-semibold text-neutral-400 mb-1 flex items-center group">
                <span className="flex-1">FAVORITES</span>
              </div>
              {favorites.map(node => (
                <div 
                  key={`fav-${node.id}`}
                  className={cn(
                    "flex items-center h-8 px-4 mx-2 rounded-md cursor-pointer text-sm transition-colors",
                    activePageId === node.id ? "bg-black/5 text-black font-medium" : "text-neutral-600 hover:bg-black/5"
                  )}
                  onClick={() => setActivePageId(node.id)}
                >
                  <node.icon className={cn("w-4 h-4 mr-2", activePageId === node.id ? "text-black" : "text-neutral-500")} />
                  <span className="truncate flex-1">{node.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Workspace */}
          <div>
            <div className="px-4 text-xs font-semibold text-neutral-400 mb-1 flex items-center group">
              <span className="flex-1">WORKSPACE</span>
              <button 
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 text-neutral-400 opacity-0 group-hover:opacity-100 transition-all"
                onClick={createPage}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {renderTree(pages)}
          </div>
        </div>

        {/* New Page Button */}
        <div className="p-4 mt-auto border-t border-black/5 flex-shrink-0">
          <button 
            className="flex items-center text-sm font-medium text-neutral-500 hover:text-black hover:bg-black/5 w-full px-2 py-1.5 rounded transition-colors"
            onClick={createPage}
          >
            <Plus className="w-4 h-4 mr-2" />
            New page
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Topbar */}
        <header className="h-12 flex items-center px-4 justify-between border-b border-transparent sticky top-0 bg-white/80 backdrop-blur-sm z-10 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {!sidebarOpen && (
              <button 
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 text-neutral-500 transition-colors mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            
            {activePage && (
              <div className="flex items-center text-sm text-neutral-600">
                <span className="hover:bg-black/5 px-2 py-1 rounded cursor-pointer transition-colors">Acme Corp</span>
                <span className="text-neutral-300 mx-1">/</span>
                <span className="hover:bg-black/5 px-2 py-1 rounded cursor-pointer transition-colors text-black font-medium flex items-center">
                  <activePage.icon className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                  {activePage.title}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button className="text-sm font-medium text-neutral-500 hover:text-black hover:bg-black/5 px-3 py-1 rounded transition-colors">Share</button>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 text-neutral-500 transition-colors"
              onClick={() => activePage && toggleFavorite(activePage.id)}
            >
              <Star className={cn("w-4 h-4", activePage?.isFavorite && "fill-yellow-400 text-yellow-400")} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 text-neutral-500 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Editor Area */}
        {activePage ? (
          <div className="flex-1 overflow-y-auto px-12 md:px-24 py-16 flex flex-col items-center">
            <div className="w-full max-w-[800px]">
              
              {/* Cover/Icon header area */}
              <div className="mb-10 group relative">
                <div className="text-[64px] mb-4 leading-none opacity-20">
                  <activePage.icon className="w-20 h-20" strokeWidth={1} />
                </div>
                <div className="absolute top-0 left-0 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-xs text-neutral-500 hover:text-black hover:bg-black/5 px-2 py-1 rounded transition-colors flex items-center">
                    <PenSquare className="w-3 h-3 mr-1" />
                    Add cover
                  </button>
                </div>
                
                <input 
                  type="text"
                  value={activePage.title}
                  onChange={(e) => {
                    const updateTitle = (nodes: PageNode[]): PageNode[] => {
                      return nodes.map(n => {
                        if (n.id === activePage.id) return { ...n, title: e.target.value };
                        if (n.children) return { ...n, children: updateTitle(n.children) };
                        return n;
                      });
                    };
                    setPages(updateTitle(pages));
                  }}
                  placeholder="Untitled"
                  className="text-4xl font-bold bg-transparent border-none outline-none w-full placeholder:text-neutral-300 text-black block"
                />
              </div>

              {/* Blocks */}
              <div className="space-y-1 pb-32">
                {activePage.content.map(block => {
                  if (block.type === 'h1') {
                    return (
                      <div key={block.id} className="group relative flex items-center mt-6 mb-2">
                        <input
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          placeholder="Heading 1"
                          className="text-2xl font-semibold bg-transparent border-none outline-none w-full placeholder:text-neutral-300"
                        />
                      </div>
                    );
                  }
                  if (block.type === 'h2') {
                    return (
                      <div key={block.id} className="group relative flex items-center mt-5 mb-1">
                        <input
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          placeholder="Heading 2"
                          className="text-xl font-medium bg-transparent border-none outline-none w-full placeholder:text-neutral-300"
                        />
                      </div>
                    );
                  }
                  if (block.type === 'p') {
                    return (
                      <div key={block.id} className="group relative flex items-center min-h-[28px]">
                        <textarea
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          placeholder="Type '/' for commands"
                          className="text-[15px] leading-relaxed text-neutral-800 bg-transparent border-none outline-none w-full resize-none placeholder:text-neutral-300"
                          rows={block.content.split('\n').length || 1}
                        />
                      </div>
                    );
                  }
                  if (block.type === 'todo') {
                    return (
                      <div key={block.id} className="group relative flex items-start py-1">
                        <button 
                          className="mt-1 mr-2 flex-shrink-0 text-black hover:bg-black/5 rounded transition-colors"
                          onClick={() => toggleTodo(block.id)}
                        >
                          {block.checked ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-50" />
                          ) : (
                            <Circle className="w-5 h-5 text-neutral-300" />
                          )}
                        </button>
                        <input
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className={cn(
                            "text-[15px] leading-relaxed bg-transparent border-none outline-none w-full placeholder:text-neutral-300",
                            block.checked ? "text-neutral-400 line-through" : "text-neutral-800"
                          )}
                        />
                      </div>
                    );
                  }
                  if (block.type === 'quote') {
                    return (
                      <div key={block.id} className="group relative flex items-center py-1 my-2">
                        <div className="w-1 absolute left-0 top-0 bottom-0 bg-black rounded-full" />
                        <textarea
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className="text-[17px] pl-4 italic text-neutral-700 bg-transparent border-none outline-none w-full resize-none"
                          rows={block.content.split('\n').length || 1}
                        />
                      </div>
                    );
                  }
                  if (block.type === 'code') {
                    return (
                      <div key={block.id} className="group relative my-3 bg-[#F7F7F5] rounded-md border border-neutral-200 p-4">
                        <textarea
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className="font-mono text-[13px] leading-relaxed text-neutral-800 bg-transparent border-none outline-none w-full resize-none"
                          rows={block.content.split('\n').length || 1}
                          spellCheck={false}
                        />
                      </div>
                    );
                  }
                  return null;
                })}
                
                {/* Empty trailing block to click into */}
                <div className="group relative flex items-center min-h-[28px] mt-2 text-neutral-300 text-[15px] cursor-text">
                  Type '/' for commands
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400 flex-col">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a page or create a new one.</p>
            <button 
              className="mt-4 px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors"
              onClick={createPage}
            >
              Create Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
