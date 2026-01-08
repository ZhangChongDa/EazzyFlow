
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import OfferLandingPage from './pages/OfferLandingPage.tsx';
import CampaignSimulationLandingPage from './pages/CampaignSimulationLandingPage.tsx';

const mount = document.getElementById('root');

if (mount) {
  try {
    const root = createRoot(mount);
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <Routes>
            {/* ✅ Phase 2: Marketing Offer Landing Page */}
            <Route path="/offer/:offerId" element={<OfferLandingPage />} />
            
            {/* ✅ Phase 1: Campaign Simulation Landing Page */}
            <Route path="/campaign/:campaignId/:userId/:productId" element={<CampaignSimulationLandingPage />} />
            
            {/* Main App */}
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </React.StrictMode>
    );
  } catch (err) {
    console.error("TeleFlow: React root creation failed", err);
  }
} else {
  console.error("TeleFlow: Root element not found");
}
