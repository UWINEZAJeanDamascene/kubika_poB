import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import type { Project } from "@/lib/api";

export interface WBSTreeNode extends Project {
  children: WBSTreeNode[];
}

interface WBSTreeProps {
  nodes: WBSTreeNode[];
  level?: number;
  onSelect?: (node: WBSTreeNode) => void;
  selectedId?: string;
}

function getNodeIcon(node: WBSTreeNode, isOpen: boolean) {
  if (node.children && node.children.length > 0) {
    return isOpen ? (
      <FolderOpen className="h-4 w-4 text-amber-500" />
    ) : (
      <Folder className="h-4 w-4 text-amber-500" />
    );
  }
  return <FileText className="h-4 w-4 text-blue-500" />;
}

function WBSTreeItem({
  node,
  level,
  onSelect,
  selectedId,
}: {
  node: WBSTreeNode;
  level: number;
  onSelect?: (node: WBSTreeNode) => void;
  selectedId?: string;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node._id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted",
        )}
        style={{ paddingLeft: `${Math.min(level, 4) * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) setIsOpen(!isOpen);
          onSelect?.(node);
        }}
      >
        {hasChildren ? (
          <span className="w-4 h-4 flex items-center justify-center">
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}
        {getNodeIcon(node, isOpen)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground sm:text-xs">{node.wbs_code}</span>
            <span className="min-w-0 truncate text-sm font-medium">{node.name}</span>
          </div>
        </div>
        <span
          className={cn(
          "shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border sm:text-xs",
            node.status === "active" && "bg-green-500/10 text-green-500 border-green-500/20",
            node.status === "planning" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            node.status === "on_hold" && "bg-orange-500/10 text-orange-500 border-orange-500/20",
            node.status === "blocked" && "bg-red-500/10 text-red-500 border-red-500/20",
            node.status === "completed" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
            node.status === "cancelled" && "bg-red-500/10 text-red-500 border-red-500/20",
          )}
        >
          {node.status}
        </span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <WBSTreeItem
              key={child._id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WBSTree({ nodes, onSelect, selectedId }: WBSTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No WBS structure found
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card p-2">
      {nodes.map((node) => (
        <WBSTreeItem
          key={node._id}
          node={node}
          level={0}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
