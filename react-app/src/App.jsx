import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout.jsx';
import SelectPage      from './pages/SelectPage.jsx';
import CoalitionPage   from './pages/CoalitionPage.jsx';
import ParliamentPage  from './pages/ParliamentPage.jsx';
import FinancePage     from './pages/FinancePage.jsx';
import LegislaturePage from './pages/LegislaturePage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/select" replace />} />
          <Route path="select"     element={<SelectPage />} />
          <Route path="coalition"  element={<CoalitionPage />} />
          <Route path="parliament" element={<ParliamentPage />} />
          <Route path="finance"     element={<FinancePage />} />
          <Route path="legislature" element={<LegislaturePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
