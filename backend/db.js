const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cria o arquivo do banco de dados na pasta backend
const dbPath = path.resolve(__dirname, 'sunny_wear.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao abrir o banco de dados SQLite:", err.message);
  } else {
    console.log("Conectado ao banco de dados SQLite com sucesso!");
    criarTabelas();
  }
});

function criarTabelas() {
  db.serialize(() => {
    // 1. Tabela de Motoristas
    db.run(`
      CREATE TABLE IF NOT EXISTS motoristas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        cnh TEXT NOT NULL,
        telefone TEXT
      )
    `);

    // 2. Tabela de Veículos (Frota Sunny Wear)
    db.run(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placa TEXT UNIQUE NOT NULL,
        modelo TEXT NOT NULL,
        marca TEXT NOT NULL,
        ano INTEGER
      )
    `);

    // 3. Tabela de Vínculos / Jornadas (Fundamental para Multas)
    db.run(`
      CREATE TABLE IF NOT EXISTS jornadas_frota (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        motorista_id INTEGER,
        veiculo_id INTEGER,
        data_inicio TEXT NOT NULL,
        data_fim TEXT,
        FOREIGN KEY(motorista_id) REFERENCES motoristas(id),
        FOREIGN KEY(veiculo_id) REFERENCES veiculos(id)
      )
    `);

    // 4. Tabela de Entregas e Rotas
    db.run(`
      CREATE TABLE IF NOT EXISTS entregas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        motorista_id INTEGER,
        endereco_destino TEXT NOT NULL,
        status TEXT DEFAULT 'Pendente',
        FOREIGN KEY(motorista_id) REFERENCES motoristas(id)
      )
    `, (err) => {
      if (err) {
        console.error("Erro ao criar as tabelas:", err.message);
      } else {
        console.log("Todas as tabelas da Sunny Wear foram criadas com sucesso no SQLite!");
      }
      process.exit(0);
    });
  });
}