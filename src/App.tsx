import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/layouts/Layout';
import Dashboard from '@/pages/Dashboard';
import Interns from '@/pages/Interns';
import Tasks from '@/pages/Tasks';
import Messages from '@/pages/Messages';
import Companies from '@/pages/Companies';
import Enrich from '@/pages/Enrich';
import Outreach from '@/pages/Outreach';
import Reports from '@/pages/Reports';
import Sourced from '@/pages/Sourced';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/interns" element={<Interns />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/enrich" element={<Enrich />} />
          <Route path="/outreach" element={<Outreach />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/sourced" element={<Sourced />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
