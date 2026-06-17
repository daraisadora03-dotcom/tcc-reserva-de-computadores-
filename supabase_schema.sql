-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS (Extensão do Auth do Supabase)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    cpf TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('professor', 'direcao', 'admin')) DEFAULT 'professor',
    email TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE RECURSOS
CREATE TABLE public.recursos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    total_equipamentos INTEGER NOT NULL,
    icone TEXT DEFAULT 'fa-laptop',
    possui_mouse BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE
);

-- 4. TABELA DE RESERVAS
CREATE TABLE public.reservas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurso_id TEXT REFERENCES public.recursos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    data_reserva DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    turma_disciplina TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    status_mouses TEXT DEFAULT 'ok',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recurso_id, data_reserva, horario_inicio)
);

-- 5. TABELA DE MANUTENÇÃO
CREATE TABLE public.manutencoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipamento TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data_reporte TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Em Análise', 'Resolvido')),
    reportado_por UUID REFERENCES public.profiles(id)
);

-- 6. TABELA DE HORÁRIOS FIXOS
CREATE TABLE public.horarios_professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
    horario_inicio TIME NOT NULL,
    turma TEXT NOT NULL,
    disciplina TEXT NOT NULL
);

-- CONFIGURAÇÃO DE SEGURANÇA (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
CREATE POLICY "Visualização pública para autenticados" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Reservas visíveis por todos autenticados" ON public.reservas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários criam suas próprias reservas" ON public.reservas FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Dono ou direção cancelam reservas" ON public.reservas FOR DELETE USING (
    auth.uid() = usuario_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('direcao', 'admin'))
);

-- Recursos: leitura para autenticados, ajuste de capacidade restrito à direção/admin
CREATE POLICY "Recursos visíveis para autenticados" ON public.recursos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Direção/Admin atualizam recursos" ON public.recursos FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('direcao', 'admin'))
);

-- Manutenções: autenticados reportam e veem; direção/admin atualizam o status
CREATE POLICY "Autenticados veem manutenções" ON public.manutencoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados reportam problemas" ON public.manutencoes FOR INSERT WITH CHECK (auth.uid() = reportado_por);
CREATE POLICY "Direção/Admin atualizam manutenções" ON public.manutencoes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('direcao', 'admin'))
);

-- Trigger para criar perfil automaticamente no SignUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, cpf, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'cpf', 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'professor')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Carga Inicial de Recursos
INSERT INTO public.recursos (id, nome, total_equipamentos, icone, possui_mouse) VALUES
('c1', 'Carrinho Vermelho', 40, 'fa-laptop', false),
('c2', 'Carrinho Azul', 40, 'fa-laptop', false),
('lab', 'Lab. Acessa', 15, 'fa-desktop', false),
('tec', 'Nots do Técnico', 40, 'fa-screwdriver-wrench', true),
('sala-tec', 'Sala Técnica', 1, 'fa-server', false)
ON CONFLICT (id) DO NOTHING;