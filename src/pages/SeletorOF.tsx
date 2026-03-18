import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOFs } from '@/hooks/useOFs';

export default function SeletorOF() {
  const navigate = useNavigate();
  const { ofs, loading } = useOFs();

  const handleOFSelect = (ofNumber: string) => {
    navigate(`/cadastro-pecas/${encodeURIComponent(ofNumber)}`);
  };

  const handleVoltar = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-foreground">Carregando OFs ativas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Selecionar OF</h1>
            <p className="text-muted-foreground">Escolha uma OF para acessar o cadastro de peças</p>
          </div>
          <Button 
            onClick={handleVoltar}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* OFs Grid */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <Package className="h-5 w-5" />
              OFs Ativas Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ofs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma OF ativa encontrada
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {ofs.map((of) => (
                  <Button
                    key={of.id}
                    onClick={() => handleOFSelect(of.num_of)}
                    variant="outline"
                    className="h-16 text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {of.num_of}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
