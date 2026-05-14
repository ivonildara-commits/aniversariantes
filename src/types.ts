export type Status = 'não iniciado' | 'em andamento' | 'concluido';

export interface BirthdayRecord {
  id: string;
  name: string;
  birth_date: string;
  status: Status;
  created_at: string;
  notes?: string;
}

export interface NewBirthdayRecord {
  name: string;
  birth_date: string;
  status: Status;
  notes?: string;
}
