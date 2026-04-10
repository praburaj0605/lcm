import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleRoute, SalesPipelineRoute } from './components/RoleRoute'
import { MainLayout } from './layouts/MainLayout'
import { RootRedirect } from './pages/RootRedirect'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { ClientsList } from './pages/clients/ClientsList'
import { ClientsCreate } from './pages/clients/ClientsCreate'
import { ClientsEdit } from './pages/clients/ClientsEdit'
import { EnquiriesList } from './pages/enquiries/EnquiriesList'
import { EnquiriesCreate } from './pages/enquiries/EnquiriesCreate'
import { EnquiriesCreateLegacy } from './pages/enquiries/EnquiriesCreateLegacy'
import { EnquiriesEdit } from './pages/enquiries/EnquiriesEdit'
import { EnquiryPricing } from './pages/enquiries/EnquiryPricing'
import { QuotationsList } from './pages/quotations/QuotationsList'
import { QuotationsCreate } from './pages/quotations/QuotationsCreate'
import { QuotationsEdit } from './pages/quotations/QuotationsEdit'
import { InvoicesList } from './pages/invoices/InvoicesList'
import { InvoicesCreate } from './pages/invoices/InvoicesCreate'
import { InvoicesEdit } from './pages/invoices/InvoicesEdit'
import { UsersList } from './pages/users/UsersList'
import { UsersCreate } from './pages/users/UsersCreate'
import { UsersEdit } from './pages/users/UsersEdit'
import { SettingsPage } from './pages/Settings'
import { ReportsPage } from './pages/reports/ReportsPage'
import { EmailTemplatesPage } from './pages/templates/EmailTemplatesPage'
import { QuoteRespondPage } from './pages/public/QuoteRespondPage'
import { applyChromeThemeToDocument } from './theme/chromeThemes'

function ThemeBootstrap() {
  const uiTheme = useAppStore((s) => s.uiTheme)
  const chromeTheme = useAppStore((s) => s.chromeTheme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', uiTheme === 'dark')
    applyChromeThemeToDocument(chromeTheme)
  }, [uiTheme, chromeTheme])
  return null
}

/** Restore role on old persisted sessions missing `role`. */
function UsersJsonHydrate() {
  useEffect(() => {
    useAppStore.getState().hydrateUsersFromJson()
  }, [])
  return null
}

export default function App() {
  return (
    <>
      <ThemeBootstrap />
      <UsersJsonHydrate />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/respond/quotation/:id" element={<QuoteRespondPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route element={<RoleRoute roles={['admin', 'boss']} />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route element={<RoleRoute roles={['admin', 'sales', 'pricing', 'boss']} />}>
              <Route path="enquiries" element={<EnquiriesList />} />
              <Route path="enquiries/:id/pricing" element={<EnquiryPricing />} />
            </Route>

            <Route element={<SalesPipelineRoute />}>
              <Route path="clients" element={<ClientsList />} />
              <Route path="clients/new" element={<ClientsCreate />} />
              <Route path="clients/:id/edit" element={<ClientsEdit />} />
              <Route path="enquiries/new" element={<EnquiriesCreate />} />
              <Route path="enquiries/new-legacy" element={<EnquiriesCreateLegacy />} />
              <Route path="enquiries/:id/edit" element={<EnquiriesEdit />} />
              <Route path="quotations" element={<QuotationsList />} />
              <Route path="quotations/new" element={<QuotationsCreate />} />
              <Route path="quotations/:id/edit" element={<QuotationsEdit />} />
              <Route path="invoices" element={<InvoicesList />} />
              <Route path="invoices/new" element={<InvoicesCreate />} />
              <Route path="invoices/:id/edit" element={<InvoicesEdit />} />
            </Route>

            <Route element={<RoleRoute roles={['admin', 'boss']} />}>
              <Route path="users" element={<UsersList />} />
              <Route path="users/new" element={<UsersCreate />} />
              <Route path="users/:id/edit" element={<UsersEdit />} />
              <Route path="email-templates" element={<EmailTemplatesPage />} />
            </Route>

            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
