
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAtribuicoes } from '@/hooks/useAtribuicoes';
import { useMobileResponsive } from '@/hooks/useMobileResponsive';
import { Trash2 } from 'lucide-react';

interface AtribuicaoTemp {
  attribution: string;
  frequency: string;
  method: string;
  client: string;
  importance: string;
  duration: string;
}

export function AtribuicoesForm() {
  const { users, createAtribuicao, canManage } = useAtribuicoes();
  const { isMobile } = useMobileResponsive();
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userAbbrev, setUserAbbrev] = useState('');
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoTemp[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    attribution: '',
    frequency: '',
    method: '',
    client: '',
    importance: '',
    duration: ''
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Gerar abreviação automática quando usuário é selecionado
  useEffect(() => {
    if (selectedUser && !userAbbrev) {
      const names = selectedUser.full_name?.split(' ') || [];
      let abbrev = '';
      
      if (names.length >= 2) {
        abbrev = names[0].charAt(0) + names[1].charAt(0) + names[0].charAt(1);
      } else if (names.length === 1) {
        abbrev = names[0].substring(0, 3);
      }
      
      setUserAbbrev(abbrev.toUpperCase());
    }
  }, [selectedUser, userAbbrev]);

  const handleAddAtribuicao = () => {
    if (!formData.attribution || !formData.frequency || !formData.method || 
        !formData.client || !formData.importance || !formData.duration) {
      return;
    }

    setAtribuicoes([...atribuicoes, { ...formData }]);
    setFormData({
      attribution: '',
      frequency: '',
      method: '',
      client: '',
      importance: '',
      duration: ''
    });
  };

  const handleRemoveAtribuicao = (index: number) => {
    setAtribuicoes(atribuicoes.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (!selectedUserId || !userAbbrev || atribuicoes.length === 0) {
      return;
    }

    for (const attr of atribuicoes) {
      await createAtribuicao({
        user_id: selectedUserId,
        user_abbrev: userAbbrev,
        attribution: attr.attribution,
        frequency: attr.frequency as any,
        method: attr.method as any,
        client: attr.client as any,
        importance: attr.importance as any,
        duration: attr.duration as any
      });
    }

    // Reset form
    setSelectedUserId('');
    setUserAbbrev('');
    setAtribuicoes([]);
  };

  if (!canManage) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Formulário de Cadastro */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Atribuição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Usuário */}
          <div className="space-y-4">
            <div>
              <Label>Selecionar Usuário</Label>
              <Select value={selectedUserId} onValueChange={(value) => {
                setSelectedUserId(value);
                setUserAbbrev('');
                setAtribuicoes([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Selecione um usuário --" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.profile_image_url} />
                          <AvatarFallback className="text-xs">
                            {user.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.full_name} ({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div>
                <Label>Identificação (3 letras)</Label>
                <Input
                  value={userAbbrev}
                  onChange={(e) => setUserAbbrev(e.target.value.toUpperCase().substring(0, 3))}
                  placeholder="Ex: JOS"
                  maxLength={3}
                />
              </div>
            )}
          </div>

          {selectedUserId && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="col-span-full">
                <Label>Atribuição</Label>
                <Textarea
                  value={formData.attribution}
                  onChange={(e) => setFormData({ ...formData, attribution: e.target.value })}
                  placeholder="Descrição da atribuição..."
                  maxLength={300}
                />
              </div>

              <div>
                <Label>Frequência</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                <Select value={formData.client} onValueChange={(value) => setFormData({ ...formData, client: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                <Select value={formData.importance} onValueChange={(value) => setFormData({ ...formData, importance: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
          )}

          {selectedUserId && (
            <div className="flex justify-end">
              <Button onClick={handleAddAtribuicao} disabled={!formData.attribution || !formData.frequency}>
                Adicionar Atribuição
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Atribuições Temporárias */}
      {atribuicoes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Atribuições para {selectedUser?.full_name}
              </CardTitle>
              <Button onClick={handleSaveAll} variant="default">
                Salvar Todas Atribuições
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atribuicoes.map((attr, index) => (
                <div key={index} className="flex justify-between items-start p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2 text-sm">
                    <div>
                      <strong>Atribuição:</strong>
                      <p className="break-words">{attr.attribution}</p>
                    </div>
                    <div>
                      <strong>Frequência:</strong>
                      <p>{attr.frequency}</p>
                    </div>
                    <div>
                      <strong>Método:</strong>
                      <p>{attr.method}</p>
                    </div>
                    <div>
                      <strong>Cliente:</strong>
                      <p>{attr.client}</p>
                    </div>
                    <div>
                      <strong>Importância:</strong>
                      <p>{attr.importance}</p>
                    </div>
                    <div>
                      <strong>Duração:</strong>
                      <p>{attr.duration}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAtribuicao(index)}
                    className="text-red-600 hover:text-red-700 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
