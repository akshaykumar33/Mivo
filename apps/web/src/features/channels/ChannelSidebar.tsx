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
  Settings,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeStore } from '@/stores/themeStore';
import { CreateChannelModal } from './CreateChannelModal';
import { CreateRoomModal } from './CreateRoomModal';
import { RoleManagerModal } from '@/features/rbac/RoleManagerModal';

export interface ChannelSidebarProps {
  communityId: string;
}

type NavVariant = 'ALL' | 'STAGES' | 'MEMBERS';

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({ communityId }) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { activeCommunity, selectCommunity } = useCommunityStore();
  const { setIsThemeModalOpen } = useThemeStore();

  const [activeTab, setActiveTab] = React.useState<NavVariant>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreateChannelOpen, setIsCreateChannelOpen] = React.useState(false);
  const [selectedChannelForRoom, setSelectedChannelForRoom] = React.useState<string | null>(null);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isDeafened, setIsDeafened] = React.useState(false);

  React.useEffect(() => {
    if (communityId) {
      selectCommunity(communityId);
    }
  }, [communityId, selectCommunity]);

  if (!activeCommunity) {
    return (
      <div className="w-[270px] h-full bg-[#090B10]/95 border-r border-white/[0.07] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#5E5CE6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnerOrAdmin =
    activeCommunity.currentUserRole?.name === 'Owner' ||
    activeCommunity.currentUserRole?.name === 'Admin' ||
    activeCommunity.currentUserRole?.permissions.includes('community.manage' as any);

  const roleColor = activeCommunity.currentUserRole?.color || '#BF5AF2';

  // Filter channels and rooms based on active navigation tab & search query
  const filteredChannels = (activeCommunity.channels || []).map((ch) => {
    const matchingRooms = (ch.rooms || []).filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === 'STAGES') {
        return r.activeMode === 'VOICE' || r.activeMode === 'VIDEO' || r.activeMode === 'SCREEN_SHARE' || r.activeMode === 'STREAM';
      }
      return true;
    });

    return {
      ...ch,
      rooms: matchingRooms,
    };
  }).filter((ch) => {
    if (activeTab === 'STAGES') return ch.rooms.length > 0;
    return ch.name.toLowerCase().includes(searchQuery.toLowerCase()) || ch.rooms.length > 0;
  });

  return (
    <>
      <aside className="w-[270px] h-full bg-[#090B12]/85 border-r border-white/[0.07] backdrop-blur-2xl flex flex-col justify-between select-none flex-shrink-0">
        {/* Top Header & Search Bar */}
        <div className="flex-shrink-0 flex flex-col">
          {/* Community Title Bar */}
          <div className="h-16 px-4 border-b border-white/[0.07] flex items-center justify-between shadow-sm bg-white/[0.01] flex-shrink-0">
            <div className="min-w-0 pr-2">
              <h1 className="truncate font-display tracking-tight text-sm font-bold text-white">
                {activeCommunity.name}
              </h1>
              <span className="text-[10px] text-white/40 font-medium tracking-wider uppercase">
                {activeCommunity.channels?.length || 0} Spaces
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsRoleManagerOpen(true)}
                  className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                  title="Community Roles & Permissions"
                >
                  <Shield className="w-4 h-4 text-[#BF5AF2]" />
                </button>
              )}
            </div>
          </div>

          {/* Apple-Style Search Input with ⌘K Badge */}
          <div className="px-3.5 pt-3 pb-1.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3" />
              <input
                type="text"
                placeholder="Filter channels & rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-9 py-1.5 rounded-[12px] bg-white/[0.03] border border-white/[0.07] text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#5E5CE6] focus:bg-white/[0.06] font-medium transition-all"
              />
              <span className="absolute right-2.5 px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono text-white/40 pointer-events-none">
                ⌘K
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Tree View */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#BF5AF2]" />
              <span>Spaces & Channels</span>
            </span>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setIsCreateChannelOpen(true)}
                className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
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
                      <div className="flex items-center justify-between group px-2 py-1 rounded-[10px] text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-2 truncate">
                          {channel.type === 'VOICE' ? (
                            <Volume2 className="w-3.5 h-3.5 text-[#30D158] flex-shrink-0" />
                          ) : channel.type === 'MEDIA' ? (
                            <Video className="w-3.5 h-3.5 text-[#64D2FF] flex-shrink-0" />
                          ) : (
                            <Hash className="w-3.5 h-3.5 text-[#BF5AF2] flex-shrink-0" />
                          )}
                          <span className="truncate text-white/70 group-hover:text-white font-display text-[11px] uppercase tracking-wider font-bold">
                            {channel.name}
                          </span>
                        </div>
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() => setSelectedChannelForRoom(channel.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                            title="Add Room to Space"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        )}
                      </div>

                      {/* Rooms in Channel */}
                      <div className="pl-2 space-y-0.5 border-l border-white/[0.05] ml-2.5">
                        {channel.rooms?.map((room) => {
                          const isRoomActive = pathname.includes(`/rooms/${room.id}`);
                          return (
                            <Link
                              key={room.id}
                              href={`/communities/${communityId}/rooms/${room.id}`}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-[12px] text-xs font-medium transition-all duration-150 group cursor-pointer ${
                                isRoomActive
                                  ? 'bg-gradient-to-r from-[#5E5CE6]/30 to-[#0A84FF]/20 text-white font-semibold border border-[#5E5CE6]/40 shadow-[0_4px_16px_rgba(94,92,230,0.25)]'
                                  : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                {room.activeMode === 'VOICE' && <Volume2 className="w-3.5 h-3.5 text-[#30D158] flex-shrink-0 animate-pulse" />}
                                {room.activeMode === 'VIDEO' && <Video className="w-3.5 h-3.5 text-[#64D2FF] flex-shrink-0 animate-pulse" />}
                                {room.activeMode === 'SCREEN_SHARE' && <Monitor className="w-3.5 h-3.5 text-[#5E5CE6] flex-shrink-0" />}
                                {room.activeMode === 'STREAM' && <Radio className="w-3.5 h-3.5 text-[#FF375F] flex-shrink-0 animate-pulse" />}
                                {room.activeMode === 'TEXT' && <Hash className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />}
                                <span className="truncate">{room.name}</span>
                              </div>

                              <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded-[8px] border ${
                                room.activeMode === 'VOICE'
                                  ? 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30'
                                  : room.activeMode === 'VIDEO'
                                  ? 'bg-[#64D2FF]/15 text-[#64D2FF] border-[#64D2FF]/30'
                                  : room.activeMode === 'SCREEN_SHARE'
                                  ? 'bg-[#5E5CE6]/15 text-[#5E5CE6] border-[#5E5CE6]/30'
                                  : room.activeMode === 'STREAM'
                                  ? 'bg-[#FF375F]/15 text-[#FF375F] border-[#FF375F]/30'
                                  : 'bg-white/[0.04] text-white/40 border-white/[0.06]'
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

        {/* macOS Style User Status Footer */}
        <div className="h-16 bg-[#06070B]/90 px-3.5 border-t border-white/[0.07] flex items-center justify-between backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              size="sm"
              status={user?.status || 'ONLINE'}
              fallbackText={user?.displayName || user?.username}
              src={user?.avatarUrl}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user?.displayName || user?.username}
              </div>
              <div
                className="text-[10px] font-semibold truncate"
                style={{ color: roleColor }}
              >
                {activeCommunity.currentUserRole?.name || 'Member'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-[10px] transition-all cursor-pointer ${
                isMuted
                  ? 'text-[#FF453A] bg-[#FF453A]/15 border border-[#FF453A]/30 shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.08]'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`p-2 rounded-[10px] transition-all cursor-pointer ${
                isDeafened
                  ? 'text-[#FF453A] bg-[#FF453A]/15 border border-[#FF453A]/30 shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.08]'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="p-2 rounded-[10px] text-white/50 hover:text-[#BF5AF2] hover:bg-white/[0.08] transition-all cursor-pointer"
              title="Visual Themes & Dark/Bright Mode"
            >
              <Palette className="w-3.5 h-3.5 text-[#BF5AF2]" />
            </button>

            <button
              onClick={() => logout()}
              className="p-2 rounded-[10px] text-white/50 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-all cursor-pointer"
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
    </>
  );
};
