// src/App.tsx
import React from 'react';
import { Route, Switch } from 'react-router-dom';

const Home = () => (
  <div style={{
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0ea5e9',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    fontSize: '2rem',
    fontFamily: 'sans-serif'
  }}>
    🏠 Página Inicial (Home)
  </div>
);

const Login = () => (
  <div style={{
    width: '100vw',
    height: '100vh',
    backgroundColor: '#3b82f6',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    fontSize: '2rem'
  }}>
    🔑 Página de Login
  </div>
);

const App = () => {
  return (
    <Switch>
      <Route exact path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="*">
        <div style={{ padding: '2rem', backgroundColor: '#ef4444', color: 'white' }}>
          ❌ Página não encontrada
        </div>
      </Route>
    </Switch>
  );
};

export default App;