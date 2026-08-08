import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';

const API_URL = 'https://sunny-wear-sistema.onrender.com';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('rastreio'); // 'rastreio' ou 'abastecimento'

  // Estados de Rastreamento
  const [placa, setPlaca] = useState('ABC-1234');
  const [rastreando, setRastreando] = useState(false);
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [velocidadeAtual, setVelocidadeAtual] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [socket, setSocket] = useState(null);

  // Estados de Abastecimento
  const [placaAbastecimento, setPlacaAbastecimento] = useState('ABC-1234');
  const [valorAbastecimento, setValorAbastecimento] = useState('');

  // Inicializa o Socket.io e permissões ao abrir o app
  useEffect(() => {
    const novoSocket = io(API_URL, {
      transports: ['websocket'], // Força o uso de WebSocket para maior estabilidade
    });
    setSocket(novoSocket);

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos da permissão de localização para rastrear o veículo.');
      }
    })();

    return () => {
      novoSocket.disconnect();
    };
  }, []);

  const iniciarRastreamento = async () => {
    if (!placa.trim()) {
      Alert.alert('Atenção', 'Informe a placa do veículo antes de iniciar.');
      return;
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Ative a permissão de localização nas configurações do celular.');
      return;
    }

    setRastreando(true);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, 
        distanceInterval: 5,  
      },
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const velocidadeKmH = speed ? Math.round(speed * 3.6) : 0; 

        setLocalizacaoAtual({ latitude, longitude });
        setVelocidadeAtual(velocidadeKmH);

        // Envia a posição via WebSocket se estiver conectado
        if (socket) {
          socket.emit('atualizar_localizacao', {
            placa: placa.trim().toUpperCase(),
            latitude,
            longitude,
            velocidade: velocidadeKmH,
            horario: new Date().toISOString()
          });
        }
      }
    );

    setSubscription(sub);
    Alert.alert('Sucesso', 'Rastreamento GPS iniciado!');
  };

  const pararRastreamento = () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
    setRastreando(false);
    Alert.alert('Parado', 'Rastreamento finalizado.');
  };

  const registrarAbastecimento = async () => {
    if (!placaAbastecimento.trim() || !valorAbastecimento.trim()) {
      Alert.alert('Erro', 'Preencha a placa e o valor do abastecimento.');
      return;
    }

    const valorLimpo = String(valorAbastecimento).replace(',', '.');
    const valorNumerico = parseFloat(valorLimpo);

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      Alert.alert('Valor Inválido', 'Insira um valor numérico válido e maior que zero.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/mobile/abastecimento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          placa: placaAbastecimento.trim().toUpperCase(), 
          valor: valorNumerico 
        })
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Abastecimento enviado direto para a aba de Custos do painel!');
        setValorAbastecimento('');
      } else {
        Alert.alert('Erro', 'Não foi possível registrar o abastecimento.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha de conexão com o servidor.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>☀️ Sunny Wear Motorista</Text>
      <Text style={styles.subtitulo}>Controle Operacional Móvel</Text>

      {/* Seletor de Abas */}
      <View style={styles.menuAbas}>
        <TouchableOpacity 
          style={[styles.abaBotao, abaAtiva === 'rastreio' && styles.abaAtiva]} 
          onPress={() => setAbaAtiva('rastreio')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'rastreio' && styles.abaTextoAtivo]}>Rastreamento</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.abaBotao, abaAtiva === 'abastecimento' && styles.abaAtiva]} 
          onPress={() => setAbaAtiva('abastecimento')}
        >
          <Text style={[styles.abaTexto, abaAtiva === 'abastecimento' && styles.abaTextoAtivo]}>Abastecimento</Text>
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO DA ABA: RASTREAMENTO */}
      {abaAtiva === 'rastreio' ? (
        <View style={styles.card}>
          <Text style={styles.label}>Placa do Veículo:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: ABC-1234"
            value={placa}
            onChangeText={setPlaca}
            editable={!rastreando}
            autoCapitalize="characters"
          />

          {localizacaoAtual && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>📍 Lat: {localizacaoAtual.latitude.toFixed(4)}</Text>
              <Text style={styles.infoText}>📍 Lng: {localizacaoAtual.longitude.toFixed(4)}</Text>
              <Text style={styles.infoText}>🚗 Velocidade: {velocidadeAtual} km/h</Text>
            </View>
          )}

          {!rastreando ? (
            <TouchableOpacity style={styles.botaoIniciar} onPress={iniciarRastreamento}>
              <Text style={styles.textoBotao}>Iniciar Rastreamento</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.botaoParar} onPress={pararRastreamento}>
              <Text style={styles.textoBotao}>Parar Rastreamento</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* CONTEÚDO DA ABA: ABASTECIMENTO */
        <View style={styles.card}>
          <Text style={styles.label}>Placa do Veículo:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: ABC-1234"
            value={placaAbastecimento}
            onChangeText={setPlacaAbastecimento}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Valor do Abastecimento (R$):</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={valorAbastecimento}
            onChangeText={setValorAbastecimento}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.botaoAbastecer} onPress={registrarAbastecimento}>
            <Text style={styles.textoBotao}>Enviar Abastecimento</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  menuAbas: {
    flexDirection: 'row',
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
    padding: 4,
    width: '100%',
    maxWidth: 380,
    marginBottom: 16,
  },
  abaBotao: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  abaAtiva: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  abaTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  abaTextoAtivo: {
    color: '#0284c7',
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: '12px',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoText: {
    fontSize: 14,
    color: '#166534',
    marginBottom: 4,
  },
  botaoIniciar: {
    backgroundColor: '#0284c7',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoParar: {
    backgroundColor: '#dc2626',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoAbastecer: {
    backgroundColor: '#d97706',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});