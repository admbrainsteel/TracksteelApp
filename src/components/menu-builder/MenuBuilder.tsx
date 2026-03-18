
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, X, Trash2, Edit, Palette, GripVertical, RotateCcw } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MenuGroup } from './MenuGroup';
import { AvailableItems } from './AvailableItems';
import { ColorPicker } from './ColorPicker';

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

export function MenuBuilder() {
  const [groups, setGroups] = useState<MenuGroupType[]>([]);
  const [availableItems, setAvailableItems] = useState<InterfaceResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Load data from database
  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    try {
      setIsLoading(true);

      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('menu_groups')
        .select('*')
        .order('order_index');

      if (groupsError) throw groupsError;

      // Load interface resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('interface_resources')
        .select('*')
        .eq('is_submenu', false)
        .order('order_index');

      if (resourcesError) throw resourcesError;

      // Organize data properly maintaining order
      const groupsWithItems = (groupsData || []).map(group => ({
        ...group,
        items: (resourcesData || [])
          .filter(item => item.group_id === group.id)
          .sort((a, b) => a.order_index - b.order_index)
      }));

      const unassignedItems = (resourcesData || [])
        .filter(item => !item.group_id)
        .sort((a, b) => a.resource_name.localeCompare(b.resource_name));

      setGroups(groupsWithItems);
      setAvailableItems(unassignedItems);
    } catch (error) {
      console.error('Error loading menu data:', error);
      toast.error('Erro ao carregar dados do menu');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_groups')
        .insert([{
          name: 'Novo Grupo',
          color: '#6366f1',
          order_index: groups.length
        }])
        .select()
        .single();

      if (error) throw error;

      const newGroup = { ...data, items: [] };
      setGroups([...groups, newGroup]);
      toast.success('Novo grupo criado!');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Erro ao criar grupo');
    }
  };

  const updateGroupName = async (groupId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('menu_groups')
        .update({ name: newName })
        .eq('id', groupId);

      if (error) throw error;

      setGroups(groups.map(group => 
        group.id === groupId ? { ...group, name: newName } : group
      ));
    } catch (error) {
      console.error('Error updating group name:', error);
      toast.error('Erro ao atualizar nome do grupo');
    }
  };

  const updateGroupColor = async (groupId: string, color: string) => {
    try {
      const { error } = await supabase
        .from('menu_groups')
        .update({ color })
        .eq('id', groupId);

      if (error) throw error;

      setGroups(groups.map(group => 
        group.id === groupId ? { ...group, color } : group
      ));
      toast.success('Cor do grupo atualizada!');
    } catch (error) {
      console.error('Error updating group color:', error);
      toast.error('Erro ao atualizar cor do grupo');
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      // Move items back to available
      const group = groups.find(g => g.id === groupId);
      if (group?.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('interface_resources')
          .update({ group_id: null })
          .in('id', group.items.map(item => item.id));

        if (itemsError) throw itemsError;
      }

      // Delete group
      const { error } = await supabase
        .from('menu_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await loadMenuData(); // Reload data
      toast.success('Grupo removido!');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Erro ao remover grupo');
    }
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    try {
      // Handle group reordering
      if (type === 'group') {
        const newGroups = Array.from(groups);
        const [reorderedGroup] = newGroups.splice(source.index, 1);
        newGroups.splice(destination.index, 0, reorderedGroup);

        // Update order_index for all groups
        for (let i = 0; i < newGroups.length; i++) {
          newGroups[i].order_index = i;
          await supabase
            .from('menu_groups')
            .update({ order_index: i })
            .eq('id', newGroups[i].id);
        }

        setGroups(newGroups);
        return;
      }

      // Handle item movements
      if (source.droppableId === 'available-items') {
        // Moving from available to a group
        const groupId = destination.droppableId.replace('group-', '');
        await moveItemToGroup(draggableId, groupId, destination.index);
      } else if (destination.droppableId === 'available-items') {
        // Moving from group back to available
        await removeItemFromGroup(draggableId);
      } else if (source.droppableId === destination.droppableId) {
        // Reordering within same group
        const groupId = source.droppableId.replace('group-', '');
        await reorderItemsInGroup(groupId, source.index, destination.index);
      } else {
        // Moving between groups
        const sourceGroupId = source.droppableId.replace('group-', '');
        const destGroupId = destination.droppableId.replace('group-', '');
        await moveItemBetweenGroups(draggableId, sourceGroupId, destGroupId, destination.index);
      }
    } catch (error) {
      console.error('Error in drag and drop:', error);
      toast.error('Erro ao reorganizar itens');
    }
  };

  const moveItemToGroup = async (itemId: string, groupId: string, newIndex: number) => {
    try {
      // First get the group to calculate correct order_index
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      // Calculate the correct order_index based on position in group
      const targetOrderIndex = newIndex;

      // Update other items in the group to make space
      for (let i = newIndex; i < group.items.length; i++) {
        await supabase
          .from('interface_resources')
          .update({ order_index: i + 1 })
          .eq('id', group.items[i].id);
      }

      // Update the moved item
      const { error } = await supabase
        .from('interface_resources')
        .update({ 
          group_id: groupId,
          order_index: targetOrderIndex
        })
        .eq('id', itemId);

      if (error) throw error;
      await loadMenuData();
    } catch (error) {
      console.error('Error moving item to group:', error);
      throw error;
    }
  };

  const removeItemFromGroup = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('interface_resources')
        .update({ group_id: null, order_index: 0 })
        .eq('id', itemId);

      if (error) throw error;
      await loadMenuData();
    } catch (error) {
      console.error('Error removing item from group:', error);
      throw error;
    }
  };

  const reorderItemsInGroup = async (groupId: string, sourceIndex: number, destIndex: number) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const items = Array.from(group.items);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destIndex, 0, reorderedItem);

    // Update order_index for all items in group
    try {
      for (let i = 0; i < items.length; i++) {
        const { error } = await supabase
          .from('interface_resources')
          .update({ order_index: i })
          .eq('id', items[i].id);

        if (error) throw error;
      }
      await loadMenuData();
    } catch (error) {
      console.error('Error reordering items:', error);
      throw error;
    }
  };

  const moveItemBetweenGroups = async (itemId: string, sourceGroupId: string, destGroupId: string, newIndex: number) => {
    try {
      // Get destination group
      const destGroup = groups.find(g => g.id === destGroupId);
      if (!destGroup) return;

      // Update items in destination group to make space
      for (let i = newIndex; i < destGroup.items.length; i++) {
        await supabase
          .from('interface_resources')
          .update({ order_index: i + 1 })
          .eq('id', destGroup.items[i].id);
      }

      // Move the item
      const { error } = await supabase
        .from('interface_resources')
        .update({ 
          group_id: destGroupId,
          order_index: newIndex
        })
        .eq('id', itemId);

      if (error) throw error;

      // Reorder source group items
      const sourceGroup = groups.find(g => g.id === sourceGroupId);
      if (sourceGroup) {
        const remainingItems = sourceGroup.items.filter(item => item.id !== itemId);
        for (let i = 0; i < remainingItems.length; i++) {
          await supabase
            .from('interface_resources')
            .update({ order_index: i })
            .eq('id', remainingItems[i].id);
        }
      }

      await loadMenuData();
    } catch (error) {
      console.error('Error moving item between groups:', error);
      throw error;
    }
  };

  const resetToDefault = async () => {
    try {
      // Remove all items from groups
      await supabase
        .from('interface_resources')
        .update({ group_id: null, order_index: 0 })
        .not('group_id', 'is', null);

      // Delete all custom groups
      await supabase
        .from('menu_groups')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Keep system groups if any

      await loadMenuData();
      toast.success('Menu restaurado para o padrão!');
    } catch (error) {
      console.error('Error resetting to default:', error);
      toast.error('Erro ao restaurar menu');
    }
  };

  const filteredAvailableItems = availableItems.filter(item =>
    item.resource_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleColorChange = (color: string) => {
    if (selectedGroupId) {
      updateGroupColor(selectedGroupId, color);
    }
    setIsColorPickerOpen(false);
    setSelectedGroupId(null);
  };

  const openColorPicker = (groupId: string) => {
    setSelectedGroupId(groupId);
    setIsColorPickerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Construtor de Menu</h2>
          <p className="text-muted-foreground">Organize a estrutura do menu lateral da aplicação</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={resetToDefault}
            variant="outline"
            className="bg-white border-slate-300 text-slate-900 hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button
            onClick={createNewGroup}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Grupo
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Items */}
          <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Search className="w-5 h-5" />
                Itens Disponíveis
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar itens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </CardHeader>
            <CardContent>
              <AvailableItems 
                items={filteredAvailableItems}
              />
            </CardContent>
          </Card>

          {/* Menu Structure */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-foreground">Estrutura do Menu</CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="groups" type="group">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-4"
                    >
                      {groups.map((group, index) => (
                        <Draggable key={group.id} draggableId={group.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                            >
                              <div {...provided.dragHandleProps} className="cursor-move">
                                <MenuGroup
                                  group={group}
                                  onUpdateName={updateGroupName}
                                  onDelete={deleteGroup}
                                  onOpenColorPicker={openColorPicker}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        </div>
      </DragDropContext>

      <ColorPicker
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        onColorSelect={handleColorChange}
      />
    </div>
  );
}
