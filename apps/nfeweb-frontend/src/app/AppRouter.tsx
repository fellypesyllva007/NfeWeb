import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '../layouts/AppLayout'
import { LoginPage } from '../pages/auth/LoginPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminCompaniesPage } from '../pages/admin/AdminCompaniesPage'
import { DashboardPage } from '../pages/company/DashboardPage'
import { NewNfePage } from '../pages/company/NewNfePage'
import { EmittersPage } from '../pages/company/EmittersPage'
import { StatusPage } from '../pages/company/StatusPage'
import { UnavailablePage } from '../pages/common/UnavailablePage'

export function AppRouter() {
  return <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<LoginPage kind="company" />} />
    <Route path="/admin/login" element={<LoginPage kind="admin" />} />
    <Route path="/admin" element={<ProtectedRoute admin><AppLayout admin /></ProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="empresas" element={<AdminCompaniesPage />} />
      <Route path="status" element={<StatusPage />} />
    </Route>
    <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="nfe/nova" element={<NewNfePage />} />
      <Route path="emitentes" element={<EmittersPage />} />
      <Route path="status" element={<StatusPage />} />
      <Route path="nfe/historico" element={<UnavailablePage title="Notas fiscais" />} />
      <Route path="clientes" element={<UnavailablePage title="Clientes" />} />
      <Route path="produtos" element={<UnavailablePage title="Produtos" />} />
      <Route path="vendas" element={<UnavailablePage title="Vendas" />} />
      <Route path="certificado" element={<UnavailablePage title="Certificado digital" />} />
      <Route path="configuracao-fiscal" element={<UnavailablePage title="Configuração fiscal" />} />
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
}
