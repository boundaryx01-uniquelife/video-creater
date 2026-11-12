import React from 'react';
import { createRoot } from 'react-dom/client';
import './lib/fonts';
import './styles.css';
import { StudioApp } from './studio/StudioApp';

createRoot(document.getElementById('root')!).render(<StudioApp />);
