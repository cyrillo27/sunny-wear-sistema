const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

// Conexão com o Banco de Dados PostgreSQL (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'sua_string_de_conexao_aqui',
  ssl: { rejectUnauthorized: false }
});

// Criar Tabelas caso não existam
async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS motoristas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cnh VARCHAR(50) NOT NULL,
        telefone VARCHAR(30)
      );

      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) UNIQUE NOT NULL,
        modelo VARCHAR(50) NOT NULL,
        marca VARCHAR(50) NOT NULL,
        ano INT
      );

      CREATE TABLE IF NOT EXISTS jornadas (
        id SERIAL PRIMARY KEY,
        motorista_id INT REFERENCES motoristas(id) ON DELETE CASCADE,
        veiculo_id INT REFERENCES veiculos(id) ON DELETE CASCADE,
        data_inicio TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS posicoes (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        velocidade INT NOT NULL,
        rua VARCHAR(255),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        horario TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS alertas (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL,
        mensagem TEXT NOT NULL,
        horario TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS manutencoes (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(20) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        descricao TEXT NOT NULL,
        custo DECIMAL(10,2) NOT NULL,
        data DATE NOT NULL
      );
    `);
    console.log("Tabelas verificadas/criadas com sucesso no banco de dados.");
  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}
criarTabelas();

// ==================== ROTAS DE MOTORISTAS ====================
app.get('/api/motoristas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM motoristas ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/motoristas', async (req, res) => {
  const { nome, cnh, telefone } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO motoristas (nome, cnh, telefone) VALUES ($1, $2, $3) RETURNING *',
      [nome, cnh, telefone]
    );
    res.json({ mensagem: 'Motorista cadastrado com sucesso!', motorista: result.rows[0] });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/motoristas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM motoristas WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Motorista removido com sucesso!' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ==================== ROTAS DE VEÍCULOS ====================
app.get('/api/veiculos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM veiculos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/veiculos', async (req, res) => {
  const { placa, modelo, marca, ano } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO veiculos (placa, modelo, marca, ano) VALUES ($1, $2, $3, $4) RETURNING *',
      [placa.toUpperCase(), modelo, marca, ano]
    );
    res.json({ mensagem: 'Veículo cadastrado com sucesso!', veiculo: result.rows[0] });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/veiculos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM veiculos WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Veículo removido com sucesso!' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ==================== ROTAS DE JORNADAS ====================
app.get('/api/jornadas', async (req, res) => {
  try {
    const query = `
      SELECT j.id, m.nome as motorista_nome, v.modelo as veiculo_modelo, v.placa, j.data_inicio
      FROM jornadas j
      JOIN motoristas m ON j.motorista_id = m.id
      JOIN veiculos v ON j.veiculo_id = v.id
      ORDER BY j.id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/jornadas', async (req, res) => {
  const { motorista_id, veiculo_id, data_inicio } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO jornadas (motorista_id, veiculo_id, data_inicio) VALUES ($1, $2, $3) RETURNING *',
      [motorista_id, veiculo_id, data_inicio]
    );
    res.json({ mensagem: 'Jornada vinculada com sucesso!', jornada: result.rows[0] });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ==================== ROTAS DE MANUTENÇÕES / CUSTOS ====================
app.get('/api/manutencoes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM manutencoes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/manutencoes', async (req, res) => {
  const { placa, tipo, descricao, custo, data } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO manutencoes (placa, tipo, descricao, custo, data) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [placa.toUpperCase(), tipo, descricao, custo, data]
    );
    res.json({ mensagem: 'Custo registrado com sucesso!', manutencao: result.rows[0] });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/manutencoes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM manutencoes WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Registro de custo removido com sucesso!' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ==================== ROTA MOBILE: ABASTECIMENTO ====================
app.post('/api/mobile/abastecimento', async (req, res) => {
  const { placa, valor } = req.body;
  try {
    const dataAtual = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      'INSERT INTO manutencoes (placa, tipo, descricao, custo, data) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [placa.toUpperCase(), 'Combustível', 'Abastecimento via App Mobile', valor, dataAtual]
    );
    res.status(201).json({ mensagem: 'Abastecimento registrado com sucesso!', manutencao: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ==================== ROTAS DE ITINERÁRIO E ALERTAS ====================
app.get('/api/itinerario/:placa', async (req, res) => {
  const { placa } = req.params;
  const { data } = req.query;
  try {
    let query = 'SELECT placa, rua, horario FROM posicoes WHERE placa = $1';
    let params = [placa.toUpperCase()];
    if (data) {
      query += ' AND DATE(horario) = $2';
      params.push(data);
    }
    query += ' ORDER BY horario DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/api/alertas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM alertas ORDER BY id DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/api/multas/consultar', async (req, res) => {
  const { placa, data } = req.query;
  try {
    const query = `
      SELECT m.nome, m.telefone, v.modelo, v.placa, j.data_inicio
      FROM jornadas j
      JOIN motoristas m ON j.motorista_id = m.id
      JOIN veiculos v ON j.veiculo_id = v.id
      WHERE v.placa = $1 AND j.data_inicio <= $2
      ORDER BY j.data_inicio DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [placa.toUpperCase(), data]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ==================== DASHBOARD & ESTATÍSTICAS ====================
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const mot = await pool.query('SELECT COUNT(*) FROM motoristas');
    const vei = await pool.query('SELECT COUNT(*) FROM veiculos');
    const jor = await pool.query('SELECT COUNT(*) FROM jornadas');
    const alt = await pool.query('SELECT COUNT(*) FROM alertas');
    const cus = await pool.query('SELECT SUM(custo) as total FROM manutencoes');

    res.json({
      total_motoristas: parseInt(mot.rows[0].count),
      total_veiculos: parseInt(vei.rows[0].count),
      total_jornadas: parseInt(jor.rows[0].count),
      total_alertas: parseInt(alt.rows[0].count),
      custo_total: parseFloat(cus.rows[0].total || 0)
    });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/api/dashboard/grafico-alertas', async (req, res) => {
  try {
    const query = `SELECT placa, CAST(COUNT(*) AS INTEGER) as total FROM alertas GROUP BY placa`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/api/dashboard/grafico-turnos', async (req, res) => {
  try {
    const query = `
      SELECT INITCAP(m.nome) as motorista, CAST(COUNT(j.id) AS INTEGER) as total
      FROM jornadas j
      JOIN motoristas m ON j.motorista_id = m.id
      GROUP BY INITCAP(m.nome)
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ==================== RELATÓRIO EXCEL (CSV PERFEITO COM PONTO E VÍRGULA) ====================
app.get('/api/relatorios/completo.csv', async (req, res) => {
  const { data, motorista_id } = req.query;
  try {
    let query = `
      SELECT j.id as id_jornada, m.nome as motorista, m.cnh, v.modelo as veiculo, v.placa, 
             j.data_inicio, p.horario as data_rua, p.rua, p.bairro, p.cidade
      FROM jornadas j
      JOIN motoristas m ON j.motorista_id = m.id
      JOIN veiculos v ON j.veiculo_id = v.id
      LEFT JOIN posicoes p ON p.placa = v.placa
      WHERE 1=1
    `;
    let params = [];
    let paramIndex = 1;

    if (data) {
      query += ` AND DATE(j.data_inicio) = $${paramIndex}`;
      params.push(data);
      paramIndex++;
    }
    if (motorista_id) {
      query += ` AND m.id = $${paramIndex}`;
      params.push(motorista_id);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_frota.csv');
    
    res.write('\ufeff');
    res.write('ID Jornada;Motorista;CNH;Veiculo;Placa;Inicio da Jornada;Data/Hora da Rua;Rua Percorrida;Bairro;Cidade\n');

    result.rows.forEach(row => {
      const linha = [
        row.id_jornada,
        `"${(row.motorista || '').replace(/"/g, '""')}"`,
        `"${(row.cnh || '').replace(/"/g, '""')}"`,
        `"${(row.veiculo || '').replace(/"/g, '""')}"`,
        row.placa,
        row.data_inicio,
        row.data_rua || '',
        `"${(row.rua || 'Não registrada').replace(/"/g, '""')}"`,
        `"${(row.bairro || '').replace(/"/g, '""')}"`,
        `"${(row.cidade || '').replace(/"/g, '""')}"`
      ].join(';');

      res.write(linha + '\n');
    });

    res.end();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ==================== WEBSOCKET (GPS & ALERTAS) ====================
io.on('connection', (socket) => {
  console.log('Cliente conectado ao WebSocket:', socket.id);

  socket.on('atualizar_localizacao', async (dados) => {
    const { placa, latitude, longitude, velocidade, horario } = dados;
    const rua = "Av. Paulista, 1000"; 
    const bairro = "Bela Vista";
    const cidade = "São Paulo";

    try {
      await pool.query(
        'INSERT INTO posicoes (placa, latitude, longitude, velocidade, rua, bairro, cidade, horario) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [placa.toUpperCase(), latitude, longitude, velocidade, rua, bairro, cidade, horario]
      );

      if (velocidade > 80) {
        const mensagemAlerta = `Veículo ${placa.toUpperCase()} ultrapassou o limite de velocidade (${velocidade} km/h)`;
        const alertaRes = await pool.query(
          'INSERT INTO alertas (placa, mensagem, horario) VALUES ($1, $2, $3) RETURNING *',
          [placa.toUpperCase(), mensagemAlerta, horario]
        );
        io.emit('novo_alerta', alertaRes.rows[0]);
      }

      io.emit('posicao_motorista', { placa: placa.toUpperCase(), latitude, longitude, velocidade, rua, horario });
    } catch (err) {
      console.error("Erro ao processar posição:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});