
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import OfferLandingPage from './pages/OfferLandingPage.tsx';
import CampaignSimulationLandingPage from './pages/CampaignSimulationLandingPage.tsx';

// Create root and render the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/offer/:offerId" element={<OfferLandingPage />} />
          <Route path="/campaign/:campaignId/:userId/:productId" element={<CampaignSimulationLandingPage />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
