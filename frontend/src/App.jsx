import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Truck, Users, Link as LinkIcon, ShieldAlert, MapPin, List, History, Navigation, Trash2, PlusCircle, FileDown, LayoutDashboard, Bell, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const socket = io('http://localhost:3001');
const COLORS = ['#0284c7', '#059669', '#7c3aed', '#dc2626', '#d97706', '#475569'];

export default function App() {
  const [aba, setAba] = useState('dashboard');

  const [nome, setNome] = useState('');
  const [cnh, setCnh] = useState('');
  const [telefone, setTelefone] = useState('');

  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [marca, setMarca] = useState('');
  const [ano, setAno] = useState('');

  const [motoristasList, setMotoristasList] = useState([]);
  const [veiculosList, setVeiculosList] = useState([]);
  const [jornadasList, setJornadasList] = useState([]);
  
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('');
  const [veiculoSelecionado, setVeiculoSelecionado] = useState('');
  const [dataIniciada, setDataIniciada] = useState('');

  const [buscaPlaca, setBuscaPlaca] = useState('');
  const [buscaData, setBuscaData] = useState('');
  const [resultadoMulta, setResultadoMulta] = useState([]);

  const [placaItinerario, setPlacaItinerario] = useState('');
  const [dataItinerario, setDataItinerario] = useState('');
  const [historicoItinerario, setHistoricoItinerario] = useState([]);

  // Estados para Manutenção / Custos
  const [placaManutencao, setPlacaManutencao] = useState('');
  const [tipoManutencao, setTipoManutencao] = useState('Combustível');
  const [descricaoManutencao, setDescricaoManutencao] = useState('');
  const [custoManutencao, setCustoManutencao] = useState('');
  const [dataManutencao, setDataManutencao] = useState(new Date().toISOString().split('T')[0]);
  const [manutencoesList, setManutencoesList] = useState([]);

  // Estados para Filtro, Dashboard Stats e Gráficos
  const [filtroDataRelatorio, setFiltroDataRelatorio] = useState('');
  const [filtroMotoristaRelatorio, setFiltroMotoristaRelatorio] = useState('');
  const [stats, setStats] = useState({ total_motoristas: 0, total_veiculos: 0, total_jornadas: 0, total_alertas: 0, custo_total: 0 });
  const [alertasList, setAlertasList] = useState([]);
  
  const [dadosGraficoAlertas, setDadosGraficoAlertas] = useState([]);
  const [dadosGraficoTurnos, setDadosGraficoTurnos] = useState([]);

  const [posicoesAoVivo, setPosicoesAoVivo] = useState({});

  useEffect(() => {
    carregarDados();
    carregarStats();
    carregarAlertas();
    carregarManutencoes();
    carregarGraficos();

    socket.on('posicao_motorista', (dados) => {
      setPosicoesAoVivo(prev => ({
        ...prev,
        [dados.placa]: dados
      }));
    });

    socket.on('novo_alerta', (alerta) => {
      setAlertasList(prev => [alerta, ...prev]);
      carregarStats();
      carregarGraficos();
    });

    return () => {
      socket.off('posicao_motorista');
      socket.off('novo_alerta');
    };
  }, []);

  useEffect(() => {
    carregarStats();
    carregarGraficos();
    carregarManutencoes();
  }, [aba]);

  const carregarDados = async () => {
    try {
      const resMot = await fetch('http://localhost:3001/api/motoristas');
      setMotoristasList(await resMot.json());
      
      const resVei = await fetch('http://localhost:3001/api/veiculos');
      const veiData = await resVei.json();
      setVeiculosList(veiData);
      if (veiData.length > 0 && !placaManutencao) {
        setPlacaManutencao(veiData[0].placa);
      }

      const resJor = await fetch('http://localhost:3001/api/jornadas');
      setJornadasList(await resJor.json());
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    }
  };

  const carregarStats = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Erro ao carregar estatísticas", e);
    }
  };

  const carregarAlertas = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/alertas');
      setAlertasList(await res.json());
    } catch (e) {
      console.error("Erro ao carregar alertas", e);
    }
  };

  const carregarManutencoes = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/manutencoes');
      setManutencoesList(await res.json());
    } catch (e) {
      console.error("Erro ao carregar manutenções", e);
    }
  };

  const carregarGraficos = async () => {
    try {
      const resAlertas = await fetch('http://localhost:3001/api/dashboard/grafico-alertas');
      setDadosGraficoAlertas(await resAlertas.json());

      const resTurnos = await fetch('http://localhost:3001/api/dashboard/grafico-turnos');
      setDadosGraficoTurnos(await resTurnos.json());
    } catch (e) {
      console.error("Erro ao carregar gráficos", e);
    }
  };

  const cadastrarMotorista = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3001/api/motoristas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cnh, telefone })
    });
    const data = await res.json();
    alert(data.mensagem || data.erro);
    setNome(''); setCnh(''); setTelefone('');
    carregarDados();
    carregarStats();
    carregarGraficos();
  };

  const deletarMotorista = async (id) => {
    if (!confirm("Deseja realmente apagar este motorista?")) return;
    await fetch(`http://localhost:3001/api/motoristas/${id}`, { method: 'DELETE' });
    carregarDados();
    carregarStats();
    carregarGraficos();
  };

  const cadastrarVeiculo = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3001/api/veiculos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placa, modelo, marca, ano })
    });
    const data = await res.json();
    alert(data.mensagem || data.erro);
    setPlaca(''); setModelo(''); setMarca(''); setAno('');
    carregarDados();
    carregarStats();
    carregarGraficos();
  };

  const deletarVeiculo = async (id) => {
    if (!confirm("Deseja realmente apagar este veículo?")) return;
    await fetch(`http://localhost:3001/api/veiculos/${id}`, { method: 'DELETE' });
    carregarDados();
    carregarStats();
    carregarGraficos();
  };

  const cadastrarManutencao = async (e) => {
    e.preventDefault();
    const placaSelecionada = placaManutencao || (veiculosList.length > 0 ? veiculosList[0].placa : '');
    
    if (!placaSelecionada) {
      alert("Selecione um veículo.");
      return;
    }

    const res = await fetch('http://localhost:3001/api/manutencoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placa: placaSelecionada,
        tipo: tipoManutencao,
        descricao: descricaoManutencao,
        custo: parseFloat(custoManutencao),
        data: dataManutencao
      })
    });
    
    const data = await res.json();
    alert(data.mensagem || data.erro);
    setDescricaoManutencao(''); 
    setCustoManutencao('');
    carregarManutencoes();
    carregarStats();
  };

  const deletarManutencao = async (id) => {
    if (!confirm("Deseja realmente apagar este registro de custo?")) return;
    await fetch(`http://localhost:3001/api/manutencoes/${id}`, { method: 'DELETE' });
    carregarManutencoes();
    carregarStats();
  };

  const criarJornada = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3001/api/jornadas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motorista_id: motoristaSelecionado,
        veiculo_id: veiculoSelecionado,
        data_inicio: dataIniciada
      })
    });
    const data = await res.json();
    alert(data.mensagem || data.erro);
    carregarDados();
    carregarStats();
    carregarGraficos();
  };

  const consultarMulta = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:3001/api/multas/consultar?placa=${buscaPlaca}&data=${buscaData}`);
    const data = await res.json();
    setResultadoMulta(data);
  };

  const buscarItinerario = async (e) => {
    e.preventDefault();
    if (!placaItinerario) return;
    let url = `http://localhost:3001/api/itinerario/${placaItinerario}`;
    if (dataItinerario) {
      url += `?data=${dataItinerario}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    setHistoricoItinerario(data);
  };

  const simularMovimento = (placaVeiculo) => {
    let lat = -23.5505 + (Math.random() - 0.5) * 0.02;
    let lng = -46.6333 + (Math.random() - 0.5) * 0.02;

    const intervalo = setInterval(() => {
      lat += (Math.random() - 0.5) * 0.002;
      lng += (Math.random() - 0.5) * 0.002;
      const velocidadeSimulada = Math.floor(Math.random() * 40) + 50; 

      socket.emit('atualizar_localizacao', {
        placa: placaVeiculo,
        latitude: lat,
        longitude: lng,
        velocidade: velocidadeSimulada,
        horario: new Date().toISOString()
      });
    }, 2000);

    alert(`Simulação ao vivo iniciada para o veículo ${placaVeiculo}! Veja na aba Ao Vivo.`);
  };

  const getTabStyle = (nomeAba) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    background: aba === nomeAba ? '#0284c7' : '#334155',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    transition: 'all 0.2s ease',
    boxShadow: aba === nomeAba ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
  });

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '24px', background: '#f1f5f9', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* HEADER */}
      <header style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '24px 32px', borderRadius: '12px', marginBottom: '28px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div style={{ background: '#0284c7', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px' }}>☀️</span>
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>Sunny Wear</h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Sistema de Gestão de Frotas e Logística</p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <button onClick={() => setAba('dashboard')} style={getTabStyle('dashboard')}><LayoutDashboard size={15}/> Dashboard</button>
          <button onClick={() => setAba('cadastros')} style={getTabStyle('cadastros')}><PlusCircle size={15}/> Cadastros</button>
          <button onClick={() => setAba('listas')} style={getTabStyle('listas')}><List size={15} /> Frota</button>
          <button onClick={() => setAba('jornadas')} style={getTabStyle('jornadas')}><LinkIcon size={15} /> Vincular</button>
          <button onClick={() => setAba('historico')} style={getTabStyle('historico')}><History size={15} /> Turnos</button>
          <button onClick={() => setAba('itinerario')} style={getTabStyle('itinerario')}><Navigation size={15} /> Ruas</button>
          <button onClick={() => setAba('multas')} style={getTabStyle('multas')}><ShieldAlert size={15} /> Multas</button>
          <button onClick={() => setAba('manutencoes')} style={getTabStyle('manutencoes')}><Wrench size={15} /> Custos</button>
          <button onClick={() => setAba('aovivo')} style={getTabStyle('aovivo')}><MapPin size={15} /> Ao Vivo</button>
          <button onClick={() => setAba('alertas')} style={getTabStyle('alertas')}>
            <Bell size={15} /> Alertas {alertasList.length > 0 && `(${alertasList.length})`}
          </button>
          <button onClick={() => setAba('relatorios')} style={getTabStyle('relatorios')}><FileDown size={15} /> Relatórios</button>
        </div>
      </header>

      {/* CONTEÚDO DAS ABAS */}
      <main style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* ABA DASHBOARD */}
        {aba === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Visão Geral da Frota</h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Indicadores, estatísticas rápidas e gráficos analíticos em tempo real.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '12px', borderRadius: '10px' }}><Truck size={22} /></div>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Veículos</p>
                  <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{stats.total_veiculos}</h3>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px', borderRadius: '10px' }}><Users size={22} /></div>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Motoristas</p>
                  <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{stats.total_motoristas}</h3>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#fef3c7', color: '#d97706', padding: '12px', borderRadius: '10px' }}><Wrench size={22} /></div>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Custo Total</p>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>R$ {(stats.custo_total || 0).toFixed(2)}</h3>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '10px' }}><Bell size={22} /></div>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Alertas</p>
                  <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#dc2626' }}>{alertasList.length}</h3>
                </div>
              </div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>📊 Alertas de Excesso de Velocidade por Veículo</h3>
                {dadosGraficoAlertas.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Nenhum dado de alerta registrado.</p>
                ) : (
                  <div style={{ width: '100%', height: '260px' }}>
                    <ResponsiveContainer>
                      <BarChart data={dadosGraficoAlertas}>
                        <XAxis dataKey="placa" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>🍩 Distribuição de Turnos por Motorista</h3>
                {dadosGraficoTurnos.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Nenhum turno registrado.</p>
                ) : (
                  <div style={{ width: '100%', height: '260px' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={dadosGraficoTurnos} dataKey="total" nameKey="motorista" cx="50%" cy="50%" outerRadius={80} label>
                          {dadosGraficoTurnos.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA CADASTROS */}
        {aba === 'cadastros' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                <Users size={18} color="#0284c7" /> Novo Motorista
              </h2>
              <form onSubmit={cadastrarMotorista} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Nome Completo</label>
                  <input type="text" placeholder="Ex: João da Silva" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>CNH</label>
                  <input type="text" placeholder="Número da CNH" value={cnh} onChange={e => setCnh(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Telefone</label>
                  <input type="text" placeholder="(11) 99999-9999" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <button type="submit" style={{ background: '#0284c7', color: '#fff', padding: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>Salvar Motorista</button>
              </form>
            </div>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                <Truck size={18} color="#059669" /> Novo Veículo
              </h2>
              <form onSubmit={cadastrarVeiculo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Placa</label>
                  <input type="text" placeholder="ABC-1234" value={placa} onChange={e => setPlaca(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Modelo</label>
                  <input type="text" placeholder="Ex: Fiorino" value={modelo} onChange={e => setModelo(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Marca</label>
                    <input type="text" placeholder="Fiat" value={marca} onChange={e => setMarca(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ width: '100px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Ano</label>
                    <input type="number" placeholder="2023" value={ano} onChange={e => setAno(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
                <button type="submit" style={{ background: '#059669', color: '#fff', padding: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>Salvar Veículo</button>
              </form>
            </div>
          </div>
        )}

        {/* ABA LISTAS */}
        {aba === 'listas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Motoristas Cadastrados ({motoristasList.length})</h3>
              {motoristasList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum motorista cadastrado.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {motoristasList.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#1e293b' }}>{m.nome}</strong>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>CNH: {m.cnh} | Tel: {m.telefone || 'Não informado'}</p>
                      </div>
                      <button onClick={() => deletarMotorista(m.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Veículos Cadastrados ({veiculosList.length})</h3>
              {veiculosList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum veículo cadastrado.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {veiculosList.map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#1e293b' }}>{v.modelo} <span style={{ fontWeight: '400', color: '#64748b' }}>({v.marca})</span></strong>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#334155' }}>Placa: <code style={{ background: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{v.placa}</code></p>
                      </div>
                      <button onClick={() => deletarVeiculo(v.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA VINCULAR */}
        {aba === 'jornadas' && (
          <div style={{ background: '#fff', padding: '28px', borderRadius: '12px', maxWidth: '540px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              <LinkIcon size={18} color="#7c3aed" /> Vincular Motorista ao Veículo
            </h2>
            <form onSubmit={criarJornada} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Motorista</label>
                <select value={motoristaSelecionado} onChange={e => setMotoristaSelecionado(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">-- Selecione o Motorista --</option>
                  {motoristasList.map(m => <option key={m.id} value={m.id}>{m.nome} (CNH: {m.cnh})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Veículo</label>
                <select value={veiculoSelecionado} onChange={e => setVeiculoSelecionado(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">-- Selecione o Veículo --</option>
                  {veiculosList.map(v => <option key={v.id} value={v.id}>{v.modelo} - Placa: {v.placa}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Início da Jornada</label>
                <input type="datetime-local" value={dataIniciada} onChange={e => setDataIniciada(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <button type="submit" style={{ background: '#7c3aed', color: '#fff', padding: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>Registrar Vínculo</button>
            </form>
          </div>
        )}

        {/* ABA TURNOS */}
        {aba === 'historico' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '700px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              <History size={18} color="#7c3aed" /> Histórico de Turnos Registrados
            </h2>
            {jornadasList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum turno registrado ainda.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {jornadasList.map(j => (
                  <div key={j.id} style={{ background: '#f8fafc', padding: '14px', borderLeft: '4px solid #7c3aed', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>👤 <strong>Motorista:</strong> {j.motorista_nome}</p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>🚗 <strong>Veículo:</strong> {j.veiculo_modelo} (Placa: <code style={{ background: '#cbd5e1', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{j.placa}</code>)</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>🕒 <strong>Início:</strong> {j.data_inicio}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA CUSTOS / MANUTENÇÕES */}
        {aba === 'manutencoes' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                <Wrench size={18} color="#d97706" /> Registrar Custo ou Manutenção
              </h2>
              <form onSubmit={cadastrarManutencao} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Veículo (Placa)</label>
                  <select 
                    value={placaManutencao} 
                    onChange={e => setPlacaManutencao(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Selecione o Veículo --</option>
                    {veiculosList.map(v => <option key={v.id} value={v.placa}>{v.modelo} ({v.placa})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Tipo de Custo</label>
                  <select value={tipoManutencao} onChange={e => setTipoManutencao(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="Combustível">⛽ Combustível</option>
                    <option value="Revisão Preventiva">🔧 Revisão Preventiva</option>
                    <option value="Manutenção Corretiva">🛠️ Manutenção Corretiva</option>
                    <option value="Outros">📦 Outros</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Descrição / Observação</label>
                  <input type="text" placeholder="Ex: Troca de óleo e filtros" value={descricaoManutencao} onChange={e => setDescricaoManutencao(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Custo (R$)</label>
                    <input type="number" step="0.01" placeholder="150.00" value={custoManutencao} onChange={e => setCustoManutencao(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Data</label>
                    <input type="date" value={dataManutencao} onChange={e => setDataManutencao(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
                <button type="submit" style={{ background: '#d97706', color: '#fff', padding: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>Salvar Registro de Custo</button>
              </form>
            </div>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Histórico de Custos ({manutencoesList.length})</h3>
              {manutencoesList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum custo registrado.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                  {manutencoesList.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '12px', background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{m.tipo}</span>
                          <code style={{ background: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>{m.placa}</code>
                        </div>
                        <p style={{ margin: '2px 0', fontSize: '14px', color: '#1e293b' }}>{m.descricao}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>📅 {m.data} | 💰 <strong>R$ {m.custo.toFixed(2)}</strong></p>
                      </div>
                      <button onClick={() => deletarManutencao(m.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA ITINERÁRIO */}
        {aba === 'itinerario' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '750px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
              <Navigation size={18} color="#0284c7" /> Histórico de Ruas por Data
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Selecione o veículo e o dia desejado para consultar o trajeto:</p>
            
            <form onSubmit={buscarItinerario} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Placa</label>
                <select value={placaItinerario} onChange={e => setPlacaItinerario(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">-- Escolha --</option>
                  {veiculosList.map(v => <option key={v.id} value={v.placa}>{v.modelo} ({v.placa})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Data</label>
                <input type="date" value={dataItinerario} onChange={e => setDataItinerario(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <button type="submit" style={{ background: '#0284c7', color: '#fff', padding: '10px 20px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Consultar</button>
            </form>

            <div style={{ marginTop: '24px' }}>
              {historicoItinerario.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum registro encontrado.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {historicoItinerario.map((p, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', borderLeft: '4px solid #0284c7', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>
                        <span>🕒 {p.horario}</span>
                        <span>Placa: <code style={{ background: '#cbd5e1', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{p.placa}</code></span>
                      </div>
                      <p style={{ margin: '2px 0', fontSize: '14px', color: '#1e293b' }}>🛣️ <strong>Rua:</strong> {p.rua}</p>
                      <p style={{ margin: '2px 0', fontSize: '13px', color: '#475569' }}>🏘️ <strong>Bairro:</strong> {p.bairro} ({p.cidade})</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA MULTAS */}
        {aba === 'multas' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '700px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              <ShieldAlert size={18} color="#dc2626" /> Consultar Condutor por Multa
            </h2>
            <form onSubmit={consultarMulta} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Placa</label>
                <input type="text" placeholder="Ex: ABC-1234" value={buscaPlaca} onChange={e => setBuscaPlaca(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Data/Hora da Infração</label>
                <input type="datetime-local" value={buscaData} onChange={e => setBuscaData(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <button type="submit" style={{ background: '#dc2626', color: '#fff', padding: '10px 20px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Buscar</button>
            </form>

            <div style={{ marginTop: '20px' }}>
              {resultadoMulta.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum motorista vinculado encontrado para este horário.</p> : (
                resultadoMulta.map((r, index) => (
                  <div key={index} style={{ background: '#fef2f2', padding: '14px', borderLeft: '4px solid #dc2626', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    <p style={{ margin: '0 0 4px 0' }}><strong>Motorista:</strong> {r.nome}</p>
                    <p style={{ margin: '0 0 4px 0' }}><strong>Telefone:</strong> {r.telefone}</p>
                    <p style={{ margin: 0 }}><strong>Veículo:</strong> {r.modelo} (<code style={{ background: '#cbd5e1', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{r.placa}</code>)</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ABA AO VIVO */}
        {aba === 'aovivo' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              <MapPin size={18} color="#0284c7" /> Monitoramento de Veículos ao Vivo
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Simule o sinal GPS em tempo real para testar o mapa e os alertas automáticos:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {veiculosList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Cadastre veículos primeiro.</p> : (
                veiculosList.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '14px' }}><strong>{v.modelo}</strong> (<code style={{ background: '#cbd5e1', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{v.placa}</code>)</span>
                    <button onClick={() => simularMovimento(v.placa)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Simular Sinal GPS</button>
                  </div>
                ))
              )}
            </div>

            <div style={{ height: '420px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <MapContainer center={[-23.5505, -46.6333]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {Object.values(posicoesAoVivo).map((p, idx) => (
                  <Marker key={idx} position={[parseFloat(p.latitude), parseFloat(p.longitude)]}>
                    <Popup>
                      <strong>Placa:</strong> {p.placa} <br />
                      <strong>Velocidade:</strong> {p.velocidade || 0} km/h <br />
                      <strong>Horário:</strong> {new Date(p.horario).toLocaleTimeString()}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* ABA ALERTAS */}
        {aba === 'alertas' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
              <Bell size={20} color="#dc2626" /> Alertas de Excesso de Velocidade
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Limite configurado: <strong>80 km/h</strong>.</p>

            {alertasList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <Bell size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ fontSize: '14px', margin: 0 }}>Nenhum alerta de velocidade registrado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alertasList.map((alerta, idx) => (
                  <div key={idx} style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '14px', borderRadius: '6px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>{alerta.mensagem}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d' }}>Registrado em: {new Date(alerta.horario).toLocaleString()}</p>
                    </div>
                    <div><code style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{alerta.placa}</code></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA RELATÓRIOS */}
        {aba === 'relatorios' && (
          <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', maxWidth: '650px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}><FileDown size={32} /></div>
              <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Exportar Relatório Personalizado</h2>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Filtre os dados por motorista e data antes de baixar a planilha detalhada em CSV.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Filtrar por Motorista (Opcional)</label>
                <select value={filtroMotoristaRelatorio} onChange={e => setFiltroMotoristaRelatorio(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">-- Todos os Motoristas --</option>
                  {motoristasList.map(m => <option key={m.id} value={m.id}>{m.nome} (CNH: {m.cnh})</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Filtrar por Data (Opcional)</label>
                <input type="date" value={filtroDataRelatorio} onChange={e => setFiltroDataRelatorio(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <a href={`http://localhost:3001/api/relatorios/completo.csv?data=${filtroDataRelatorio}&motorista_id=${filtroMotoristaRelatorio}`} download style={{ background: '#16a34a', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: '600', fontSize: '15px', textDecoration: 'none', display: 'inline-block' }}>
                ⬇️ Baixar Planilha Filtrada (CSV)
              </a>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}