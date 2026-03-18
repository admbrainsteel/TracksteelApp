
import { Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OrdensFiltrosProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

export const OrdensFiltros = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}: OrdensFiltrosProps) => {
  return (
    <Card className="bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-slate-800 dark:text-white text-sm sm:text-lg flex items-center gap-2">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <label className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
              <Input
                placeholder="OF, cliente ou obra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white pl-8 sm:pl-10 text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <label className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-xs sm:text-sm h-8 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-600">
                <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 text-xs sm:text-sm">Todos</SelectItem>
                <SelectItem value="ativa" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 text-xs sm:text-sm">Ativa</SelectItem>
                <SelectItem value="pausada" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 text-xs sm:text-sm">Pausada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600 w-full text-xs sm:text-sm h-8 sm:h-10 px-3"
            >
              Limpar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
