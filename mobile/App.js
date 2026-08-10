import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { io } from 'socket.io-client';
import { Truck, Users, Link as LinkIcon, ShieldAlert, MapPin, List, History, Navigation, Trash2, PlusCircle, FileDown, LayoutDashboard, Bell, Wrench, LogOut } from 'lucide-react-native';

const API_URL = 'https://sunny-wear-sistema.onrender.com';
const socket = io(API_URL);

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
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

  useEffect(() => {
    if (!isLogged) return;
    carregarDados();
    carregarStats();
    carregarAlertas();
    carregarManutencoes();

    socket.on('novo_alerta', (alerta) => {
      setAlertasList(prev => [alerta, ...prev]);
      carregarStats();
    });

    return () => {
      socket.off('novo_alerta');
    };
  }, [isLogged]);

  const handleLogin = async () => {
    if (!usuarioLogin || !senhaLogin) {
      Alert.alert('Atenção', 'Por favor, preencha o usuário e a senha.');
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
        setIsLogged(true);
        setSenhaLogin('');
      } else {
        Alert.alert('Erro', data.erro || 'Usuário ou senha incorretos!');
      }
    } catch (err) {
      Alert.alert('Erro', 'Erro de conexão com o servidor ao tentar fazer login.');
    }
  };

  const handleLogout = () => {
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

  const cadastrarMotorista = async () => {
    if (!nome.trim() || !cnh.trim()) {
      Alert.alert("Atenção", "Preencha o Nome e a CNH do motorista.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/motoristas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), cnh: cnh.trim(), telefone: telefone.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao cadastrar.");
      
      Alert.alert("Sucesso", data.mensagem);
      setNome(''); setCnh(''); setTelefone('');
      carregarDados(); carregarStats();
    } catch (err) {
      Alert.alert("Erro", err.message);
    }
  };

  const cadastrarVeiculo = async () => {
    if (!placa.trim() || !modelo.trim() || !marca.trim()) {
      Alert.alert("Atenção", "Preencha todos os campos do veículo.");
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

      Alert.alert("Sucesso", data.mensagem);
      setPlaca(''); setModelo(''); setMarca(''); setAno('');
      carregarDados(); carregarStats();
    } catch (err) {
      Alert.alert("Erro", err.message);
    }
  };

  if (!isLogged) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <View style={styles.loginHeaderIcon}>
            <Truck size={30} color="#fff" />
          </View>
          <Text style={styles.loginTitle}>☀️ Sunny Wear</Text>
          <Text style={styles.loginSubtitle}>Acesso Restrito ao Administrador</Text>

          <Text style={styles.label}>Usuário</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: admin" 
            placeholderTextColor="#64748b"
            value={usuarioLogin} 
            onChangeText={setUsuarioLogin} 
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput 
            style={styles.input} 
            placeholder="••••••••" 
            placeholderTextColor="#64748b"
            secureTextEntry 
            value={senhaLogin} 
            onChangeText={setSenhaLogin} 
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Entrar no Sistema</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ background: '#0284c7', padding: 8, borderRadius: 8 }}>
              <Truck size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>☀️ Sunny Wear</Text>
              <Text style={styles.headerSub}>Controle Logístico</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>Sair</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
          <TouchableOpacity onPress={() => setAba('dashboard')} style={[styles.menuTab, aba === 'dashboard' && styles.menuTabActive]}><LayoutDashboard size={14} color="#fff"/><Text style={styles.menuText}>Início</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAba('cadastros')} style={[styles.menuTab, aba === 'cadastros' && styles.menuTabActive]}><PlusCircle size={14} color="#fff"/><Text style={styles.menuText}>Cadastros</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAba('listas')} style={[styles.menuTab, aba === 'listas' && styles.menuTabActive]}><List size={14} color="#fff"/><Text style={styles.menuText}>Frota</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAba('manutencoes')} style={[styles.menuTab, aba === 'manutencoes' && styles.menuTabActive]}><Wrench size={14} color="#fff"/><Text style={styles.menuText}>Custos</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAba('alertas')} style={[styles.menuTab, aba === 'alertas' && styles.menuTabActive]}><Bell size={14} color="#fff"/><Text style={styles.menuText}>Alertas</Text></TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {aba === 'dashboard' && (
          <View>
            <Text style={styles.sectionTitle}>Visão Geral</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}><Truck size={20} color="#0284c7"/><Text style={styles.statLabel}>Veículos</Text><Text style={styles.statValue}>{stats.total_veiculos}</Text></View>
              <View style={styles.statBox}><Users size={20} color="#16a34a"/><Text style={styles.statLabel}>Motoristas</Text><Text style={styles.statValue}>{stats.total_motoristas}</Text></View>
            </View>
            <View style={styles.statBoxFull}>
              <Wrench size={20} color="#d97706"/>
              <Text style={styles.statLabel}>Custo Total da Frota</Text>
              <Text style={styles.statValue}>R$ {Number(stats.custo_total || 0).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {aba === 'cadastros' && (
          <View>
            <Text style={styles.sectionTitle}>Novo Motorista</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput style={styles.inputMobile} placeholder="Ex: João da Silva" value={nome} onChangeText={setNome} />
              <Text style={styles.label}>CNH</Text>
              <TextInput style={styles.inputMobile} placeholder="12345678901" keyboardType="numeric" value={cnh} onChangeText={setCnh} />
              <Text style={styles.label}>Telefone</Text>
              <TextInput style={styles.inputMobile} placeholder="(11) 99999-9999" keyboardType="phone-pad" value={telefone} onChangeText={setTelefone} />
              <TouchableOpacity style={styles.primaryButton} onPress={cadastrarMotorista}><Text style={styles.buttonText}>Salvar Motorista</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {aba === 'listas' && (
          <View>
            <Text style={styles.sectionTitle}>Veículos Cadastrados</Text>
            {veiculosList.map(v => (
              <View key={v.id} style={styles.listItem}>
                <Text style={styles.listTitle}>{v.modelo} ({v.marca})</Text>
                <Text style={styles.listSub}>Placa: {v.placa}</Text>
              </View>
            ))}
          </View>
        )}

        {aba === 'manutencoes' && (
          <View>
            <Text style={styles.sectionTitle}>Histórico de Custos</Text>
            {manutencoesList.map(m => (
              <View key={m.id} style={styles.listItem}>
                <Text style={styles.listTitle}>{m.tipo} - {m.placa}</Text>
                <Text style={styles.listSub}>{m.descricao} | R$ {Number(m.custo || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {aba === 'alertas' && (
          <View>
            <Text style={styles.sectionTitle}>Alertas Recentes</Text>
            {alertasList.length === 0 ? <Text style={{ color: '#64748b' }}>Nenhum alerta registrado.</Text> : 
              alertasList.map((a, i) => (
                <View key={i} style={[styles.listItem, { borderLeftColor: '#dc2626', borderLeftWidth: 4 }]}>
                  <Text style={{ fontWeight: 'bold', color: '#991b1b' }}>{a.mensagem}</Text>
                  <Text style={{ fontSize: 12, color: '#7f1d1d' }}>Placa: {a.placa}</Text>
                </View>
              ))
            }
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 },
  loginCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 12, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#334155' },
  loginHeaderIcon: { backgroundColor: '#0284c7', width: 50, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12 },
  loginTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center', marginBottom: 4 },
  loginSubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#475569', marginBottom: 16 },
  loginButton: { backgroundColor: '#0284c7', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  container: { flex: 1, backgroundColor: '#f1f5f9', paddingTop: 40 },
  header: { backgroundColor: '#0f172a', padding: 16, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#94a3b8', fontSize: 11 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  menuScroll: { flexDirection: 'row' },
  menuTab: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#334155', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginRight: 8 },
  menuTabActive: { backgroundColor: '#0284c7' },
  menuText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statBoxFull: { backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', marginBottom: 16 },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 6 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 2 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  inputMobile: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 6, marginBottom: 12, color: '#1e293b' },
  primaryButton: { backgroundColor: '#0284c7', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  listItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  listSub: { fontSize: 12, color: '#64748b', marginTop: 2 }
});