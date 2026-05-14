import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminLayout } from '@/layouts/AdminLayout'
import { EmployerLayout } from '@/layouts/EmployerLayout'
import { EmployersPage } from '@/pages/EmployersPage'
import { EmployerCreatePage } from '@/pages/employers/EmployerCreatePage'
import { EmployerDetailPage } from '@/pages/employers/EmployerDetailPage'
import { EmployerEditPage } from '@/pages/employers/EmployerEditPage'
import { LoginPage } from '@/pages/LoginPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ShiftsPage } from '@/pages/ShiftsPage'
import { TimesheetsPage } from '@/pages/TimesheetsPage'
import { TimesheetDetailPage } from '@/pages/TimesheetDetailPage'
import { ShiftCreatePage } from '@/pages/shifts/ShiftCreatePage'
import { ShiftDetailPage } from '@/pages/shifts/ShiftDetailPage'
import { ShiftEditPage } from '@/pages/shifts/ShiftEditPage'
import { WorkerCreatePage } from '@/pages/workers/WorkerCreatePage'
import { WorkerDetailPage } from '@/pages/workers/WorkerDetailPage'
import { WorkerEditPage } from '@/pages/workers/WorkerEditPage'
import { UserCreatePage } from '@/pages/users/UserCreatePage'
import { UserDetailPage } from '@/pages/users/UserDetailPage'
import { UserEditPage } from '@/pages/users/UserEditPage'
import { UsersPage } from '@/pages/UsersPage'
import { WorkersPage } from '@/pages/WorkersPage'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage'
import { HrmWorkforcePage } from '@/pages/hrm/WorkforcePage'
import { HrmAttendancePage } from '@/pages/hrm/AttendancePage'
import { HrmPayrollPage } from '@/pages/hrm/PayrollPage'
import { HrmLeavePage } from '@/pages/hrm/LeavePage'
import { HrmPerformancePage } from '@/pages/hrm/PerformancePage'
import { HrmCompliancePage } from '@/pages/hrm/CompliancePage'
import { TaskManagementPage } from '@/pages/admin/TaskManagementPage'
import { PaymentManagementPage } from '@/pages/admin/PaymentManagementPage'
import { ModerationPage } from '@/pages/admin/ModerationPage'
import { NotificationsManagementPage } from '@/pages/admin/NotificationsManagementPage'
import { ProtectedLayout, AdminGuard, EmployerGuard } from '@/routes/ProtectedLayout'
// Employer pages
import { EmpDashboardPage }  from '@/pages/employer/EmpDashboardPage'
import { EmpWorkersPage }    from '@/pages/employer/EmpWorkersPage'
import { EmpCandidatesPage } from '@/pages/employer/EmpCandidatesPage'
import { EmpShortlistsPage } from '@/pages/employer/EmpShortlistsPage'
import { EmpInterviewsPage } from '@/pages/employer/EmpInterviewsPage'
import { EmpShiftsPage }     from '@/pages/employer/EmpShiftsPage'
import { EmpTasksPage }      from '@/pages/employer/EmpTasksPage'
import { EmpMessagingPage }  from '@/pages/employer/EmpMessagingPage'
import { EmpWalletPage }     from '@/pages/employer/EmpWalletPage'
import { EmpSettingsPage }   from '@/pages/employer/EmpSettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={0}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedLayout />}>
            {/* ── Admin routes ─────────────────────────────────────── */}
            <Route element={<AdminGuard />}>
              <Route element={<AdminLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="users/new" element={<UserCreatePage />} />
                <Route path="users/:userId/edit" element={<UserEditPage />} />
                <Route path="users/:userId" element={<UserDetailPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="workers/new" element={<WorkerCreatePage />} />
                <Route path="workers/:workerId" element={<WorkerDetailPage />} />
                <Route path="workers/:workerId/edit" element={<WorkerEditPage />} />
                <Route path="workers" element={<WorkersPage />} />
                <Route path="employers/new" element={<EmployerCreatePage />} />
                <Route path="employers/:employerId" element={<EmployerDetailPage />} />
                <Route path="employers/:employerId/edit" element={<EmployerEditPage />} />
                <Route path="employers" element={<EmployersPage />} />
                <Route path="shifts/new" element={<ShiftCreatePage />} />
                <Route path="shifts/:shiftId/edit" element={<ShiftEditPage />} />
                <Route path="shifts/:shiftId" element={<ShiftDetailPage />} />
                <Route path="shifts" element={<ShiftsPage />} />
                <Route path="timesheets/:timesheetId" element={<TimesheetDetailPage />} />
                <Route path="timesheets" element={<TimesheetsPage />} />
                <Route path="applications/:applicationId" element={<ApplicationDetailPage />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="hrm/workforce"   element={<HrmWorkforcePage />} />
                <Route path="hrm/attendance"  element={<HrmAttendancePage />} />
                <Route path="hrm/payroll"     element={<HrmPayrollPage />} />
                <Route path="hrm/leave"       element={<HrmLeavePage />} />
                <Route path="hrm/performance" element={<HrmPerformancePage />} />
                <Route path="hrm/compliance"  element={<HrmCompliancePage />} />
                <Route path="admin/tasks"         element={<TaskManagementPage />} />
                <Route path="admin/payments"      element={<PaymentManagementPage />} />
                <Route path="admin/moderation"    element={<ModerationPage />} />
                <Route path="admin/notifications" element={<NotificationsManagementPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* ── Employer routes ───────────────────────────────────── */}
            <Route path="emp" element={<EmployerGuard />}>
              <Route element={<EmployerLayout />}>
                <Route index element={<EmpDashboardPage />} />
                <Route path="candidates" element={<EmpCandidatesPage />} />
                <Route path="shortlists" element={<EmpShortlistsPage />} />
                <Route path="workers"    element={<EmpWorkersPage />} />
                <Route path="interviews" element={<EmpInterviewsPage />} />
                <Route path="shifts"     element={<EmpShiftsPage />} />
                <Route path="tasks"      element={<EmpTasksPage />} />
                <Route path="messages"   element={<EmpMessagingPage />} />
                <Route path="wallet"     element={<EmpWalletPage />} />
                <Route path="settings"   element={<EmpSettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </BrowserRouter>
  )
}
