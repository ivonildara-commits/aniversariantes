/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * INSTRUÇÕES PARA O SUPABASE:
 * 1. Crie um projeto no Supabase (https://supabase.com)
 * 2. No menu 'SQL Editor', execute o seguinte comando para criar a tabela:
 * 
 * CREATE TABLE birthdays (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   birth_date DATE NOT NULL,
 *   status TEXT DEFAULT 'não iniciado' CHECK (status IN ('não iniciado', 'em andamento', 'concluido')),
 *   notes TEXT,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 * 
 * -- COMANDOS PARA LIBERAR ACESSO PÚBLICO (IMPORTANTE):
 * ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "public_select" ON birthdays FOR SELECT USING (true);
 * CREATE POLICY "public_insert" ON birthdays FOR INSERT WITH CHECK (true);
 * CREATE POLICY "public_update" ON birthdays FOR UPDATE USING (true) WITH CHECK (true);
 * CREATE POLICY "public_delete" ON birthdays FOR DELETE USING (true);
 * 
 * 3. Copie a URL e a ANON KEY para o seu arquivo .env ou segredos do Vercel.
 */

import { useEffect, useState, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Search,
  Filter,
  Cake,
  ChevronDown,
  Info
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSupabase } from '@/src/lib/supabase';
import { BirthdayRecord, Status, NewBirthdayRecord } from './types';
import { cn } from '@/src/lib/utils';

export default function App() {
  const [records, setRecords] = useState<BirthdayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState<Status | 'todos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newStatus, setNewStatus] = useState<Status>('não iniciado');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('birthdays')
        .select('*')
        .order('birth_date', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName || !newDate) return;

    const supabase = getSupabase();
    if (!supabase) {
      alert('Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
      return;
    }

    try {
      setIsSubmitting(true);
      const newEntry: NewBirthdayRecord = {
        name: newName,
        birth_date: newDate,
        status: newStatus,
        notes: newNotes
      };

      const { data, error } = await supabase
        .from('birthdays')
        .insert([newEntry])
        .select();

      if (error) throw error;

      if (data) {
        setRecords(prev => [...prev, ...data].sort((a, b) => a.birth_date.localeCompare(b.birth_date)));
        setIsFormOpen(false);
        resetForm();
      }
    } catch (err) {
      console.error('Erro ao adicionar:', err);
      alert('Erro ao salvar. Verifique se o Supabase está configurado corretamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewDate('');
    setNewStatus('não iniciado');
    setNewNotes('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('birthdays').delete().eq('id', id);
      if (error) throw error;
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: Status) => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('birthdays')
        .update({ status: nextStatus })
        .eq('id', id);
      if (error) throw error;
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status: nextStatus } : r));
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesStatus = filter === 'todos' || r.status === filter;
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [records, filter, searchTerm]);

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'concluido': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'em andamento': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'concluido': return <CheckCircle2 className="w-4 h-4" />;
      case 'em andamento': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans text-brand-ink">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b-4 border-brand-accent p-6 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-brutal-sm">B</div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 group">
            BDAY<span className="text-brand-accent underline decoration-4 underline-offset-8 group-hover:decoration-brand-ink transition-all">TRACKER</span>
          </h1>
        </div>
          <div className="flex items-center gap-4">
            {!getSupabase() ? (
              <div className="hidden md:flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-2 rounded-full font-bold text-xs border-2 border-rose-200 shadow-brutal-sm">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                SUPABASE NÃO CONFIGURADO
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full font-bold text-xs border-2 border-teal-200">
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                SUPABASE CONECTADO
              </div>
            )}
            <div className="w-10 h-10 rounded-full border-4 border-pink-400 bg-pink-50 flex items-center justify-center text-xl shadow-brutal-sm">🎂</div>
          </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 p-6 max-w-[1600px] mx-auto w-full">
        {/* Left Panel: Registration Form */}
        <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-3xl border-4 border-brand-ink p-8 shadow-brutal-lg sticky top-28">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
              <span className="text-3xl">✨</span> Cadastro
            </h2>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5 text-slate-500 tracking-wider">Nome do Festejado</label>
                <input 
                  required
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Maria Silva" 
                  className="brutal-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5 text-slate-500 tracking-wider">Data de Nascimento</label>
                <input 
                  required
                  type="date" 
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="brutal-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5 text-slate-500 tracking-wider">Status Inicial</label>
                <select 
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as Status)}
                  className="brutal-input appearance-none cursor-pointer"
                >
                  <option value="não iniciado">Não Iniciado</option>
                  <option value="em andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5 text-slate-500 tracking-wider">Notas Rápidas</label>
                <input 
                  type="text" 
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Observações..." 
                  className="brutal-input"
                />
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full brutal-btn text-xl mt-4 disabled:opacity-50"
              >
                {isSubmitting ? 'CADASTRANDO...' : 'SALVAR AGORA'}
              </button>
            </form>
            <div className="mt-8 p-4 bg-purple-50 rounded-2xl border-2 border-purple-200">
              <p className="text-[10px] text-purple-600 font-bold leading-relaxed italic">
                * Sem login ou senha. Controle rápido via Supabase + Vercel.
              </p>
            </div>
          </div>
        </aside>

        {/* Right Panel: Status Board */}
        <main className="flex-1 flex flex-col gap-6">
          {/* Search bar and simple filter info */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
             <div className="relative w-full sm:w-72">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar por nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-4 border-brand-ink rounded-full text-sm font-bold shadow-brutal-sm outline-none"
              />
            </div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 border-2 border-slate-200 rounded-full">
              {filteredRecords.length} REGISTROS ENCONTRADOS
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-[400px] bg-slate-100/50 animate-pulse rounded-3xl border-4 border-slate-200 border-dashed" />)
            ) : (
              (['não iniciado', 'em andamento', 'concluido'] as Status[]).map((colStatus) => {
                const colRecords = filteredRecords.filter(r => r.status === colStatus);
                const colColors = {
                  'não iniciado': { header: 'bg-pink-400', bg: 'bg-pink-50', border: 'border-pink-200' },
                  'em andamento': { header: 'bg-yellow-400', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                  'concluido': { header: 'bg-teal-400', bg: 'bg-teal-50', border: 'border-teal-200' }
                };
                
                return (
                  <div key={colStatus} className="flex flex-col gap-4">
                    <div className={cn(
                      "text-white font-black px-4 py-3 rounded-xl text-center shadow-brutal-sm border-4 border-brand-ink uppercase tracking-tight",
                      colColors[colStatus].header,
                      colStatus === 'em andamento' && "text-brand-ink"
                    )}>
                      {colStatus} ({colRecords.length})
                    </div>
                    
                    <div className={cn(
                      "flex-1 min-h-[500px] rounded-3xl p-4 space-y-4 border-4 border-dashed",
                      colColors[colStatus].bg,
                      colColors[colStatus].border
                    )}>
                      <AnimatePresence mode="popLayout">
                        {colRecords.length > 0 ? (
                          colRecords.map((record) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              key={record.id}
                              className="bg-white p-5 rounded-2xl border-4 border-brand-ink shadow-brutal-sm hover:translate-x-1 hover:-translate-y-1 transition-all group"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h3 className={cn(
                                  "font-black text-lg break-words leading-tight",
                                  record.status === 'concluido' && "line-through text-slate-400"
                                )}>
                                  {record.name}
                                </h3>
                                <button 
                                  onClick={() => handleDelete(record.id)}
                                  className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded border-2 border-brand-ink font-black">
                                  {format(parseISO(record.birth_date), "dd/MM")}
                                </span>
                                {record.notes && (
                                  <p className="text-[10px] text-slate-500 font-bold uppercase truncate flex-1">
                                    {record.notes}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t-2 border-slate-50">
                                <div className="relative">
                                  <select
                                    value={record.status}
                                    onChange={(e) => handleStatusChange(record.id, e.target.value as Status)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-24"
                                  >
                                    <option value="não iniciado">Não Iniciado</option>
                                    <option value="em andamento">Em Andamento</option>
                                    <option value="concluido">Concluído</option>
                                  </select>
                                  <div className="text-[10px] font-black underline decoration-2 underline-offset-2 cursor-pointer flex items-center gap-1">
                                    MOVER PARA <ChevronDown className="w-3 h-3" />
                                  </div>
                                </div>
                                
                                <div className="w-2 h-2 rounded-full bg-brand-ink animate-pulse" />
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center text-center p-8 opacity-40">
                             <p className="text-xs font-black uppercase tracking-widest text-slate-400">Vazio</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Footer Bar */}
      <footer className="bg-brand-ink text-white p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest shrink-0">
        <div className="flex items-center gap-4">
          <span>SUPABASE: {getSupabase() ? 'CLOUD-API' : 'AGUARDANDO CONFIGURAÇÃO'}</span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span className="hidden sm:inline">VERSION: 2.1.0-BRUTAL</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            getSupabase() ? "bg-green-400" : "bg-rose-400"
          )}></span>
          {getSupabase() ? 'VERCEL DEPLOY STATUS: ACTIVE' : 'PENDING CONFIGURATION'}
        </div>
      </footer>
    </div>
  );
}
