import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Play, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Code } from "lucide-react";
import { toast } from "sonner";

export default function WebClone() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('clone');

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error('Por favor, insira uma URL válida');
      return;
    }

    setLoading(true);
    toast.info(`Iniciando clonagem inteligente de ${url}...`);

    try {
      // Comunicando com a API do Crawler na porta 3001 (ou rota de gateway)
      const res = await fetch('http://localhost:3001/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrl: url, maxPages: 5 })
      });

      if (!res.ok) {
        throw new Error('Falha ao comunicar com o serviço de clonagem');
      }

      const data = await res.json();
      setResult(data);
      toast.success('Clonagem e recriação concluídas com sucesso!');
      setActiveTab('resultados');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao realizar o clone da página');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8 text-primary" /> WebClone AI
          </h1>
          <p className="text-muted-foreground">
            Clonagem inteligente avançada, mocking de SPAs e recriação generativa de componentes.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20">
          Playwright + IA + Service Workers
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="clone">Nova Clonagem</TabsTrigger>
          <TabsTrigger value="resultados" disabled={!result}>Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="clone" className="space-y-6">
          <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/95">
            <CardHeader>
              <CardTitle>Iniciar Processo de Clonagem</CardTitle>
              <CardDescription>
                Insira a URL do site. O sistema irá extrair o HTML, processar o Shadow DOM, criar mocks de API XHR/Fetch e emular formulários via IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClone} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://exemplo.com.br"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-10 h-12 text-base"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={loading} 
                    className="h-12 px-6 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Processando...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5 fill-current" /> Clonar Site
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" /> Mocks de Rede (SPA)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Injeta um Service Worker local para responder chamadas XHR e Fetch gravadas durante a sessão original, permitindo que sites React/Vue funcionem offline.
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-500">
                  <Code className="h-5 w-5" /> Recriação com IA
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Detecta formulários quebrados ou áreas dinâmicas vazias e usa LLMs multimodais para reescrever o componente em Vanilla JS/CSS funcional.
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
                  <AlertCircle className="h-5 w-5" /> Declarative Shadow DOM
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Vasculha e abre as árvores de Shadow DOM ocultas, convertendo-as para templates declarativos para perfeita fidelidade visual.
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resultados">
          {result && (
            <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" /> Relatório do Clone
                </CardTitle>
                <CardDescription>Detalhes da extração e emulação do site {result.rootUrl}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div>
                    <div className="text-sm text-muted-foreground">Páginas Clonadas</div>
                    <div className="text-2xl font-bold text-primary">{result.totalPages || result.pages?.length || 1}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tempo de Crawl</div>
                    <div className="text-2xl font-bold">{result.crawlTime ? `${(result.crawlTime / 1000).toFixed(1)}s` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Profundidade Máx</div>
                    <div className="text-2xl font-bold">{result.crawlDepth || 1}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant="default" className="bg-emerald-500 text-white mt-1">Concluído</Badge>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={() => window.open(`http://localhost:3000`, '_blank')} 
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                  >
                    <ExternalLink className="h-4 w-4" /> Acessar Site Clonado Local
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('clone')}
                  >
                    Clonar Outro Site
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
