import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Expense, Profile, Tag } from '@/hooks/useCouple';
import { formatCurrency, formatDate } from '@/lib/constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportButtonProps {
  expenses: Expense[];
  profiles: Profile[];
  tags: Tag[];
  period?: string;
}

export function ExportButton({ expenses, profiles, tags, period }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const getProfileName = (position: number) => {
    return profiles.find(p => p.position === position)?.name || `Pessoa ${position}`;
  };

  const getTagName = (tagId: string | null) => {
    if (!tagId) return 'Sem categoria';
    return tags.find(t => t.id === tagId)?.name || 'Desconhecido';
  };

  const exportToCSV = () => {
    setIsExporting(true);
    
    try {
      const headers = ['Data', 'Descrição', 'Categoria', 'Valor', 'Pago por', 'Tipo', 'Divisão'];
      const rows = expenses.map(expense => [
        format(new Date(expense.expense_date), 'dd/MM/yyyy'),
        expense.description || '',
        getTagName(expense.tag_id),
        expense.total_amount.toFixed(2).replace('.', ','),
        getProfileName(expense.paid_by),
        expense.payment_type === 'credit' ? 'Crédito' : 'Débito',
        `${expense.split_value.person1}% / ${expense.split_value.person2}%`
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gastos-casal${period ? `-${period}` : ''}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToText = () => {
    setIsExporting(true);
    
    try {
      const totalAmount = expenses.reduce((sum, e) => sum + e.total_amount, 0);
      const byTag = expenses.reduce((acc, expense) => {
        const tagName = getTagName(expense.tag_id);
        acc[tagName] = (acc[tagName] || 0) + expense.total_amount;
        return acc;
      }, {} as Record<string, number>);

      let content = `RELATÓRIO DE GASTOS DO CASAL\n`;
      content += `${period ? `Período: ${period}\n` : ''}\n`;
      content += `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}\n`;
      content += `${'='.repeat(50)}\n\n`;

      content += `RESUMO\n`;
      content += `-`.repeat(30) + '\n';
      content += `Total de gastos: ${formatCurrency(totalAmount)}\n`;
      content += `Quantidade: ${expenses.length} despesa(s)\n\n`;

      content += `POR CATEGORIA\n`;
      content += `-`.repeat(30) + '\n';
      Object.entries(byTag)
        .sort((a, b) => b[1] - a[1])
        .forEach(([tag, amount]) => {
          content += `${tag}: ${formatCurrency(amount)}\n`;
        });

      content += `\n${'='.repeat(50)}\n`;
      content += `DETALHAMENTO\n`;
      content += `${'='.repeat(50)}\n\n`;

      expenses.forEach((expense, index) => {
        content += `${index + 1}. ${expense.description || 'Sem descrição'}\n`;
        content += `   Data: ${format(new Date(expense.expense_date), 'dd/MM/yyyy')}\n`;
        content += `   Valor: ${formatCurrency(expense.total_amount)}\n`;
        content += `   Categoria: ${getTagName(expense.tag_id)}\n`;
        content += `   Pago por: ${getProfileName(expense.paid_by)}\n`;
        content += `   Tipo: ${expense.payment_type === 'credit' ? 'Crédito' : 'Débito'}\n`;
        content += `\n`;
      });

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-gastos${period ? `-${period}` : ''}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (expenses.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Planilha (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToText}>
          <FileText className="w-4 h-4 mr-2" />
          Relatório (TXT)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
