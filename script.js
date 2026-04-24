// --- CONFIGURAÇÕES DE HORÁRIOS ---
const CONFIG = {
    fundamental: {
        inicio: "07:00", fim: "14:00",
        intervalos: [{ inicio: "09:30", fim: "09:50" }, { inicio: "11:30", fim: "12:20" }]
    },
    medio: {
        inicio: "14:15", fim: "21:15",
        intervalos: [{ inicio: "15:55", fim: "16:15" }, { inicio: "18:45", fim: "19:35" }]
    }
};

// --- USUÁRIOS (LOCALSTORAGE) ---
const DEFAULT_USERS = {
    "11111111111": { nome: "Prof. Carlos", senha: "123", role: "professor" },
    "22222222222": { nome: "Prof. Ana", senha: "123", role: "professor" },
    "33333333333": { nome: "Diretora Maria", senha: "admin", role: "direcao" },
    "44444444444": { nome: "Admin TI", senha: "admin", role: "admin" }
};

let USERS = JSON.parse(localStorage.getItem('sge_users')) || DEFAULT_USERS;

function saveUsers() {
    localStorage.setItem('sge_users', JSON.stringify(USERS));
}

// --- RESERVAS (LOCALSTORAGE) ---
function saveReservas() {
    localStorage.setItem('sge_reservas', JSON.stringify(Array.from(estado.reservas.entries())));
}

function loadReservas() {
    const saved = localStorage.getItem('sge_reservas');
    return saved ? new Map(JSON.parse(saved)) : new Map();
}

// --- ESTADO GLOBAL ---
let estado = {
    usuarioLogado: null,
    turnoAtual: 'fundamental',
    recursoSelecionado: { id: 'c1', nome: 'Carrinho 1', total: 40, hasMouse: false },
    dataAtual: new Date(),
    reservas: loadReservas(),
    problemas: [
        { id: 'p1', equipamento: 'Notebook #04 (C1)', descricao: 'Tela piscando intermitente', data: '12/03/2026', previsao: '15/03/2026', status: 'Aberto', reportadoPor: 'Prof. Ana' },
        { id: 'p2', equipamento: 'Tablet #10 (C3)', descricao: 'Não conecta no Wi-Fi', data: '10/03/2026', previsao: '14/03/2026', status: 'Em Análise', reportadoPor: 'Prof. Carlos' }
    ],
    pendencias: [
        { id: 1, nome: "Prof. Rogério Silva", cpf: "555.555.555-55", data: "13/03/2026", obs: "Falta comprovante de residência." },
        { id: 2, nome: "Profa. Cláudia Mendes", cpf: "666.666.666-66", data: "12/03/2026", obs: "Aguardando aprovação da direção." }
    ]
};

// --- GRADE HORÁRIA SIMULADA ---
const MOCK_HORARIOS = {
    "Prof. Carlos": {
        1: [{ hora: "07:00", turma: "9º A", mat: "Matemática" }, { hora: "07:50", turma: "9º B", mat: "Matemática" }, { hora: "10:00", turma: "8º C", mat: "Matemática" }],
        2: [{ hora: "08:40", turma: "7º A", mat: "Matemática" }, { hora: "11:30", turma: "9º A", mat: "Orientação de Estudos" }],
        3: [{ hora: "07:00", turma: "6º B", mat: "Eletiva" }, { hora: "17:05", turma: "3º Médio", mat: "Matemática Avançada" }],
        4: [{ hora: "09:30", turma: "9º B", mat: "Matemática" }],
        5: [{ hora: "07:00", turma: "9º A", mat: "Matemática" }]
    },
    "Prof. Ana": {
        1: [{ hora: "13:00", turma: "1º A", mat: "Português" }],
        3: [{ hora: "17:05", turma: "3º B", mat: "Literatura" }]
    }
};

const LISTA_TURMAS = ["6º A", "6º B", "6º C", "7º A", "7º B", "7º C", "8º A", "8º B", "8º C", "9º A", "9º B", "9º C", "1º A", "1º B", "2º A", "2º B", "3º A", "3º B"];
const LISTA_MATERIAS = ["Matemática", "Português", "História", "Geografia", "Ciências", "Física", "Química", "Biologia", "Inglês", "Artes", "Ed. Física", "Filosofia", "Sociologia", "Projeto de Vida", "Tecnologia", "Eletiva"];

let selTurma = "";
let selMateria = "";

// --- UTILITÁRIOS DE TEMPO ---
const timeToMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const minToTime = (m) => { const h = Math.floor(m / 60); const min = m % 60; return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`; };
const getEl = (id) => document.getElementById(id);

function gerarSlots(turnoKey) {
    const config = CONFIG[turnoKey];
    let atual = timeToMin(config.inicio);
    const fimDia = timeToMin(config.fim);
    const slots = [];
    const duracaoAula = 50;

    const intervalosEmMin = config.intervalos.map(inter => ({
        inicio: timeToMin(inter.inicio),
        fim: timeToMin(inter.fim),
        original: inter
    })).sort((a, b) => a.inicio - b.inicio);

    while (atual < fimDia) {
        const proximoIntervalo = intervalosEmMin.find(inter => inter.inicio >= atual);

        if (proximoIntervalo && atual === proximoIntervalo.inicio) {
            slots.push({ tipo: 'intervalo', inicio: proximoIntervalo.original.inicio, fim: proximoIntervalo.original.fim });
            atual = proximoIntervalo.fim;
            continue;
        }

        const fimAula = atual + duracaoAula;
        if (fimAula > fimDia) break;

        if (proximoIntervalo && fimAula > proximoIntervalo.inicio) {
            atual = proximoIntervalo.inicio;
            continue;
        }

        slots.push({ tipo: 'aula', inicio: minToTime(atual), fim: minToTime(fimAula) });
        atual = fimAula;
    }
    return slots;
}

// --- PAINEL LATERAL (TURMAS/MATÉRIAS) ---
function renderSidePanel() {
    const divTurmas = getEl('list-turmas');
    const divMaterias = getEl('list-materias');
    divTurmas.innerHTML = '';
    divMaterias.innerHTML = '';

    LISTA_TURMAS.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.innerText = t;
        btn.onclick = () => {
            selTurma = t;
            updateInputReserva();
            document.querySelectorAll('#list-turmas .tag-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
        divTurmas.appendChild(btn);
    });

    LISTA_MATERIAS.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.innerText = m;
        btn.onclick = () => {
            selMateria = m;
            updateInputReserva();
            document.querySelectorAll('#list-materias .tag-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
        divMaterias.appendChild(btn);
    });
}

function updateInputReserva() {
    const input = getEl('res-turma');
    if (selTurma && selMateria) input.value = `${selTurma} - ${selMateria}`;
    else if (selTurma) input.value = selTurma;
    else if (selMateria) input.value = selMateria;
}

// --- CALENDÁRIO ---
function renderCalendar() {
    const grid = getEl('calendar-body');
    grid.innerHTML = '';

    const ano = estado.dataAtual.getFullYear();
    const mes = estado.dataAtual.getMonth();

    getEl('current-month').innerText = new Date(ano, mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const primeiroDiaDoMes = new Date(ano, mes, 1);
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    let diaSemanaInicio = primeiroDiaDoMes.getDay();
    let padding = (diaSemanaInicio > 0 && diaSemanaInicio < 6) ? diaSemanaInicio - 1 : 0;

    for (let i = 0; i < padding; i++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell other-month';
        grid.appendChild(cell);
    }

    const slotsDoTurno = gerarSlots(estado.turnoAtual);

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataLoop = new Date(ano, mes, dia);
        if (dataLoop.getDay() === 0 || dataLoop.getDay() === 6) continue;

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerHTML = `<span class="day-number">${dia}</span>`;

        const container = document.createElement('div');
        container.className = 'slots-container';

        slotsDoTurno.forEach(slot => {
            const divSlot = document.createElement('div');
            divSlot.innerText = `${slot.inicio} - ${slot.fim}`;
            divSlot.className = `slot ${slot.tipo === 'intervalo' ? 'intervalo' : 'livre'}`;
            const idUnico = `${dia}-${mes}-${ano}-${slot.inicio}-${estado.recursoSelecionado.id}`;

            if (slot.tipo === 'aula') {
                if (estado.reservas.has(idUnico)) {
                    const reserva = estado.reservas.get(idUnico);
                    divSlot.classList.replace('livre', 'ocupado');
                    divSlot.innerHTML = `<span style="font-size:0.75rem">${slot.inicio}</span><br><strong>${reserva.turma || 'Reservado'}</strong>`;
                    divSlot.title = `Prof: ${reserva.professor}\nTurma: ${reserva.turma}\nQtd: ${reserva.qtd}`;
                } else {
                    divSlot.onclick = () => abrirModalReserva(dia, mes, ano, slot.inicio, idUnico);
                }
            }
            container.appendChild(divSlot);
        });

        cell.appendChild(container);
        grid.appendChild(cell);
    }
}

// --- MODAL DE RESERVA ---
function abrirModalReserva(dia, mes, ano, hora, idUnico) {
    estado.slotClicado = { idUnico, dia, mes, ano, hora };

    getEl('res-recurso').innerText = estado.recursoSelecionado.nome;
    getEl('res-data').innerText = `${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;
    getEl('res-hora').innerText = hora;

    const qtdInput = getEl('qtd-retirada');
    qtdInput.max = estado.recursoSelecionado.total;
    qtdInput.value = estado.recursoSelecionado.total;

    const inputTurma = getEl('res-turma');
    const infoBox = getEl('aula-sugerida-box');
    const infoTexto = getEl('aula-sugerida-texto');

    inputTurma.value = '';
    infoBox.style.display = 'none';
    selTurma = ""; selMateria = "";
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('selected'));
    if (getEl('reserva-content')) getEl('reserva-content').classList.remove('expanded');

    const diaSemana = new Date(ano, mes, dia).getDay();
    const nomeProf = estado.usuarioLogado.nome;

    if (MOCK_HORARIOS[nomeProf] && MOCK_HORARIOS[nomeProf][diaSemana]) {
        const aulaEncontrada = MOCK_HORARIOS[nomeProf][diaSemana].find(a => a.hora === hora);
        if (aulaEncontrada) {
            const textoAula = `${aulaEncontrada.turma} - ${aulaEncontrada.mat}`;
            inputTurma.value = textoAula;
            infoTexto.innerText = textoAula;
            infoBox.style.display = 'block';
        }
    }

    getEl('mouse-check-group').style.display = estado.recursoSelecionado.hasMouse ? 'block' : 'none';
    getEl('modal-reserva').style.display = 'flex';
}

// --- PAINEL ADMIN ---
function renderAdminView(filter = '') {
    const problemasEl = getEl('admin-problemas-list');
    const usersEl = getEl('admin-users-list');
    const pendenciasEl = getEl('admin-pendencias-list');

    problemasEl.innerHTML = '';
    if (estado.problemas.length === 0) {
        problemasEl.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum equipamento em manutenção.</td></tr>';
    } else {
        [...estado.problemas].reverse().forEach(problema => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${problema.equipamento}</strong></td>
                <td>${problema.descricao}</td>
                <td>${problema.data}</td>
                <td><span class="status-badge erro">${problema.previsao}</span></td>
                <td>
                    <button class="action-btn btn-resolve" onclick="this.closest('tr').remove(); alert('Manutenção concluída para ${problema.equipamento}');">
                        <i class="fa-solid fa-check"></i> Concluir
                    </button>
                </td>`;
            problemasEl.appendChild(row);
        });
    }

    usersEl.innerHTML = '';
    const filtrados = Object.keys(USERS).filter(cpf =>
        USERS[cpf].nome.toLowerCase().includes(filter) || cpf.includes(filter)
    );

    if (filtrados.length === 0) {
        usersEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">Nenhum usuário encontrado.</td></tr>';
    } else {
        filtrados.forEach(cpf => {
            const u = USERS[cpf];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.nome}</td>
                <td>${cpf}</td>
                <td><span class="status-badge ${u.role === 'admin' || u.role === 'direcao' ? 'pendente' : 'ok'}">${u.role}</span></td>
                <td>
                    <button class="action-btn" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn btn-delete" title="Remover"><i class="fa-solid fa-trash"></i></button>
                </td>`;
            usersEl.appendChild(tr);
        });
    }

    pendenciasEl.innerHTML = '';
    getEl('badge-pend').style.display = estado.pendencias.length > 0 ? 'inline-block' : 'none';
    getEl('badge-pend').innerText = estado.pendencias.length;

    if (estado.pendencias.length === 0) {
        pendenciasEl.innerHTML = '<p style="text-align: center; color: #777;">Nenhuma pendência encontrada.</p>';
    } else {
        estado.pendencias.forEach(p => {
            const pCard = document.createElement('div');
            pCard.className = 'pending-card';
            pCard.innerHTML = `
                <div class="pending-info">
                    <h5>${p.nome} <span style="font-weight:normal; font-size:0.8rem; color:#777;">(CPF: ${p.cpf})</span></h5>
                    <p><i class="fa-solid fa-circle-exclamation" style="color:var(--yellow-warn);"></i> ${p.obs} - Desde: ${p.data}</p>
                </div>
                <button class="action-btn btn-approve" onclick="alert('Cadastro de ${p.nome} aprovado!'); this.parentElement.remove();">
                    <i class="fa-solid fa-check"></i> Aprovar
                </button>`;
            pendenciasEl.appendChild(pCard);
        });
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {

    window.addEventListener('storage', (e) => {
        if (e.key === 'sge_reservas') {
            estado.reservas = loadReservas();
            renderCalendar();
        }
    });

    // Login
    getEl('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const cpf = getEl('cpf').value.replace(/\D/g, '');
        const senha = getEl('senha').value;
        const user = USERS[cpf];

        if (user && user.senha === senha) {
            estado.usuarioLogado = user;
            getEl('user-name').innerText = user.nome;
            const isAdmin = user.role === 'direcao' || user.role === 'admin';
            getEl('btn-admin').style.display = isAdmin ? 'flex' : 'none';
            getEl('login-screen').style.display = 'none';
            getEl('app-screen').style.display = 'flex';
            renderCalendar();
        } else {
            alert("CPF ou senha incorretos.");
        }
    });

    getEl('link-auto-cadastro').addEventListener('click', (e) => {
        e.preventDefault();
        getEl('cad-role').style.display = 'none';
        getEl('lbl-cad-role').style.display = 'none';
        getEl('cad-role').value = 'professor';
        getEl('modal-cadastro').style.display = 'flex';
    });

    getEl('logout-btn').addEventListener('click', () => location.reload());

    // Recursos
    getEl('recursos-list').addEventListener('click', (e) => {
        const li = e.target.closest('li[data-id]');
        if (!li) return;
        document.querySelectorAll('#recursos-list li').forEach(l => l.classList.remove('active'));
        li.classList.add('active');
        estado.recursoSelecionado = {
            id: li.dataset.id,
            nome: li.innerText.trim(),
            total: parseInt(li.dataset.total),
            hasMouse: li.dataset.hasMouse === "true"
        };
        renderCalendar();
    });

    // Turnos
    getEl('btn-fundamental').addEventListener('click', () => {
        estado.turnoAtual = 'fundamental';
        getEl('btn-fundamental').classList.add('active');
        getEl('btn-medio').classList.remove('active');
        renderCalendar();
    });
    getEl('btn-medio').addEventListener('click', () => {
        estado.turnoAtual = 'medio';
        getEl('btn-medio').classList.add('active');
        getEl('btn-fundamental').classList.remove('active');
        renderCalendar();
    });

    // Navegação do calendário
    getEl('prev-month').addEventListener('click', () => { estado.dataAtual.setMonth(estado.dataAtual.getMonth() - 1); renderCalendar(); });
    getEl('next-month').addEventListener('click', () => { estado.dataAtual.setMonth(estado.dataAtual.getMonth() + 1); renderCalendar(); });

    // Botões do menu
    getEl('btn-manutencao').addEventListener('click', () => getEl('modal-manutencao').style.display = 'flex');
    getEl('btn-sala-tecnica').addEventListener('click', () => getEl('modal-sala-tecnica').style.display = 'flex');
    getEl('btn-admin').addEventListener('click', () => {
        renderAdminView();
        getEl('modal-admin').style.display = 'flex';
    });
    getEl('btn-novo-usuario').addEventListener('click', () => {
        getEl('cad-role').style.display = 'block';
        getEl('lbl-cad-role').style.display = 'block';
        getEl('cad-role').value = 'professor';
        getEl('modal-cadastro').style.display = 'flex';
    });

    // Fechar modais
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
            if (getEl('reserva-content')) getEl('reserva-content').classList.remove('expanded');
        });
    });

    // Painel lateral de turmas/matérias
    getEl('btn-toggle-list').addEventListener('click', () => {
        getEl('reserva-content').classList.toggle('expanded');
        renderSidePanel();
    });

    // Busca de usuários no admin
    getEl('search-prof').addEventListener('keyup', (e) => renderAdminView(e.target.value.toLowerCase()));

    // Abas do admin
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            getEl(btn.dataset.target).classList.add('active');
        });
    });

    // Confirmar reserva
    getEl('form-reserva').addEventListener('submit', (e) => {
        e.preventDefault();
        const qtd = getEl('qtd-retirada').value;
        const turma = getEl('res-turma').value;
        if (estado.slotClicado) {
            const { idUnico, dia, mes, ano, hora } = estado.slotClicado;
            estado.reservas.set(idUnico, {
                id: idUnico,
                recursoNome: estado.recursoSelecionado.nome,
                data: `${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`,
                hora, turma, qtd,
                professor: estado.usuarioLogado.nome
            });
            saveReservas();
            alert(`Reserva confirmada!\nRecurso: ${estado.recursoSelecionado.nome}\nLembre-se de carregar os aparelhos!`);
            renderCalendar();
        }
        getEl('modal-reserva').style.display = 'none';
    });

    // Reportar manutenção
    getEl('form-manutencao').addEventListener('submit', (e) => {
        e.preventDefault();
        estado.problemas.push({
            id: `prob-${Date.now()}`,
            equipamento: getEl('manut-equipamento').value,
            descricao: getEl('manut-descricao').value,
            data: new Date().toLocaleString('pt-BR'),
            previsao: 'A definir',
            status: 'Aberto',
            reportadoPor: estado.usuarioLogado.nome
        });
        alert('Relatório de manutenção enviado!');
        e.target.reset();
        getEl('modal-manutencao').style.display = 'none';
    });

    // Cadastro de usuário
    getEl('form-cadastro').addEventListener('submit', (e) => {
        e.preventDefault();
        const cpf = getEl('cad-cpf').value.replace(/\D/g, '');
        if (USERS[cpf]) { alert('Erro: CPF já cadastrado!'); return; }
        USERS[cpf] = {
            nome: getEl('cad-nome').value,
            email: getEl('cad-email').value,
            senha: getEl('cad-senha').value,
            role: getEl('cad-role').value
        };
        saveUsers();
        alert('Usuário cadastrado com sucesso!');
        e.target.reset();
        getEl('modal-cadastro').style.display = 'none';
        renderAdminView();
    });
});
