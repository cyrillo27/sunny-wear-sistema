const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

// Conecta ou cria o banco de dados SQLite
const db = new sqlite3.Database('./sunny_wear.db', (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados', err.message);
  } else {
    console.log('📦 Conectado ao banco de dados SQLite.');
  }
});

// Criação das tabelas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS motoristas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    cnh TEXT,
    telefone TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    placa TEXT,
    modelo TEXT,
    marca TEXT,
    ano INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS jornadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorista_id INTEGER,
    veiculo_id INTEGER,
    data_inicio TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS itinerarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    placa TEXT,
    horario TEXT,
    rua TEXT,
    bairro TEXT,
    cidade TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    placa TEXT,
    velocidade REAL,
    limite INTEGER,
    horario TEXT,
    mensagem TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS manutencoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    placa TEXT,
    tipo TEXT,
    descricao TEXT,
    custo REAL,
    data TEXT
  )`, (err) => {
    if (err) console.error("Erro ao criar tabela manutencoes:", err.message);
    else console.log("✅ Tabela 'manutencoes' verificada/criada com sucesso.");
  });
});

// Rota para Estatísticas do Dashboard (Incluindo Custo Total)
app.get('/api/dashboard/stats', (req, res) => {
  const stats = {};

  db.get(`SELECT COUNT(*) as total FROM motoristas`, [], (err, row) => {
    stats.total_motoristas = row ? row.total : 0;

    db.get(`SELECT COUNT(*) as total FROM veiculos`, [], (err, row) => {
      stats.total_veiculos = row ? row.total : 0;

      db.get(`SELECT COUNT(*) as total FROM jornadas`, [], (err, row) => {
        stats.total_jornadas = row ? row.total : 0;

        db.get(`SELECT COUNT(*) as total FROM alertas`, [], (err, row) => {
          stats.total_alertas = row ? row.total : 0;

          db.get(`SELECT SUM(custo) as custo_total FROM manutencoes`, [], (err, row) => {
            stats.custo_total = row && row.custo_total ? row.custo_total : 0;
            res.json(stats);
          });
        });
      });
    });
  });
});

// Rota para Dados do Gráfico de Alertas por Veículo
app.get('/api/dashboard/grafico-alertas', (req, res) => {
  const query = `
    SELECT placa, COUNT(*) as total 
    FROM alertas 
    GROUP BY placa
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

// Rota para Dados do Gráfico de Turnos por Motorista
app.get('/api/dashboard/grafico-turnos', (req, res) => {
  const query = `
    SELECT m.nome as motorista, COUNT(j.id) as total 
    FROM motoristas m
    LEFT JOIN jornadas j ON m.id = j.motorista_id
    GROUP BY m.id
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

// Rota para Listar Alertas
app.get('/api/alertas', (req, res) => {
  db.all(`SELECT * FROM alertas ORDER BY horario DESC LIMIT 50`, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

// Rotas de Manutenção / Custos
app.post('/api/manutencoes', (req, res) => {
  const { placa, tipo, descricao, custo, data } = req.body;
  
  if (!placa || custo === undefined) {
    return res.status(400).json({ erro: 'Placa e Custo são obrigatórios!' });
  }

  const query = `INSERT INTO manutencoes (placa, tipo, descricao, custo, data) VALUES (?, ?, ?, ?, ?)`;
  
  db.run(query, [placa, tipo, descricao, parseFloat(custo), data], function(err) {
    if (err) {
      console.error("Erro ao inserir manutenção:", err.message);
      return res.status(400).json({ erro: err.message });
    }
    console.log(`✅ Custo salvo com ID: ${this.lastID} para a placa ${placa}`);
    res.json({ mensagem: 'Registro de custo/manutenção salvo com sucesso!', id: this.lastID });
  });
});

app.get('/api/manutencoes', (req, res) => {
  db.all(`SELECT * FROM manutencoes ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar manutenções:", err.message);
      return res.status(500).json({ erro: err.message });
    }
    res.json(rows);
  });
});

app.delete('/api/manutencoes/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM manutencoes WHERE id = ?`, id, function(err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: 'Registro apagado com sucesso!' });
  });
});

// Rota para Cadastrar Motorista
app.post('/api/motoristas', (req, res) => {
  const { nome, cnh, telefone } = req.body;
  const query = `INSERT INTO motoristas (nome, cnh, telefone) VALUES (?, ?, ?)`;
  
  db.run(query, [nome, cnh, telefone], function(err) {
    if (err) return res.status(400).json({ erro: err.message });
    res.json({ mensagem: 'Motorista cadastrado com sucesso!', id: this.lastID });
  });
});

app.get('/api/motoristas', (req, res) => {
  db.all(`SELECT * FROM motoristas`, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.delete('/api/motoristas/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM motoristas WHERE id = ?`, id, function(err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: 'Motorista excluído com sucesso!' });
  });
});

// Rota para Cadastrar Veículo
app.post('/api/veiculos', (req, res) => {
  const { placa, modelo, marca, ano } = req.body;
  const query = `INSERT INTO veiculos (placa, modelo, marca, ano) VALUES (?, ?, ?, ?)`;
  
  db.run(query, [placa, modelo, marca, ano], function(err) {
    if (err) return res.status(400).json({ erro: err.message });
    res.json({ mensagem: 'Veículo cadastrado com sucesso!', id: this.lastID });
  });
});

app.get('/api/veiculos', (req, res) => {
  db.all(`SELECT * FROM veiculos`, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.delete('/api/veiculos/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM veiculos WHERE id = ?`, id, function(err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: 'Veículo excluído com sucesso!' });
  });
});

// Rota para Criar Jornada
app.post('/api/jornadas', (req, res) => {
  const { motorista_id, veiculo_id, data_inicio } = req.body;
  const query = `INSERT INTO jornadas (motorista_id, veiculo_id, data_inicio) VALUES (?, ?, ?)`;
  
  db.run(query, [motorista_id, veiculo_id, data_inicio], function(err) {
    if (err) return res.status(400).json({ erro: err.message });
    res.json({ mensagem: 'Vínculo registrado com sucesso!', id: this.lastID });
  });
});

app.get('/api/jornadas', (req, res) => {
  const query = `
    SELECT j.id, j.data_inicio, m.nome as motorista_nome, v.modelo as veiculo_modelo, v.placa 
    FROM jornadas j
    JOIN motoristas m ON j.motorista_id = m.id
    JOIN veiculos v ON j.veiculo_id = v.id
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

// Rota para Buscar Histórico de Itinerário por Placa e Data
app.get('/api/itinerario/:placa', (req, res) => {
  const { placa } = req.params;
  const { data } = req.query; 
  
  let query = `SELECT * FROM itinerarios WHERE placa = ?`;
  let params = [placa];

  if (data) {
    query += ` AND DATE(horario) = ?`;
    params.push(data);
  }

  query += ` ORDER BY horario DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

// Rota para Consultar Multas
app.get('/api/multas/consultar', (req, res) => {
  const { placa, data } = req.query;
  if (!placa || !data) return res.status(400).json({ erro: 'Informe a placa e a data/hora.' });

  const query = `
    SELECT m.nome, m.telefone, v.modelo, v.placa, j.data_inicio 
    FROM jornadas j
    JOIN motoristas m ON j.motorista_id = m.id
    JOIN veiculos v ON j.veiculo_id = v.id
    WHERE v.placa = ? AND j.data_inicio <= ?
    ORDER BY j.data_inicio DESC
    LIMIT 1
  `;

  db.all(query, [placa, data], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

// Relatório em CSV
const jsonToCsvDetalhado = (items) => {
  const header = ['ID Jornada', 'Motorista', 'CNH', 'Veículo', 'Placa', 'Início da Jornada', 'Data/Hora da Rua', 'Rua Percorrida', 'Bairro', 'Cidade'];
  const rows = items.map(item => [
    item.jornada_id || '',
    item.motorista_nome || 'Não vinculado',
    item.motorista_cnh || '',
    item.veiculo_modelo || '',
    item.placa,
    item.data_inicio || '',
    item.horario_rua || 'Sem registro',
    item.rua || '',
    item.bairro || '',
    item.cidade || ''
  ]);

  return [
    header.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
};

app.get('/api/relatorios/completo.csv', (req, res) => {
  const { data, motorista_id } = req.query;

  let query = `
    SELECT j.id as jornada_id, j.data_inicio, 
           m.id as motorista_id, m.nome as motorista_nome, m.cnh as motorista_cnh, 
           v.modelo as veiculo_modelo, v.placa,
           i.horario as horario_rua, i.rua, i.bairro, i.cidade
    FROM veiculos v
    LEFT JOIN jornadas j ON v.id = j.veiculo_id
    LEFT JOIN motoristas m ON j.motorista_id = m.id
    LEFT JOIN itinerarios i ON v.placa = i.placa
    WHERE 1=1
  `;
  
  let params = [];

  if (data && data !== 'undefined' && data !== '') {
    query += ` AND (DATE(j.data_inicio) = ? OR DATE(i.horario) = ?)`;
    params.push(data, data);
  }

  if (motorista_id && motorista_id !== 'undefined' && motorista_id !== '') {
    query += ` AND m.id = ?`;
    params.push(motorista_id);
  }

  query += ` ORDER BY j.data_inicio DESC, i.horario DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });

    const csv = jsonToCsvDetalhado(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_filtrado.csv');
    res.status(200).send(csv);
  });
});

// WebSocket para posições ao vivo e Alertas de Velocidade
io.on('connection', (socket) => {
  socket.on('atualizar_localizacao', (dados) => {
    io.emit('posicao_motorista', dados);

    const VELOCIDADE_LIMITE = 80;
    const velocidadeAtual = dados.velocidade || 0;

    if (velocidadeAtual > VELOCIDADE_LIMITE) {
      const mensagemAlerta = `Veículo ${dados.placa} ultrapassou o limite! Velocidade: ${velocidadeAtual} km/h`;
      
      const queryAlerta = `INSERT INTO alertas (placa, velocidade, limite, horario, mensagem) VALUES (?, ?, ?, ?, ?)`;
      db.run(queryAlerta, [dados.placa, velocidadeAtual, VELOCIDADE_LIMITE, dados.horario || new Date().toISOString(), mensagemAlerta], (err) => {
        if (!err) {
          io.emit('novo_alerta', {
            placa: dados.placa,
            velocidade: velocidadeAtual,
            limite: VELOCIDADE_LIMITE,
            horario: dados.horario || new Date().toISOString(),
            mensagem: mensagemAlerta
          });
        }
      });
    }
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});