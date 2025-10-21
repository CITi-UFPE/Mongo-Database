// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// Import the Auth page and global styles (Tailwind)
import Auth from './pages/Auth/Auth';
import './index.css';

const Root = () => (
  <Router>
    <Switch>
      <Route exact path="/" component={Auth} />
      {/* Add more routes here, e.g. <Route path="/profile" component={Profile} /> */}
    </Switch>
  </Router>
);

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
}