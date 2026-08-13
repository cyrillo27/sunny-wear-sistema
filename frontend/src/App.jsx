import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Truck, Users, Link as LinkIcon, ShieldAlert, MapPin, List, History, Navigation, Trash2, PlusCircle, FileDown, LayoutDashboard, Wrench, LogOut, Crosshair } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = 'https://sunny-wear-sistema.onrender.com';
const socket = io(API_URL);
const COLORS = ['#0284c7', '#059669', '#7c3aed', '#dc2626', '#d97706', '#475569'];

function AutoCenter({ position, shouldCenter, onCentered }) {
  const map = useMap();
  useEffect(() => {
    if (position && shouldCenter) {
      map.flyTo(position, 16, {
        animate: true,
        duration: 1.5
      });
      if (onCentered) onCentered();
    }
  }, [position, shouldCenter, map, onCentered]);
  return null;
}

export default function App() {
  const [isLogged, setIsLogged] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });

  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
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

  const [placaManutencao, setPlacaManutencao] = useState('');
  const [tipoManutencao, setTipoManutencao] = useState('Combustível');
  const [descricaoManutencao, setDescricaoManutencao] = useState('');
  const [custoManutencao, setCustoManutencao] = useState('');
  const [dataManutencao, setDataManutencao] = useState(new Date().toISOString().split('T')[0]);
  const [manutencoesList, setManutencoesList] = useState([]);

  const [filtroDataRelatorio, setFiltroDataRelatorio] = useState('');
  const [filtroMotoristaRelatorio, setFiltroMotoristaRelatorio] = useState('');
  const [stats, setStats] = useState({ total_motoristas: 0, total_veiculos: 0, total_jornadas: 0, total_alertas: 0, custo_total: 0 });
  const [alertasList, setAlertasList] = useState([]);
  
  const [dadosGraficoAlertas, setDadosGraficoAlertas] = useState([]);
  const [dadosGraficoTurnos, setDadosGraficoTurnos] = useState([]);
  const [posicoesAoVivo, setPosicoesAoVivo] = useState({});

  const [deveCentralizar, setDeveCentralizar] = useState(true);

  const handleNomeChange = (e) => {
    const apenasLetras = e.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, '');
    setNome(apenasLetras);
  };

  const handleCnhChange = (e) => {
    const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCnh(apenasNumeros);
  };

  const handleTelefoneChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (valor.length > 6) {
      valor = `(${valor.slice(0, 2)}) ${valor.slice(2, 7)}-${valor.slice(7)}`;
    } else if (valor.length > 2) {
      valor = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
    } else if (valor.length > 0) {
      valor = `(${valor}`;
    }
    setTelefone(valor);
  };

  const handlePlacaChange = (e) => {
    let valor = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (valor.length > 3) {
      valor = `${valor.slice(0, 3)}-${valor.slice(3)}`;
    }
    setPlaca(valor);
  };

  const converterValorDecimal = (valor) => {
    if (!valor) return 0;
    const valorLimpo = String(valor).replace(',', '.');
    return parseFloat(valorLimpo) || 0;
  };

  useEffect(() => {
    if (!isLogged) return;
    carregarDados();
    carregarStats();
    carregarAlertas();
    carregarManutencoes();
    carregarGraficos();

    socket.on('posicao_motorista', (dados) => {
      setPosicoesAoVivo(prev => ({ ...prev, [dados.placa]: dados }));
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
  }, [isLogged]);

  useEffect(() => {
    if (!isLogged) return;
    carregarStats();
    carregarGraficos();
    carregarManutencoes();
  }, [aba, isLogged]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usuarioLogin || !senhaLogin) {
      alert('Por favor, preencha o usuário e a senha.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioLogin, senha: senhaLogin })
      });

      const data = await res.json();

      if (res.ok && data.autenticado) {
        localStorage.setItem('isAdminLoggedIn', 'true');
        setIsLogged(true);
        setSenhaLogin('');
      } else {
        alert(data.erro || 'Usuário ou senha incorretos!');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor ao tentar fazer login.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    setIsLogged(false);
  };

  const carregarDados = async () => {
    try {
      const resMot = await fetch(`${API_URL}/api/motoristas`);
      setMotoristasList(await resMot.json());
      
      const resVei = await fetch(`${API_URL}/api/veiculos`);
      const veiData = await resVei.json();
      setVeiculosList(veiData);
      if (veiData.length > 0 && !placaManutencao) {
        setPlacaManutencao(veiData[0].placa);
      }

      const resJor = await fetch(`${API_URL}/api/jornadas`);
      setJornadasList(await resJor.json());
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    }
  };

  const carregarStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard/stats`);
      setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const carregarAlertas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/alertas`);
      setAlertasList(await res.json());
    } catch (e) { console.error(e); }
  };

  const carregarManutencoes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/manutencoes`);
      setManutencoesList(await res.json());
    } catch (e) { console.error(e); }
  };

  const carregarGraficos = async () => {
    try {
      const resAlertas = await fetch(`${API_URL}/api/dashboard/grafico-alertas`);
      setDadosGraficoAlertas(await resAlertas.json());
      const resTurnos = await fetch(`${API_URL}/api/dashboard/grafico-turnos`);
      setDadosGraficoTurnos(await resTurnos.json());
    } catch (e) { console.error(e); }
  };

  const cadastrarMotorista = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !cnh.trim()) {
      alert("Por favor, preencha o Nome e a CNH do motorista.");
      return;
    }
    if (cnh.length < 9) {
      alert("A CNH informada é inválida. Digite ao menos 9 dígitos.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/motoristas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), cnh: cnh.trim(), telefone: telefone.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao cadastrar motorista.");
      
      alert(data.mensagem);
      setNome(''); setCnh(''); setTelefone('');
      carregarDados(); carregarStats(); carregarGraficos();
    } catch (err) {
      alert("Erro: " + err.message);
    }
  };

  const deletarMotorista = async (id) => {
    if (!window.confirm("Deseja realmente apagar este motorista?")) return;
    try {
      await fetch(`${API_URL}/api/motoristas/${id}`, { method: 'DELETE' });
      carregarDados(); carregarStats(); carregarGraficos();
    } catch (err) {
      alert("Erro ao excluir motorista.");
    }
  };

  const cadastrarVeiculo = async (e) => {
    e.preventDefault();
    if (!placa.trim() || !modelo.trim() || !marca.trim()) {
      alert("Preencha todos os campos obrigatórios do veículo.");
      return;
    }
    if (placa.length < 8) {
      alert("A placa deve estar no formato correto (Ex: ABC-1234).");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/veiculos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: placa.trim().toUpperCase(), modelo: modelo.trim(), marca: marca.trim(), ano: parseInt(ano) || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao cadastrar veículo.");

      alert(data.mensagem);
      setPlaca(''); setModelo(''); setMarca(''); setAno('');
      carregarDados(); carregarStats(); carregarGraficos();
    } catch (err) {
      alert("Erro: " + err.message);
    }
  };

  const deletarVeiculo = async (id) => {
    if (!window.confirm("Deseja realmente apagar este veículo?")) return;
    try {
      await fetch(`${API_URL}/api/veiculos/${id}`, { method: 'DELETE' });
      carregarDados(); carregarStats(); carregarGraficos();
    } catch (err) {
      alert("Erro ao excluir veículo.");
    }
  };

  const deletarJornada = async (id) => {
    if (!window.confirm("Deseja realmente remover este vínculo/turno?")) return;
    try {
      await fetch(`${API_URL}/api/jornadas/${id}`, { method: 'DELETE' });
      carregarDados(); carregarStats(); carregarGraficos();
    } catch (err) {
      alert("Erro ao excluir o vínculo.");
    }
  };

  const cadastrarManutencao = async (e) => {
    e.preventDefault();
    const placaSelecionada = placaManutencao || (veiculosList.length > 0 ? veiculosList[0].placa : '');
    if (!placaSelecionada) { 
      alert("Selecione um veículo válido."); 
      return; 
    }

    const custoConvertido = converterValorDecimal(custoManutencao);
    if (isNaN(custoConvertido) || custoConvertido <= 0) {
      alert("Insira um valor de custo válido e maior que zero.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/manutencoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          placa: placaSelecionada, 
          tipo: tipoManutencao, 
          descricao: descricaoManutencao.trim(), 
          custo: custoConvertido, 
          data: dataManutencao 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao registrar custo.");

      alert(data.mensagem);
      setDescricaoManutencao(''); setCustoManutencao('');
      carregarManutencoes(); carregarStats();
    } catch (err) {
      alert("Erro: " + err.message);
    }
  };

  const deletarManutencao = async (id) => {
    if (!window.confirm("Deseja realmente apagar este registro de custo?")) return;
    try {
      await fetch(`${API_URL}/api/manutencoes/${id}`, { method: 'DELETE' });
      carregarManutencoes(); carregarStats();
    } catch (err) {
      alert("Erro ao excluir registro de custo.");
    }
  };

  const criarJornada = async (e) => {
    e.preventDefault();
    if (!motoristaSelecionado || !veiculoSelecionado || !dataIniciada) {
      alert("Preencha todos os campos para registrar o vínculo.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/jornadas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motorista_id: motoristaSelecionado, veiculo_id: veiculoSelecionado, data_inicio: dataIniciada })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao registrar vínculo.");

      alert(data.mensagem);
      carregarDados(); carregarStats(); carregarGraficos();
    } catch (err) {
      alert("Erro: " + err.message);
    }
  };

  const consultarMulta = async (e) => {
    e.preventDefault();
    if (!buscaPlaca || !buscaData) {
      alert("Informe a placa e a data/hora para a consulta.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/multas/consultar?placa=${buscaPlaca}&data=${buscaData}`);
      setResultadoMulta(await res.json());
    } catch (e) {
      alert("Erro ao consultar multas.");
    }
  };

  const buscarItinerario = async (e) => {
    e.preventDefault();
    if (!placaItinerario) {
      alert("Selecione uma placa para buscar o itinerário.");
      return;
    }
    try {
      let url = `${API_URL}/api/itinerario/${placaItinerario}`;
      if (dataItinerario) url += `?data=${dataItinerario}`;
      const res = await fetch(url);
      setHistoricoItinerario(await res.json());
    } catch (e) {
      alert("Erro ao buscar itinerário.");
    }
  };

  const getTabStyle = (nomeAba) => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
    background: aba === nomeAba ? '#0284c7' : '#334155', color: '#fff', border: 'none',
    borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px', transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  });

  if (!isLogged) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '16px', width: '100%', boxSizing: 'border-box' }}>
        <form onSubmit={handleLogin} style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '360px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #334155', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ background: '#0284c7', width: '50px', height: '50px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}><Truck size={28} color="#fff" /></div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0', color: '#f8fafc' }}>☀️ Sunny Wear</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Acesso Restrito ao Administrador</p>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Usuário</label>
            <input type="text" value={usuarioLogin} onChange={e => setUsuarioLogin(e.target.value)} placeholder="Ex: admin" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Senha</label>
            <input type="password" value={senhaLogin} onChange={e => setSenhaLogin(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ width: '100%', background: '#0284c7', color: '#fff', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>Entrar no Sistema</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '20px', background: '#f1f5f9', minHeight: '100vh', width: '100%', maxWidth: '1440px', margin: '0 auto', color: '#1e293b', boxSizing: 'border-box' }}>
      <header style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '20px 24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#0284c7', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>☀️ Sunny Wear Sistema</h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>Controle Logístico e Rastreamento</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>

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
          <button onClick={() => setAba('relatorios')} style={getTabStyle('relatorios')}><FileDown size={15} /> Relatórios</button>
        </div>
      </header>

      <main style={{ width: '100%', boxSizing: 'border-box' }}>
        {aba === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Visão Geral da Frota</h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Indicadores, estatísticas rápidas e gráficos analíticos em tempo real.</p>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxSizing: 'border-box' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LinkIcon size={18} color="#7c3aed" /> Vínculos Ativos na Frota (Motorista com Veículo)
              </h3>
              {jornadasList.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Nenhum motorista vinculado a veículo no momento.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {jornadasList.map((j) => (
                    <div key={j.id} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#1e293b' }}>
                        👤 <strong>{j.motorista_nome}</strong>
                      </p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#475569' }}>
                        🚗 com a <strong>{j.veiculo_modelo}</strong> (<code style={{ background: '#cbd5e1', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{j.placa}</code>)
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                        🕒 Início: {j.data_inicio}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px', width: '100%' }}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '12px', borderRadius: '10px' }}><Truck size={22} /></div>
                <div><p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Veículos</p><h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{stats.total_veiculos}</h3></div>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px', borderRadius: '10px' }}><Users size={22} /></div>
                <div><p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Motoristas</p><h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{stats.total_motoristas}</h3></div>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#fef3c7', color: '#d97706', padding: '12px', borderRadius: '10px' }}><Wrench size={22} /></div>
                <div><p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Custo Total</p><h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>R$ {Number(stats.custo_total || 0).toFixed(2)}</h3></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '28px', width: '100%' }}>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>📊 Alertas de Excesso de Velocidade por Veículo</h3>
                {dadosGraficoAlertas.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Nenhum dado de alerta registrado.</p> : (
                  <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
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

              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box', overflow: 'hidden' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '16px', width: '100%', textAlign: 'left' }}>🍩 Distribuição de Turnos por Motorista</h3>
                {dadosGraficoTurnos.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Nenhum turno registrado.</p>
                ) : (
                  <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={dadosGraficoTurnos} 
                          dataKey="total" 
                          nameKey="motorista" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80} 
                          innerRadius={40}
                          label
                        >
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

        {aba === 'cadastros' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', width: '100%' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Users size={20} color="#0284c7" />
                <h2 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', margin: 0 }}>Novo Motorista</h2>
              </div>
              <form onSubmit={cadastrarMotorista} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Nome Completo (Apenas Letras)</label>
                  <input type="text" placeholder="Ex: João da Silva" value={nome} onChange={handleNomeChange} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>CNH (Apenas Números - Máx 11)</label>
                  <input type="text" placeholder="12345678901" value={cnh} onChange={handleCnhChange} maxLength={11} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Telefone (Celular com DDD)</label>
                  <input type="text" placeholder="(11) 99999-9999" value={telefone} onChange={handleTelefoneChange} maxLength={15} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
                <button type="submit" style={{ background: '#0284c7', color: '#fff', padding: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>Salvar Motorista</button>
              </form>
            </div>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Truck size={20} color="#059669" />
                <h2 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', margin: 0 }}>Novo Veículo</h2>
              </div>
              <form onSubmit={cadastrarVeiculo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Placa (Formato ABC-1234)</label>
                  <input type="text" placeholder="ABC-1234" value={placa} onChange={handlePlacaChange} maxLength={8} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Modelo</label>
                  <input type="text" placeholder="Ex: Fiorino" value={modelo} onChange={e => setModelo(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Marca</label>
                    <input type="text" placeholder="Fiat" value={marca} onChange={e => setMarca(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: '1 1 100px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Ano</label>
                    <input type="number" placeholder="2023" value={ano} onChange={e => setAno(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button type="submit" style={{ background: '#059669', color: '#fff', padding: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>Salvar Veículo</button>
              </form>
            </div>
          </div>
        )}

        {aba === 'listas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', width: '100%' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
              <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Motoristas Cadastrados ({motoristasList.length})</h3>
              {motoristasList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum motorista cadastrado.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {motoristasList.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '8px' }}>
                      <div style={{ overflow: 'hidden' }}><strong style={{ fontSize: '14px', color: '#1e293b' }}>{m.nome}</strong><p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>CNH: {m.cnh} | Tel: {m.telefone || 'Não informado'}</p></div>
                      <button onClick={() => deletarMotorista(m.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
              <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Veículos Cadastrados ({veiculosList.length})</h3>
              {veiculosList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum veículo cadastrado.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {veiculosList.map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '8px' }}>
                      <div style={{ overflow: 'hidden' }}><strong style={{ fontSize: '14px', color: '#1e293b' }}>{v.modelo} <span style={{ fontWeight: '400', color: '#64748b' }}>({v.marca})</span></strong><p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#334155' }}>Placa: <code style={{ background: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{v.placa}</code></p></div>
                      <button onClick={() => deletarVeiculo(v.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {aba === 'jornadas' && (
          <div style={{ background: '#fff', padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '600px', margin: '0 auto', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}><LinkIcon size={18} color="#7c3aed" /> Vincular Motorista ao Veículo</h2>
            <form onSubmit={criarJornada} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Motorista</label><select value={motoristaSelecionado} onChange={e => setMotoristaSelecionado(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}><option value="">-- Selecione o Motorista --</option>{motoristasList.map(m => <option key={m.id} value={m.id}>{m.nome} (CNH: {m.cnh})</option>)}</select></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Veículo</label><select value={veiculoSelecionado} onChange={e => setVeiculoSelecionado(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}><option value="">-- Selecione o Veículo --</option>{veiculosList.map(v => <option key={v.id} value={v.id}>{v.modelo} - Placa: {v.placa}</option>)}</select></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Início da Jornada</label><input type="datetime-local" value={dataIniciada} onChange={e => setDataIniciada(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
              <button type="submit" style={{ background: '#7c3aed', color: '#fff', padding: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>Registrar Vínculo</button>
            </form>
          </div>
        )}

        {aba === 'historico' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '800px', margin: '0 auto', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}><History size={18} color="#7c3aed" /> Histórico de Turnos Registrados</h2>
            {jornadasList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum turno registrado ainda.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {jornadasList.map(j => (
                  <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px', borderLeft: '4px solid #7c3aed', borderRadius: '6px', border: '1px solid #e2e8f0', gap: '8px' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>👤 <strong>Motorista:</strong> {j.motorista_nome}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>🚗 <strong>Veículo:</strong> {j.veiculo_modelo} (Placa: <code style={{ background: '#cbd5e1', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{j.placa}</code>)</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>🕒 <strong>Início:</strong> {j.data_inicio}</p>
                    </div>
                    <button onClick={() => deletarJornada(j.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} title="Apagar Vínculo"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === 'manutencoes' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', width: '100%' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
              <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}><Wrench size={18} color="#d97706" /> Registrar Custo ou Manutenção</h2>
              <form onSubmit={cadastrarManutencao} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Veículo (Placa)</label><select value={placaManutencao} onChange={e => setPlacaManutencao(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}><option value="">-- Selecione o Veículo --</option>{veiculosList.map(v => <option key={v.id} value={v.placa}>{v.modelo} ({v.placa})</option>)}</select></div>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Tipo de Custo</label><select value={tipoManutencao} onChange={e => setTipoManutencao(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}><option value="Combustível">⛽ Combustível</option><option value="Revisão Preventiva">🔧 Revisão Preventiva</option><option value="Manutenção Corretiva">🛠️ Manutenção Corretiva</option><option value="Outros">📦 Outros</option></select></div>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Descrição</label><input type="text" placeholder="Ex: Troca de óleo" value={descricaoManutencao} onChange={e => setDescricaoManutencao(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Custo (R$)</label><input type="text" placeholder="150.50 ou 150,50" value={custoManutencao} onChange={e => setCustoManutencao(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
                  <div style={{ flex: '1 1 150px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Data</label><input type="date" value={dataManutencao} onChange={e => setDataManutencao(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
                </div>
                <button type="submit" style={{ background: '#d97706', color: '#fff', padding: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>Salvar Custo</button>
              </form>
            </div>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
              <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Histórico de Custos ({manutencoesList.length})</h3>
              {manutencoesList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum custo registrado.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                  {manutencoesList.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '8px' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}><span style={{ fontSize: '12px', background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{m.tipo}</span><code style={{ background: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>{m.placa}</code></div>
                        <p style={{ margin: '2px 0', fontSize: '14px', color: '#1e293b' }}>{m.descricao}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>📅 {m.data} | 💰 <strong>R$ {Number(m.custo || 0).toFixed(2)}</strong></p>
                      </div>
                      <button onClick={() => deletarManutencao(m.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {aba === 'itinerario' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '900px', margin: '0 auto', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}><Navigation size={18} color="#0284c7" /> Histórico de Ruas por Data</h2>
            <form onSubmit={buscarItinerario} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '12px' }}>
              <div style={{ flex: '1 1 220px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Placa</label><select value={placaItinerario} onChange={e => setPlacaItinerario(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}><option value="">-- Escolha --</option>{veiculosList.map(v => <option key={v.id} value={v.placa}>{v.modelo} ({v.placa})</option>)}</select></div>
              <div style={{ flex: '1 1 180px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Data</label><input type="date" value={dataItinerario} onChange={e => setDataItinerario(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
              <button type="submit" style={{ background: '#0284c7', color: '#fff', padding: '10px 20px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Consultar</button>
            </form>
            <div style={{ marginTop: '24px' }}>
              {historicoItinerario.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum registro encontrado.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {historicoItinerario.map((p, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', borderLeft: '4px solid #0284c7', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}><span>🕒 {p.horario}</span><span>Placa: <code style={{ background: '#cbd5e1', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{p.placa}</code></span></div>
                      <p style={{ margin: '2px 0', fontSize: '14px', color: '#1e293b' }}>🛣️ <strong>Rua:</strong> {p.rua}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {aba === 'multas' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '800px', margin: '0 auto', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}><ShieldAlert size={18} color="#dc2626" /> Consultar Condutor por Multa</h2>
            <form onSubmit={consultarMulta} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Placa</label><input type="text" placeholder="Ex: ABC-1234" value={buscaPlaca} onChange={e => setBuscaPlaca(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
              <div style={{ flex: '1 1 220px' }}><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Data/Hora</label><input type="datetime-local" value={buscaData} onChange={e => setBuscaData(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
              <button type="submit" style={{ background: '#dc2626', color: '#fff', padding: '10px 20px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Buscar</button>
            </form>
            <div style={{ marginTop: '20px' }}>
              {resultadoMulta.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum motorista vinculado encontrado.</p> : (
                resultadoMulta.map((r, index) => (
                  <div key={index} style={{ background: '#fef2f2', padding: '14px', borderLeft: '4px solid #dc2626', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    <p style={{ margin: '0 0 4px 0' }}><strong>Motorista:</strong> {r.nome}</p>
                    <p style={{ margin: '0 0 4px 0' }}><strong>Telefone:</strong> {r.telefone}</p>
                    <p style={{ margin: 0 }}><strong>Veículo:</strong> {r.modelo} ({r.placa})</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {aba === 'aovivo' && (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', margin: 0 }}><MapPin size={18} color="#0284c7" /> Monitoramento ao Vivo dos Veículos</h2>
              
              <button 
                onClick={() => setDeveCentralizar(true)} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
              >
                <Crosshair size={16} /> Localizar o Motorista
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', width: '100%' }}>
              {veiculosList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px' }}>Cadastre veículos primeiro.</p> : (
                veiculosList.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', gap: '8px', flexWrap: 'wrap' }}>
                    <span><strong>{v.modelo}</strong> (<code>{v.placa}</code>)</span>
                    <span style={{ fontSize: '13px', color: posicoesAoVivo[v.placa] ? '#16a34a' : '#64748b', fontWeight: '600' }}>
                      {posicoesAoVivo[v.placa] ? '🟢 Em movimento / Online' : '⚪ Aguardando App do Motorista'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <MapContainer 
                center={[-23.5505, -46.6333]} 
                zoom={14} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {Object.values(posicoesAoVivo).length > 0 && (
                  <AutoCenter 
                    position={[parseFloat(Object.values(posicoesAoVivo)[0].latitude), parseFloat(Object.values(posicoesAoVivo)[0].longitude)]} 
                    shouldCenter={deveCentralizar}
                    onCentered={() => setDeveCentralizar(false)}
                  />
                )}

                {Object.values(posicoesAoVivo).map((p, idx) => (
                  <Marker key={idx} position={[parseFloat(p.latitude), parseFloat(p.longitude)]}>
                    <Popup><strong>Placa:</strong> {p.placa} <br /><strong>Velocidade:</strong> {p.velocidade || 0} km/h</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {aba === 'relatorios' && (
          <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '700px', margin: '0 auto', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}><FileDown size={32} /></div>
              <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Exportar Relatório</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Motorista</label><select value={filtroMotoristaRelatorio} onChange={e => setFiltroMotoristaRelatorio(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}><option value="">-- Todos --</option>{motoristasList.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Data</label><input type="date" value={filtroDataRelatorio} onChange={e => setFiltroDataRelatorio(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <a href={`${API_URL}/api/relatorios/completo.csv?data=${filtroDataRelatorio}&motorista_id=${filtroMotoristaRelatorio}`} download style={{ background: '#16a34a', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: '600', fontSize: '15px', textDecoration: 'none', display: 'inline-block' }}>⬇️ Baixar Planilha (CSV)</a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}