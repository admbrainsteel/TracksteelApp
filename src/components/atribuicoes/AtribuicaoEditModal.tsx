
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAtribuicoes } from '@/hooks/useAtribuicoes';

interface AtribuicaoEditModalProps {
  atribuicao: any;
  isOpen: boolean;
  onClose: () => void;
}

export function AtribuicaoEditModal({ atribuicao, isOpen, onClose }: AtribuicaoEditModalProps) {
  const { updateAtribuicao, updateUserAbbrev, canManage } = useAtribuicoes();
  
  const [formData, setFormData] = useState({
    user_abbrev: '',
    attribution: '',
    frequency: '',
    method: '',
    client: '',
    importance: '',
    duration: ''
  });

  useEffect(() => {
    if (atribuicao) {
      setFormData({
        user_abbrev: atribuicao.user_abbrev || '',
        attribution: atribuicao.attribution || '',
        frequency: atribuicao.frequency || '',
        method: atribuicao.method || '',
        client: atribuicao.client || '',
        importance: atribuicao.importance || '',
        duration: atribuicao.duration || ''
      });
    }
  }, [atribuicao]);

  const handleSave = async () => {
    if (!atribuicao) return;

    // Atualizar identificação se mudou
    if (formData.user_abbrev !== atribuicao.user_abbrev) {
      await updateUserAbbrev(atribuicao.user_id, formData.user_abbrev);
    }

    // Atualizar atribuição
    await updateAtribuicao(atribuicao.id, {
      attribution: formData.attribution,
      frequency: formData.frequency as any,
      method: formData.method as any,
      client: formData.client as any,
      importance: formData.importance as any,
      duration: formData.duration as any
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Atribuição</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Usuário</Label>
              <Input value={atribuicao?.user_name || ''} disabled />
            </div>
            <div>
              <Label>Identificação (3 letras)</Label>
              <Input
                value={formData.user_abbrev}
                onChange={(e) => setFormData({ ...formData, user_abbrev: e.target.value.toUpperCase().substring(0, 3) })}
                maxLength={3}
                disabled={!canManage}
              />
            </div>
          </div>

          <div>
            <Label>Atribuição</Label>
            <Textarea
              value={formData.attribution}
              onChange={(e) => setFormData({ ...formData, attribution: e.target.value })}
              maxLength={300}
              disabled={!canManage}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Frequência</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horaria">Horária</SelectItem>
                  <SelectItem value="2xdia">2x ao dia</SelectItem>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="2xsemanal">2x semanal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Método</Label>
              <Select 
                value={formData.method} 
                onValueChange={(value) => setFormData({ ...formData, method: value })}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="impresso">Impresso</SelectItem>
                  <SelectItem value="sistema">Sistema</SelectItem>
                  <SelectItem value="sistema-impresso">Sistema/Impresso</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="verbal">Verbal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cliente</Label>
              <Select 
                value={formData.client} 
                onValueChange={(value) => setFormData({ ...formData, client: value })}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="processo">Processo</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grau de Importância</Label>
              <Select 
                value={formData.importance} 
                onValueChange={(value) => setFormData({ ...formData, importance: value })}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essencial">Essencial</SelectItem>
                  <SelectItem value="estrategico">Estratégico</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="informativo">Informativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Duração</Label>
              <Select 
                value={formData.duration} 
                onValueChange={(value) => setFormData({ ...formData, duration: value })}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="<=1 hora">≤ 1 hora</SelectItem>
                  <SelectItem value="2 horas">2 horas</SelectItem>
                  <SelectItem value="4 horas">4 horas</SelectItem>
                  <SelectItem value="8 horas">8 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {canManage && (
              <Button onClick={handleSave}>
                Salvar Alterações
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
