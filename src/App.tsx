import React, { useState, useEffect } from 'react';
import { TelegramClient } from 'telegram';
import Login from './components/Login';
import FileManager from './components/FileManager';

const App: React.FC = () => {
  const [client, setClient] = useState<TelegramClient | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen`}>
      {client ? <FileManager client={client} /> : <Login onLogin={setClient} />}
    </div>
  );
};

export default App;