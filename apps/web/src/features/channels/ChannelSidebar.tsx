'use client';

import * as React from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@mivo/ui';
import {
  Hash,
  Volume2,
  Video,
  Monitor,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Mic,
  MicOff,
  Headphones,
  LogOut,
  Sparkles,
  Radio,
  Layers,
  Users,
  UserPlus,
  Settings,
  Palette,
  PanelLeftClose,
  Smile,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeStore } from '@/stores/themeStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { CreateChannelModal } from './CreateChannelModal';
import { CreateRoomModal } from './CreateRoomModal';
import { RoleManagerModal } from '@/features/rbac/RoleManagerModal';
import { AddOrgMemberModal } from '@/features/communities/AddOrgMemberModal';
import { EditProfileModal } from '@/features/auth/EditProfileModal';
import { SlackStatusModal } from '@/features/auth/SlackStatusModal';
import { SlackUserMenuPopover } from '@/features/auth/SlackUserMenuPopover';
import { useUserPresence } from '@/stores/presenceStore';

export interface ChannelSidebarProps {
  communityId: string;
  className?: string;
}

type NavVariant = 'ALL' | 'STAGES' | 'MEMBERS';

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({ communityId, className }) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const presence = useUserPresence(user?.id, user);
  const { activeCommunity, selectCommunity } = useCommunityStore();
  const { setIsThemeModalOpen } = useThemeStore();
  const { closeMobileSidebar, toggleSidebarCollapse } = useNavigationStore();

  const [activeTab, setActiveTab] = React.useState<NavVariant>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreateChannelOpen, setIsCreateChannelOpen] = React.useState(false);
  const [selectedChannelForRoom, setSelectedChannelForRoom] = React.useState<string | null>(null);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = React.useState(false);
  const [isAddOrgMemberOpen, setIsAddOrgMemberOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);
  const [isSlackStatusOpen, setIsSlackStatusOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isDeafened, setIsDeafened] = React.useState(false);

  React.useEffect(() => {
    if (communityId) {
      selectCommunity(communityId);
    }
  }, [communityId, selectCommunity]);

  // Filter channels and rooms based on active navigation tab & search query (with strict deduplication)
  const filteredChannels = React.useMemo(() => {
    if (!activeCommunity?.channels) return [];
    const seenChannelIds = new Set<string>();
    const uniqueChannels = activeCommunity.channels.filter((ch) => {
      if (!ch || !ch.id || seenChannelIds.has(ch.id)) return false;
      seenChannelIds.add(ch.id);
      return true;
    });

    return uniqueChannels
      .map((ch) => {
        const seenRoomIds = new Set<string>();
        const uniqueRooms = (ch.rooms || []).filter((r) => {
          if (!r || !r.id || seenRoomIds.has(r.id)) return false;
          seenRoomIds.add(r.id);
          return true;
        });

        const matchingRooms = uniqueRooms.filter((r) => {
          const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchesSearch) return false;
          if (activeTab === 'STAGES') {
            return (
              r.activeMode === 'VOICE' ||
              r.activeMode === 'VIDEO' ||
              r.activeMode === 'SCREEN_SHARE' ||
              r.activeMode === 'STREAM'
            );
          }
          return true;
        });

        return {
          ...ch,
          rooms: matchingRooms,
        };
      })
      .filter((ch) => {
        if (activeTab === 'STAGES') return ch.rooms.length > 0;
        return ch.name.toLowerCase().includes(searchQuery.toLowerCase()) || ch.rooms.length > 0;
      });
  }, [activeCommunity?.channels, searchQuery, activeTab]);

  if (!activeCommunity) {
    return (
      <div className={className || "w-[270px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] backdrop-blur-2xl flex flex-col justify-center items-center select-none flex-shrink-0"}>
        <div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-[11px] font-mono text-[var(--text-muted)]">Loading Spaces...</span>
      </div>
    );
  }

  const isOwnerOrAdmin =
    activeCommunity.currentUserRole?.name === 'Owner' ||
    activeCommunity.currentUserRole?.name === 'Admin' ||
    activeCommunity.currentUserRole?.permissions.includes('community.manage' as any);

  const roleColor = activeCommunity.currentUserRole?.color || '#DC2626';

  return (
    <>
      <aside className={className || "w-[270px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] backdrop-blur-2xl flex flex-col justify-between select-none flex-shrink-0"}>
        {/* Top Header & Search Bar */}
        <div className="flex-shrink-0 flex flex-col">
          {/* Community Title Bar */}
          <div className="h-16 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="min-w-0 pr-2">
              <h1 className="truncate font-display tracking-tight text-sm font-bold text-[var(--text-primary)]">
                {activeCommunity.name}
              </h1>
              <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase">
                {activeCommunity.channels?.length || 0} Spaces
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isOwnerOrAdmin && (
                <>
                  <button
                    onClick={() => setIsAddOrgMemberOpen(true)}
                    className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-black/[0.04] transition-all cursor-pointer"
                    title="Add Organization Members"
                  >
                    <UserPlus className="w-4 h-4 text-[#DC2626]" />
                  </button>
                  <button
                    onClick={() => setIsRoleManagerOpen(true)}
                    className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-black/[0.04] transition-all cursor-pointer"
                    title="Community Roles & Permissions"
                  >
                    <Shield className="w-4 h-4 text-[#DC2626]" />
                  </button>
                </>
              )}

              {/* Closeable Tray Collapse Button */}
              <button
                onClick={toggleSidebarCollapse}
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] transition-all cursor-pointer"
                title="Collapse Sidebar Tray (Ctrl+\)"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Apple-Style Search Input with ⌘K Badge */}
          <div className="px-3.5 pt-3 pb-1.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3" />
              <input
                type="text"
                placeholder="Filter channels & rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-9 py-1.5 rounded-[12px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 font-medium transition-all shadow-xs"
              />
              <span className="absolute right-2.5 px-1.5 py-0.5 rounded-md bg-black/[0.04] border border-[var(--border-subtle)] text-[9px] font-mono text-[var(--text-muted)] pointer-events-none">
                ⌘K
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Tree View */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#DC2626]" />
              <span>Spaces & Channels</span>
            </span>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setIsCreateChannelOpen(true)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-black/[0.04] transition-colors cursor-pointer"
                title="Create Space"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            {filteredChannels.map((channel) => (
              <div key={channel.id} className="space-y-1">
                {/* Channel Row Header */}
                <div className="flex items-center justify-between group px-2 py-1 rounded-[10px] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.03] transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    <Hash className="w-3.5 h-3.5 text-[#DC2626] flex-shrink-0" />
                    <span className="truncate text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-display text-[11px] uppercase tracking-wider font-bold">
                      {channel.name}
                    </span>
                  </div>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => setSelectedChannelForRoom(channel.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-black/[0.04] transition-all cursor-pointer"
                      title="Add Room to Space"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Rooms in Channel */}
                <div className="pl-2 space-y-0.5 border-l border-[var(--border-subtle)] ml-2.5">
                  {channel.rooms?.map((room) => {
                    const isRoomActive = pathname.includes(`/rooms/${room.id}`);
                    return (
                      <Link
                        key={room.id}
                        href={`/communities/${communityId}/rooms/${room.id}`}
                        onClick={() => closeMobileSidebar()}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-[12px] text-xs font-medium transition-all duration-150 group cursor-pointer ${
                          isRoomActive
                            ? 'bg-[#DC2626]/10 text-[#111827] font-bold border border-[#DC2626]/30 shadow-xs'
                            : 'text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[#111827]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          {room.activeMode === 'VOICE' && <Volume2 className="w-3.5 h-3.5 text-[#059669] flex-shrink-0 animate-pulse" />}
                          {room.activeMode === 'VIDEO' && <Video className="w-3.5 h-3.5 text-[#0284C7] flex-shrink-0 animate-pulse" />}
                          {room.activeMode === 'SCREEN_SHARE' && <Monitor className="w-3.5 h-3.5 text-[#DC2626] flex-shrink-0" />}
                          {room.activeMode === 'STREAM' && <Radio className="w-3.5 h-3.5 text-[#E11D48] flex-shrink-0 animate-pulse" />}
                          {room.activeMode === 'TEXT' && <Hash className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />}
                          <span className="truncate">{room.name}</span>
                        </div>

                        <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded-[8px] border ${
                          room.activeMode === 'VOICE'
                            ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                            : room.activeMode === 'VIDEO'
                            ? 'bg-sky-500/15 text-sky-700 border-sky-500/30'
                            : room.activeMode === 'SCREEN_SHARE'
                            ? 'bg-red-500/15 text-[#DC2626] border-red-500/30'
                            : room.activeMode === 'STREAM'
                            ? 'bg-rose-500/15 text-rose-700 border-rose-500/30'
                            : 'bg-black/[0.04] text-[var(--text-muted)] border-[var(--border-subtle)]'
                        }`}>
                          {room.activeMode}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* macOS / Slack Style User Status Footer */}
        <div className="h-16 bg-[var(--bg-sidebar)] px-3 border-t border-[var(--border-subtle)] flex items-center justify-between backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="relative group p-0.5 rounded-full hover:ring-2 hover:ring-[#DC2626]/40 transition-all cursor-pointer flex-shrink-0"
              title="Your Profile & Status"
            >
              <Avatar
                size="sm"
                status={presence.status}
                fallbackText={user?.displayName || user?.username}
                src={user?.avatarUrl}
                className="group-hover:scale-105 transition-transform"
              />
            </button>
            <div className="min-w-0 flex-1">
              <div
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="text-xs font-bold text-[#111827] truncate hover:text-[#DC2626] transition-colors cursor-pointer"
                title="Open user availability & status menu"
              >
                {user?.displayName || user?.username}
              </div>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 text-[10px] text-left truncate text-[var(--text-muted)] hover:text-[#111827] transition-colors cursor-pointer w-full group"
                title="Set status & availability"
              >
                {presence.customStatus ? (
                  <span className="text-[#DC2626] font-semibold truncate flex items-center gap-1">
                    <span className="truncate">{presence.customStatus}</span>
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-semibold truncate"
                    style={{ color: roleColor }}
                  >
                    {activeCommunity.currentUserRole?.name || 'Member'}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsSlackStatusOpen(true)}
              className="p-1.5 rounded-[10px] text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-all cursor-pointer"
              title="Set availability & status"
            >
              <Smile className="w-3.5 h-3.5 text-[#DC2626]" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1.5 rounded-[10px] transition-all cursor-pointer ${
                isMuted
                  ? 'text-[#DC2626] bg-red-500/15 border border-red-500/30 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[#111827] hover:bg-black/[0.04]'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`p-1.5 rounded-[10px] transition-all cursor-pointer ${
                isDeafened
                  ? 'text-[#DC2626] bg-red-500/15 border border-red-500/30 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[#111827] hover:bg-black/[0.04]'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="p-1.5 rounded-[10px] text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-black/[0.04] transition-all cursor-pointer"
              title="Visual Themes & Dark/Bright Mode"
            >
              <Palette className="w-3.5 h-3.5 text-[#DC2626]" />
            </button>

            <button
              onClick={() => logout()}
              className="p-1.5 rounded-[10px] text-[var(--text-muted)] hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <CreateChannelModal
        communityId={communityId}
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
      />

      {selectedChannelForRoom && (
        <CreateRoomModal
          communityId={communityId}
          channelId={selectedChannelForRoom}
          isOpen={Boolean(selectedChannelForRoom)}
          onClose={() => setSelectedChannelForRoom(null)}
        />
      )}

      <RoleManagerModal
        communityId={communityId}
        isOpen={isRoleManagerOpen}
        onClose={() => setIsRoleManagerOpen(false)}
      />

      <AddOrgMemberModal
        communityId={communityId}
        communityName={activeCommunity.name}
        isOpen={isAddOrgMemberOpen}
        onClose={() => setIsAddOrgMemberOpen(false)}
        onMemberUpdated={() => selectCommunity(communityId)}
      />

      <SlackUserMenuPopover
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        onOpenFullModal={() => setIsSlackStatusOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        placement="bottom-bar"
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      <SlackStatusModal
        isOpen={isSlackStatusOpen}
        onClose={() => setIsSlackStatusOpen(false)}
      />
    </>
  );
};
