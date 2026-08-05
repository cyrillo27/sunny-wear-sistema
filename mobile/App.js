import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';

// CONECTADO AO BACKEND NO RENDER
const API_URL = 'https://sunny-wear-sistema.onrender.com';
const socket = io(API_URL);

export default function App() {
  const [placa, setPlaca] = useState('ABC-1234');
  const [rastreando, setRastreando] = useState(false);
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [velocidadeAtual, setVelocidadeAtual] = useState(0);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos da permissão de localização para rastrear o veículo.');
      }
    })();
  }, []);

  const iniciarRastreamento = async () => {
    if (!placa) {
      Alert.alert('Atenção', 'Informe a placa do veículo antes de iniciar.');
      return;
    }

    setRastreando(true);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // Envia a cada 3 segundos
        distanceInterval: 5,  // Ou a cada 5 metros movimentados
      },
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const velocidadeKmH = speed ? Math.round(speed * 3.6) : 0; // Converte m/s para km/h

        setLocalizacaoAtual({ latitude, longitude });
        setVelocidadeAtual(velocidadeKmH);

        // Envia via WebSocket para o backend no Render
        socket.emit('atualizar_localizacao', {
          placa: placa.toUpperCase(),
          latitude,
          longitude,
          velocidade: velocidadeKmH,
          horario: new Date().toISOString()
        });
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

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>☀️ Sunny Wear Motorista</Text>
      <Text style={styles.subtitulo}>Rastreamento GPS em Tempo Real</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Placa do Veículo:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: ABC-1234"
          value={placa}
          onChangeText={setPlaca}
          editable={!rastreando}
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
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 12,
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
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});