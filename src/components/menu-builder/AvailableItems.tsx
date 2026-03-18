
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, Layers } from 'lucide-react';

interface InterfaceResource {
  id: string;
  resource_key: string;
  resource_name: string;
  group_id?: string;
  order_index: number;
  is_submenu: boolean;
  parent_key?: string;
}

interface AvailableItemsProps {
  items: InterfaceResource[];
}

export function AvailableItems({ items }: AvailableItemsProps) {
  return (
    <Droppable droppableId="available-items" type="item">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`space-y-2 min-h-[200px] p-3 rounded-lg border-2 border-dashed transition-colors ${
            snapshot.isDraggingOver 
              ? 'border-green-400 bg-green-400/10' 
              : 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/30'
          }`}
        >
          {items.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Todos os itens foram organizados</p>
            </div>
          ) : (
            items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-move transition-all ${
                      snapshot.isDragging
                        ? 'border-blue-400 bg-blue-400/20 shadow-lg rotate-2 scale-105'
                        : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 dark:border-slate-500 dark:bg-slate-600/50 dark:hover:bg-slate-600/70'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    <span className="text-slate-900 dark:text-white font-medium flex-1">
                      {item.resource_name}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  </div>
                )}
              </Draggable>
            ))
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
