import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminApp } from './App.jsx';
import './index.css';

// Render admin aplikace
const adminRoot = document.getElementById('admin-root');
if (adminRoot) {
  const root = ReactDOM.createRoot(adminRoot);
  root.render(<AdminApp />);
} else {
  console.error('Admin root element not found');
}
