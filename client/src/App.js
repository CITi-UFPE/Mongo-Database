import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth/Auth';
import './styles/globals.css';

const App = () => {
  return (
    <Routes>
      <Route path="/*" element={<Auth />} />
    </Routes>
  );
};

export default App;
