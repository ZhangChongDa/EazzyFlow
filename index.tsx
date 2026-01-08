
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import OfferLandingPage from './pages/OfferLandingPage.tsx';
import CampaignSimulationLandingPage from './pages/CampaignSimulationLandingPage.tsx';

// Create root and render the React app
const container = document.getElementById('root');
if (container) {
  try {
    console.log('🚀 TeleFlow: Starting React app...');
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <Routes>
            {/* Specific landing pages */}
            <Route path="/offer/:offerId" element={<OfferLandingPage />} />
            <Route path="/campaign/:campaignId/:userId/:productId" element={<CampaignSimulationLandingPage />} />

            {/* Main App - catch all other routes */}
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </React.StrictMode>
    );
    console.log('✅ TeleFlow: React app rendered successfully');
  } catch (err) {
    console.error("❌ TeleFlow: React root creation failed", err);
  }
} else {
  console.error("❌ TeleFlow: Root element not found");
}
