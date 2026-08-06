const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'COLE_SUA_DATABASE_URL_AQUI',
  ssl: { rejectUnauthorized: false }
});

async function popular() {
  try {
    // 1. Inserir motorista
    const mot = await pool.query(
      `INSERT INTO motoristas (nome, cnh, telefone) VALUES ('Leandro', '123456789', '11999999999') RETURNING id`
    );
    const motoristaId = mot.rows[0].id;

    // 2. Inserir veículo
    const vei = await pool.query(
      `INSERT INTO veiculos (placa, modelo, marca, ano) VALUES ('ABC-1234', 'Fiorino', 'Fiat', 2023) RETURNING id`
    );
    const veiculoId = vei.rows[0].id;

    // 3. Inserir jornada (para o gráfico de pizza funcionar)
    await pool.query(
      `INSERT INTO jornadas (motorista_id, veiculo_id, data_inicio) VALUES ($1, $2, NOW())`,
      [motoristaId, veiculoId]
    );

    // 4. Inserir alerta (para o gráfico de barras funcionar)
    await pool.query(
      `INSERT INTO alertas (placa, mensagem, horario) VALUES ('ABC-1234', 'Excesso de velocidade detectado: 95 km/h', NOW())`
    );

    console.log("Banco populado com sucesso com dados de teste!");
    process.exit();
  } catch (err) {
    console.error("Erro ao popular banco:", err);
    process.exit(1);
  }
}

popular();