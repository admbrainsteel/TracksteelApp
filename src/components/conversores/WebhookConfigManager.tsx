
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useWebhookConfigs } from '@/hooks/useWebhookConfigs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WebhookConfigManagerProps {
  converterName: string;
  onConfigSelect: (config: any) => void;
}

const WebhookConfigManager: React.FC<WebhookConfigManagerProps> = ({ 
  converterName, 
  onConfigSelect 
}) => {
  const { webhookConfigs, loading, saveWebhookConfig, deleteWebhookConfig } = useWebhookConfigs();
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    link_envio: '',
    link_recebimento: ''
  });

  const configs = webhookConfigs.filter(config => config.converter_name === converterName);

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setFormData({
      link_envio: config.link_envio,
      link_recebimento: config.link_recebimento
    });
    setShowDialog(true);
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setFormData({
      link_envio: '',
      link_recebimento: ''
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.link_envio.trim() || !formData.link_recebimento.trim()) {
      return;
    }

    await saveWebhookConfig({
      id: editingConfig?.id,
      converter_name: converterName,
      link_envio: formData.link_envio,
      link_recebimento: formData.link_recebimento
    });

    setShowDialog(false);
    setFormData({ link_envio: '', link_recebimento: '' });
    setEditingConfig(null);
  };

  const handleClose = () => {
    setShowDialog(false);
    setFormData({ link_envio: '', link_recebimento: '' });
    setEditingConfig(null);
  };

  if (loading) {
    return <div className="animate-pulse">Carregando configurações...</div>;
  }

  return (
    <>
      <Card className="bg-slate-700/50 border-slate-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm">Configurações de Webhook</CardTitle>
          <Button
            onClick={handleAdd}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              Nenhuma configuração de webhook cadastrada
            </p>
          ) : (
            <div className="space-y-2">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-600"
                >
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">
                      Envio: {config.link_envio}
                    </p>
                    <p className="text-slate-400 text-xs">
                      Recebimento: {config.link_recebimento}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onConfigSelect(config)}
                      className="text-xs"
                    >
                      Usar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteWebhookConfig(config.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure os links de webhook para o conversor {converterName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="link_envio" className="text-white">Link de Envio</Label>
              <Input
                id="link_envio"
                placeholder="https://api.exemplo.com/upload"
                value={formData.link_envio}
                onChange={(e) => setFormData({ ...formData, link_envio: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="link_recebimento" className="text-white">Link de Recebimento</Label>
              <Input
                id="link_recebimento"
                placeholder="https://api.exemplo.com/download"
                value={formData.link_recebimento}
                onChange={(e) => setFormData({ ...formData, link_recebimento: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {editingConfig ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WebhookConfigManager;
