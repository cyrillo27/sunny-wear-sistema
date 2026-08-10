import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { io } from 'socket.io-client';
import { Truck, Users, MapPin, List, LayoutDashboard, Wrench, LogOut, Fuel } from 'lucide-react-native';
import * as Location from 'expo-location';

const API_URL = 'https://sunny-wear-sistema.onrender.com';
const socket = io(API_URL);

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [aba, setAba] = useState('dashboard');

  const [veiculosList, setVeiculosList] = useState([]);
  
  // Estados para o Abastecimento / Custos pelo Mobile
  const [placaAbastecimento, setPlacaAbastecimento] = useState('');
  const [litrosAbastecimento, setLitrosAbastecimento] = useState('');
  const [valorAbastecimento, setValorAbastecimento] = useState('');
  const [quilometragem, setQuilometragem] = useState('');

  // Estados de Rastreamento GPS real do motorista
  const [placaRastreamento, setPlacaRastreamento] = useState('');
  const [rastreando, setRastreando] = useState(false);

  const [stats, setStats] = useState({ total_motoristas: 0, total_veiculos: 0, total_jornadas: 0, total_alertas: 0, custo_total: 0 });

  useEffect(() => {
    if (!isLogged) return;
    carregarDados();
    carregarStats();
  }, [isLogged]);

  // Rastreamento GPS Real usando o Expo Location
  useEffect(() => {
    let locationSubscription = null;

    async function startLocationTracking() {
      // 1. Solicitar permissão de localização em primeiro plano
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos da sua localização para o rastreamento em tempo real.');
        setRastreando(false);
        return;
      }

      // 2. Iniciar monitoramento contínuo da posição real
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Envia a cada 5 segundos
          distanceInterval: 10, // Envia a cada 10 metros percorridos
        },
        (location) => {
          const { latitude, longitude, speed } = location.coords;
          
          // Converte velocidade de metros por segundo (m/s) para km/h
          const velocidadeKm = speed && speed > 0 ? Math.round(speed * 3.6) : 0;

          socket.emit('atualizar_localizacao', {
            placa: placaRastreamento,
            latitude: latitude,
            longitude: longitude,
            velocidade: velocidadeKm,
            horario: new Date().toISOString()
          });
        }
      );
    }

    if (rastreando && placaRastreamento) {
      startLocationTracking();
    } else {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [rastreando, placaRastreamento]);

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
    setRastreando(false);
  };

  const carregarDados = async () => {
    try {
      const resVei = await fetch(`${API_URL}/api/veiculos`);
      const veiData = await resVei.json();
      setVeiculosList(veiData);
      if (veiData.length > 0) {
        if (!placaAbastecimento) setPlacaAbastecimento(veiData[0].placa);
        if (!placaRastreamento) setPlacaRastreamento(veiData[0].placa);
      }
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

  const registrarAbastecimento = async () => {
    if (!placaAbastecimento || !valorAbastecimento) {
      Alert.alert("Atenção", "Preencha a placa e o valor total do abastecimento.");
      return;
    }

    const custoNum = parseFloat(valorAbastecimento.replace(',', '.')) || 0;
    const desc = `Abastecimento (${litrosAbastecimento || '0'} litros) - KM: ${quilometragem || 'N/A'}`;

    try {
      const res = await fetch(`${API_URL}/api/manutencoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          placa: placaAbastecimento, 
          tipo: 'Combustível', 
          descricao: desc, 
          custo: custoNum, 
          data: new Date().toISOString().split('T')[0] 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao registrar abastecimento.");

      Alert.alert("Sucesso", "Abastecimento registrado com sucesso!");
      setLitrosAbastecimento('');
      setValorAbastecimento('');
      setQuilometragem('');
      carregarStats();
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
            <View style={{ backgroundColor: '#0284c7', padding: 8, borderRadius: 8 }}>
              <Truck size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>☀️ Sunny Wear</Text>
              <Text style={styles.headerSub}>Controle Logístico & Motorista</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>Sair</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
          <TouchableOpacity onPress={() => setAba('dashboard')} style={[styles.menuTab, aba === 'dashboard' && styles.menuTabActive]}><LayoutDashboard size={14} color="#fff"/><Text style={styles.menuText}>Início</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAba('abastecer')} style={[styles.menuTab, aba === 'abastecer' && styles.menuTabActive]}><Fuel size={14} color="#fff"/><Text style={styles.menuText}>Abastecer</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAba('gps')} style={[styles.menuTab, aba === 'gps' && styles.menuTabActive]}><MapPin size={14} color="#fff"/><Text style={styles.menuText}>Enviar GPS</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setAba('listas')} style={[styles.menuTab, aba === 'listas' && styles.menuTabActive]}><List size={14} color="#fff"/><Text style={styles.menuText}>Frota</Text></TouchableOpacity>
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

        {aba === 'abastecer' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>⛽ Registrar Abastecimento</Text>
            
            <Text style={styles.label}>Veículo (Placa)</Text>
            <TextInput style={styles.inputMobile} placeholder="ABC-1234" value={placaAbastecimento} onChangeText={setPlacaAbastecimento} />
            
            <Text style={styles.label}>Litros Abastecidos</Text>
            <TextInput style={styles.inputMobile} placeholder="Ex: 45.5" keyboardType="numeric" value={litrosAbastecimento} onChangeText={setLitrosAbastecimento} />
            
            <Text style={styles.label}>Valor Total (R$)</Text>
            <TextInput style={styles.inputMobile} placeholder="Ex: 250.00" keyboardType="numeric" value={valorAbastecimento} onChangeText={setValorAbastecimento} />

            <Text style={styles.label}>Quilometragem Atual (KM)</Text>
            <TextInput style={styles.inputMobile} placeholder="Ex: 45200" keyboardType="numeric" value={quilometragem} onChangeText={setQuilometragem} />

            <TouchableOpacity style={styles.primaryButton} onPress={registrarAbastecimento}><Text style={styles.buttonText}>Enviar Abastecimento</Text></TouchableOpacity>
          </View>
        )}

        {aba === 'gps' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📍 Enviar Localização Real (GPS)</Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Ative para enviar a sua geolocalização real direto do celular para o painel web em tempo real.</Text>

            <Text style={styles.label}>Placa do Veículo em Operação</Text>
            <TextInput style={styles.inputMobile} placeholder="ABC-1234" value={placaRastreamento} onChangeText={setPlacaRastreamento} />

            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: rastreando ? '#dc2626' : '#16a34a', marginTop: 10 }]} 
              onPress={() => setRastreando(!rastreando)}
            >
              <Text style={styles.buttonText}>{rastreando ? '⏹️ Parar Transmissão GPS Real' : '▶️ Iniciar Transmissão GPS Real'}</Text>
            </TouchableOpacity>

            {rastreando && (
              <View style={{ marginTop: 16, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' }}>
                <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>📡 Transmitindo GPS real do aparelho...</Text>
              </View>
            )}
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