import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Altere aqui o usuário e senha de administrador desejados
    if (usuario === 'admin' && senha === 'admin123') {
      localStorage.setItem('isAdminLoggedIn', 'true');
      navigate('/'); // Redireciona para o painel principal após o login
    } else {
      alert('Usuário ou senha incorretos!');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: '#0f172a', 
      color: '#fff',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <form onSubmit={handleLogin} style={{ 
        background: '#1e293b', 
        padding: '40px', 
        borderRadius: '12px', 
        width: '320px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#38bdf8' }}>Painel Admin</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Usuário:</label>
          <input 
            type="text" 
            value={usuario} 
            onChange={(e) => setUsuario(e.target.value)} 
            placeholder="Digite o usuário"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Senha:</label>
          <input 
            type="password" 
            value={senha} 
            onChange={(e) => setSenha(e.target.value)} 
            placeholder="Digite a senha"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" style={{ 
          width: '100%', 
          padding: '12px', 
          background: '#0284c7', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '6px', 
          cursor: 'pointer', 
          fontWeight: 'bold',
          fontSize: '15px',
          transition: 'background 0.2s'
        }}>
          Entrar no Sistema
        </button>
      </form>
    </div>
  );
}