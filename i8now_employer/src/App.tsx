import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CandidatesPage } from '@/pages/CandidatesPage'
import { CandidateDetailPage } from '@/pages/CandidateDetailPage'
import { ShortlistsPage } from '@/pages/ShortlistsPage'
import { MessagingPage } from '@/pages/MessagingPage'
import { InterviewsPage } from '@/pages/InterviewsPage'
import { WorkersPage } from '@/pages/WorkersPage'
import { WorkerDetailPage } from '@/pages/WorkerDetailPage'
import { TasksPage } from '@/pages/TasksPage'
import { ShiftsPage } from '@/pages/ShiftsPage'
import { WalletPage } from '@/pages/WalletPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="candidates" element={<CandidatesPage />} />
            <Route path="candidates/:id" element={<CandidateDetailPage />} />
            <Route path="shortlists" element={<ShortlistsPage />} />
            <Route path="messages" element={<MessagingPage />} />
            <Route path="interviews" element={<InterviewsPage />} />
            <Route path="workers" element={<WorkersPage />} />
            <Route path="workers/:id" element={<WorkerDetailPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="shifts" element={<ShiftsPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
