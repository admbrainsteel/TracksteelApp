
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, Edit, Trash2, Palette, X, Check } from 'lucide-react';

interface InterfaceResource {
  id: string;
  resource_key: string;
  resource_name: string;
  group_id?: string;
  order_index: number;
  is_submenu: boolean;
  parent_key?: string;
}

interface MenuGroupType {
  id: string;
  name: string;
  color: string;
  order_index: number;
  items: InterfaceResource[];
}

interface MenuGroupProps {
  group: MenuGroupType;
  onUpdateName: (groupId: string, newName: string) => void;
  onDelete: (groupId: string) => void;
  onOpenColorPicker: (groupId: string) => void;
}

export function MenuGroup({ group, onUpdateName, onDelete, onOpenColorPicker }: MenuGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(group.name);

  const handleSaveName = () => {
    if (editingName.trim() && editingName !== group.name) {
      onUpdateName(group.id, editingName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditingName(group.name);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-700/50 dark:border-slate-600">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className="w-4 h-4 text-slate-500 dark:text-slate-400 cursor-move" />
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.color }}
            />
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="bg-white border-slate-300 text-slate-900 text-sm h-8 dark:bg-slate-600 dark:border-slate-500 dark:text-white"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveName}
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h3 
                className="text-slate-900 dark:text-white font-medium cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 flex-1"
                onClick={() => setIsEditing(true)}
              >
                {group.name}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenColorPicker(group.id)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <Palette className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(group.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Droppable droppableId={`group-${group.id}`} type="item">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[100px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                snapshot.isDraggingOver 
                  ? 'border-blue-400 bg-blue-400/10' 
                  : 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/30'
              }`}
            >
              {group.items.length === 0 ? (
                <div className="text-center text-slate-500 dark:text-slate-400 py-6">
                  <p className="text-sm">Arraste itens aqui para criar o grupo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {group.items
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move ${
                            snapshot.isDragging
                              ? 'border-blue-400 bg-blue-400/20 shadow-lg scale-105'
                              : 'border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-500 dark:bg-slate-600/50 dark:hover:bg-slate-600/70'
                          }`}
                        >
                          <GripVertical className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                          <span className="text-slate-900 dark:text-white font-medium flex-1">
                            {item.resource_name}
                          </span>
                          <span className="text-xs text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-700 px-2 py-1 rounded">
                            #{item.order_index}
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
}
