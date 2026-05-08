import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout.jsx';
import SelectPage     from './pages/SelectPage.jsx';
import CoalitionPage  from './pages/CoalitionPage.jsx';
import ProgrammePage  from './pages/ProgrammePage.jsx';
import ParliamentPage from './pages/ParliamentPage.jsx';
import EndingPage     from './pages/EndingPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/select" replace />} />
          <Route path="select"     element={<SelectPage />} />
          <Route path="coalition"  element={<CoalitionPage />} />
          <Route path="programme"  element={<ProgrammePage />} />
          <Route path="parliament" element={<ParliamentPage />} />
          <Route path="ending"     element={<EndingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
