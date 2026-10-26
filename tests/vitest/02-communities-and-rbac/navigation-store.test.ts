import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore } from '@/stores/navigationStore';

describe('Navigation Store — Mobile Drawer & Sidebar Controls', () => {
  beforeEach(() => {
    useNavigationStore.setState({
      isMobileSidebarOpen: false,
      isSidebarCollapsed: false,
    });
  });

  it('initializes with default sidebar layout states', () => {
    const state = useNavigationStore.getState();
    expect(state.isMobileSidebarOpen).toBe(false);
    expect(state.isSidebarCollapsed).toBe(false);
  });

  it('toggles and closes mobile drawer view', () => {
    const store = useNavigationStore.getState();

    store.toggleMobileSidebar();
    expect(useNavigationStore.getState().isMobileSidebarOpen).toBe(true);

    store.toggleMobileSidebar();
    expect(useNavigationStore.getState().isMobileSidebarOpen).toBe(false);

    store.setIsMobileSidebarOpen(true);
    expect(useNavigationStore.getState().isMobileSidebarOpen).toBe(true);

    store.closeMobileSidebar();
    expect(useNavigationStore.getState().isMobileSidebarOpen).toBe(false);
  });

  it('manages desktop sidebar collapse state', () => {
    const store = useNavigationStore.getState();

    store.toggleSidebarCollapse();
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(true);

    store.setSidebarCollapsed(false);
    expect(useNavigationStore.getState().isSidebarCollapsed).toBe(false);
  });
});
