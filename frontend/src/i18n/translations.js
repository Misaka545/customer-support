/**
 * Hệ thống đa ngôn ngữ (i18n) đơn giản
 * Hỗ trợ: Tiếng Việt (mặc định) và English
 */
const translations = {
  vi: {
    // Common
    appName: 'Dashboard',
    loading: 'Đang tải...',
    save: 'Lưu',
    cancel: 'Hủy',
    delete: 'Xóa',
    confirm: 'Xác nhận',
    search: 'Tìm kiếm...',
    noData: 'Không có dữ liệu',
    error: 'Đã xảy ra lỗi',
    success: 'Thành công',

    // Auth
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    username: 'Tên đăng nhập',
    password: 'Mật khẩu',
    loginTitle: 'Đăng nhập hệ thống',
    loginSubtitle: 'Hệ thống hỗ trợ khách hàng thông minh',
    loginError: 'Tài khoản hoặc mật khẩu không đúng',
    welcomeBack: 'Chào mừng trở lại',

    // Dashboard
    dashboard: 'Bảng điều khiển',
    conversations: 'Cuộc hội thoại',
    allSessions: 'Tất cả',
    pending: 'Đang chờ',
    inProgress: 'Đang xử lý',
    botHandling: 'Bot xử lý',
    closed: 'Đã đóng',
    noConversations: 'Chưa có cuộc hội thoại nào',
    selectConversation: 'Chọn một cuộc hội thoại để bắt đầu',

    // Chat
    typeMessage: 'Nhập tin nhắn...',
    send: 'Gửi',
    accept: 'Tiếp nhận',
    close: 'Đóng phiên',
    acceptSession: 'Tiếp nhận khách hàng',
    closeSession: 'Đóng cuộc hội thoại',
    agentTyping: 'đang gõ...',
    messagesHistory: 'Lịch sử tin nhắn',
    newCustomer: 'Khách hàng mới cần hỗ trợ!',

    // Customer Info
    customerInfo: 'Thông tin khách hàng',
    sessionId: 'Mã phiên',
    status: 'Trạng thái',
    createdAt: 'Thời gian tạo',
    assignedTo: 'Nhân viên phụ trách',
    notAssigned: 'Chưa phân công',

    // Knowledge Base
    knowledgeBase: 'Tài liệu',
    uploadDocument: 'Tải lên tài liệu',
    dragDrop: 'Kéo thả file hoặc nhấn để chọn',
    supportedFormats: 'Hỗ trợ: PDF, TXT, DOCX (tối đa 10MB)',
    processing: 'Đang xử lý',
    ready: 'Sẵn sàng',
    uploadedBy: 'Người tải lên',
    deleteConfirm: 'Bạn có chắc chắn muốn xóa tài liệu này?',
    noDocuments: 'Chưa có tài liệu nào',
    uploadFirst: 'Hãy tải lên tài liệu đầu tiên',

    // Settings
    settings: 'Cài đặt',
    language: 'Ngôn ngữ',
    theme: 'Giao diện',
    darkMode: 'Chế độ tối',
    lightMode: 'Chế độ sáng',

    // Agent Management
    agentManagement: 'Quản lý nhân viên',
    addAgent: 'Thêm nhân viên',
    displayName: 'Tên hiển thị',
    role: 'Vai trò',
    admin: 'Quản trị viên',
    agent: 'Nhân viên',
    online: 'Đang online',
    offline: 'Offline',

    // Queue & Workload
    queueStatus: 'Hàng đợi',
    queueEmpty: 'Không có ai trong hàng đợi',
    queuePosition: 'Vị trí trong hàng đợi',
    waitingInQueue: 'Đang chờ trong hàng đợi',
    estimatedWait: 'Thời gian chờ dự kiến',
    minutes: 'phút',
    available: 'Sẵn sàng',
    busy: 'Đang bận',
    statusAvailable: 'Sẵn sàng nhận chat',
    statusBusy: 'Tạm dừng nhận chat',
    workload: 'Tải công việc',
    activeChats: 'Chat đang xử lý',
    maxChats: 'Chat tối đa',
    capacityLabel: 'Số chat đồng thời tối đa',
    assignedToMe: 'Của tôi',
    allAgentSessions: 'Tất cả (Admin)',
    autoAssigned: 'Đã tự động phân công',
    noAgentsOnline: 'Không có nhân viên online',
    queueMonitor: 'Giám sát hàng đợi',
    totalInQueue: 'Tổng đang chờ',
    avgWaitTime: 'Thời gian chờ TB',
    availableAgents: 'Agent sẵn sàng',
    totalOnline: 'Tổng online',
    agentSettings: 'Cài đặt Agent',
    deleteAgent: 'Xóa nhân viên',
    deleteAgentConfirm: 'Bạn có chắc chắn muốn xóa nhân viên này?',
    saveChanges: 'Lưu thay đổi',
    chatCapacity: 'Sức chứa chat',
  },

  en: {
    // Common
    appName: 'Dashboard',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    search: 'Search...',
    noData: 'No data',
    error: 'An error occurred',
    success: 'Success',

    // Auth
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    loginTitle: 'System Login',
    loginSubtitle: 'Smart Customer Support System',
    loginError: 'Invalid username or password',
    welcomeBack: 'Welcome back',

    // Dashboard
    dashboard: 'Dashboard',
    conversations: 'Conversations',
    allSessions: 'All',
    pending: 'Pending',
    inProgress: 'In Progress',
    botHandling: 'Bot Handling',
    closed: 'Closed',
    noConversations: 'No conversations yet',
    selectConversation: 'Select a conversation to start',

    // Chat
    typeMessage: 'Type a message...',
    send: 'Send',
    accept: 'Accept',
    close: 'Close',
    acceptSession: 'Accept customer',
    closeSession: 'Close conversation',
    agentTyping: 'is typing...',
    messagesHistory: 'Message history',
    newCustomer: 'New customer needs support!',

    // Customer Info
    customerInfo: 'Customer Info',
    sessionId: 'Session ID',
    status: 'Status',
    createdAt: 'Created at',
    assignedTo: 'Assigned to',
    notAssigned: 'Not assigned',

    // Knowledge Base
    knowledgeBase: 'AI Knowledge',
    uploadDocument: 'Upload document',
    dragDrop: 'Drag & drop or click to select',
    supportedFormats: 'Supported: PDF, TXT, DOCX (max 10MB)',
    processing: 'Processing',
    ready: 'Ready',
    uploadedBy: 'Uploaded by',
    deleteConfirm: 'Are you sure you want to delete this document?',
    noDocuments: 'No documents yet',
    uploadFirst: 'Upload your first document to train the AI',

    // Settings
    settings: 'Settings',
    language: 'Language',
    theme: 'Theme',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',

    // Agent Management
    agentManagement: 'Agent Management',
    addAgent: 'Add Agent',
    displayName: 'Display Name',
    role: 'Role',
    admin: 'Admin',
    agent: 'Agent',
    online: 'Online',
    offline: 'Offline',

    // Queue & Workload
    queueStatus: 'Queue',
    queueEmpty: 'Queue is empty',
    queuePosition: 'Queue position',
    waitingInQueue: 'Waiting in queue',
    estimatedWait: 'Estimated wait',
    minutes: 'min',
    available: 'Available',
    busy: 'Busy',
    statusAvailable: 'Ready to receive chats',
    statusBusy: 'Paused receiving chats',
    workload: 'Workload',
    activeChats: 'Active chats',
    maxChats: 'Max chats',
    capacityLabel: 'Max concurrent chats',
    assignedToMe: 'My chats',
    allAgentSessions: 'All (Admin)',
    autoAssigned: 'Auto assigned',
    noAgentsOnline: 'No agents online',
    queueMonitor: 'Queue Monitor',
    totalInQueue: 'Total waiting',
    avgWaitTime: 'Avg wait time',
    availableAgents: 'Available agents',
    totalOnline: 'Total online',
    agentSettings: 'Agent Settings',
    deleteAgent: 'Delete agent',
    deleteAgentConfirm: 'Are you sure you want to delete this agent?',
    saveChanges: 'Save changes',
    chatCapacity: 'Chat capacity',
  },
};

/**
 * Lấy ngôn ngữ từ localStorage hoặc mặc định
 */
export function getLanguage() {
  return 'vi';
}

/**
 * Đặt ngôn ngữ
 */
export function setLanguage(lang) {
  localStorage.setItem('language', lang);
}

/**
 * Lấy text theo key
 */
export function t(key) {
  const lang = getLanguage();
  return translations[lang]?.[key] || translations['vi']?.[key] || key;
}

export default translations;
