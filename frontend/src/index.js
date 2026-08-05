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
    methods: ["GET", "POST"]
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
});

// Rota para Cadastrar Motorista
app.post('/api/motoristas', (req, res) => {
  const { nome, cnh, telefone } = req.body;
  const query = `INSERT INTO motoristas (nome, cnh, telefone) VALUES (?, ?, ?)`;
  
  db.run(query, [nome, cnh, telefone], function(err) {
    if (err) {
      return res.status(400).json({ erro: err.message });
    }
    console.log(`✅ Motorista ${nome} salvo com ID ${this.lastID}`);
    res.json({ mensagem: 'Motorista cadastrado com sucesso!', id: this.lastID });
  });
});

// Rota para Listar Motoristas
app.get('/api/motoristas', (req, res) => {
  db.all(`SELECT * FROM motoristas`, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
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

// Rota para Listar Veículos
app.get('/api/veiculos', (req, res) => {
  db.all(`SELECT * FROM veiculos`, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
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

// Rota para Listar Jornadas
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

// WebSocket para posições ao vivo
io.on('connection', (socket) => {
  socket.on('atualizar_localizacao', (dados) => {
    io.emit('posicao_motorista', dados);
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});