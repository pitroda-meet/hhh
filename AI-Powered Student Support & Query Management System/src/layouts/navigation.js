import { AutoAwesomeOutlined, DashboardOutlined, FactCheckOutlined, ForumOutlined, GroupsOutlined, HelpOutlineRounded, HubOutlined, InsightsOutlined, ManageAccountsOutlined, MenuBookOutlined, PersonOutlineRounded, PieChartOutlineRounded, RuleOutlined, SchemaOutlined, SchoolOutlined, SettingsSuggestOutlined, SupportAgentRounded } from '@mui/icons-material';

export const navigation = {
  student: [
    { key: 'dashboard', path: '/student', icon: DashboardOutlined, end: true },
    { key: 'aiAssistant', path: '/student/chat', icon: AutoAwesomeOutlined, featured: true },
    { key: 'myQueries', path: '/student/queries', icon: ForumOutlined },
    { key: 'faqCenter', path: '/student/faqs', icon: MenuBookOutlined },
    { key: 'profile', path: '/student/profile', icon: PersonOutlineRounded, section: 'account' },
  ],
  staff: [
    { key: 'dashboard', path: '/staff', icon: DashboardOutlined, end: true },
    { key: 'ticketInbox', path: '/staff/inbox', icon: ForumOutlined },
    { key: 'faqCenter', path: '/staff/faqs', icon: HelpOutlineRounded },
    { key: 'profile', path: '/staff/profile', icon: PersonOutlineRounded, section: 'account' },
  ],
  admin: [
    { key: 'dashboard', path: '/admin', icon: DashboardOutlined, end: true },
    { key: 'allTickets', path: '/admin/tickets', icon: ForumOutlined },
    { key: 'aiMonitoring', path: '/admin/ai-monitoring', icon: SettingsSuggestOutlined },
    { key: 'users', path: '/admin/users', icon: GroupsOutlined, section: 'management' },
    { key: 'departments', path: '/admin/departments', icon: HubOutlined },
    { key: 'categories', path: '/admin/categories', icon: SchemaOutlined },
    { key: 'assignments', path: '/admin/assignments', icon: ManageAccountsOutlined },
    { key: 'faqs', path: '/admin/faqs', icon: MenuBookOutlined },
    { key: 'escalation', path: '/admin/escalation', icon: RuleOutlined },
    { key: 'profile', path: '/admin/profile', icon: PersonOutlineRounded, section: 'account' },
  ],
  principal: [
    { key: 'analytics', path: '/principal', icon: PieChartOutlineRounded, end: true },
    { key: 'allTickets', path: '/principal/tickets', icon: FactCheckOutlined },
    { key: 'profile', path: '/principal/profile', icon: PersonOutlineRounded, section: 'account' },
  ],
};
export const roleIcons = { student: SchoolOutlined, staff: SupportAgentRounded, admin: ManageAccountsOutlined, principal: InsightsOutlined };
