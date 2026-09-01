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
  Shield,
  Mic,
  MicOff,
  Headphones,
  LogOut,
  Sparkles,
  Radio,
  Layers,
  Compass,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
      <div className="w-72 h-full bg-[#080A10] border-r border-white/[0.06] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnerOrAdmin =
    activeCommunity.currentUserRole?.name === 'Owner' ||
    activeCommunity.currentUserRole?.name === 'Admin' ||
    activeCommunity.currentUserRole?.permissions.includes('community.manage' as any);

  const roleColor = activeCommunity.currentUserRole?.color || '#8B5CF6';

  // Filter channels and rooms based on active navigation tab & search query
  const filteredChannels = (activeCommunity.channels || []).map((ch) => {
    const matchingRooms = (ch.rooms || []).filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === 'STAGES') {
        return r.activeMode === 'VOICE' || r.activeMode === 'VIDEO' || r.activeMode === 'SCREEN_SHARE';
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
      <aside className="w-72 h-full bg-[#080A10] border-r border-white/[0.06] flex flex-col justify-between select-none">
        {/* Top Header & Navigation Variants */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Community Title Banner */}
          <div className="h-16 px-5 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.03] via-transparent to-transparent flex items-center justify-between shadow-sm">
            <div className="min-w-0">
              <h1 className="truncate font-display tracking-tight text-sm font-extrabold text-white">
                {activeCommunity.name}
              </h1>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                {activeCommunity.channels?.length || 0} Channels Active
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsRoleManagerOpen(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-violet-500/30 transition-all"
                  title="Manage Community Roles & Permissions"
                >
                  <Shield className="w-4 h-4 text-violet-400" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Variants Selector (Pills) */}
          <div className="px-4 pt-3 pb-2">
            <div className="p-1 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-1">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'ALL'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All</span>
              </button>

              <button
                onClick={() => setActiveTab('STAGES')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'STAGES'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live</span>
              </button>

              <button
                onClick={() => setActiveTab('MEMBERS')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'MEMBERS'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roster</span>
              </button>
            </div>
          </div>

          {/* Quick Search Filter */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter channels or rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-medium transition-colors"
              />
            </div>
          </div>

          {/* Scrollable Tree View */}
          <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-5 scrollbar-thin">
            {activeTab !== 'MEMBERS' ? (
              <>
                <div className="flex items-center justify-between px-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    <span>{activeTab === 'STAGES' ? 'Live Stage Rooms' : 'Channels & Spaces'}</span>
                  </span>
                  {isOwnerOrAdmin && activeTab === 'ALL' && (
                    <button
                      onClick={() => setIsCreateChannelOpen(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                      title="Create Channel"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {filteredChannels.map((channel) => (
                    <div key={channel.id} className="space-y-1.5">
                      {/* Channel Row Header */}
                      <div className="flex items-center justify-between group px-2.5 py-1 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-2 truncate">
                          {channel.type === 'VOICE' ? (
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : channel.type === 'MEDIA' ? (
                            <Video className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          ) : (
                            <Hash className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                          )}
                          <span className="truncate text-slate-300 group-hover:text-white font-display text-xs uppercase tracking-wide">
                            {channel.name}
                          </span>
                        </div>
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() => setSelectedChannelForRoom(channel.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
                            title="Add Room to Channel"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Rooms in Channel */}
                      <div className="pl-3 space-y-1 border-l border-white/[0.04] ml-2">
                        {channel.rooms?.map((room) => {
                          const isRoomActive = pathname.includes(`/rooms/${room.id}`);
                          return (
                            <Link
                              key={room.id}
                              href={`/communities/${communityId}/rooms/${room.id}`}
                              className={`flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all group ${
                                isRoomActive
                                  ? 'bg-gradient-to-r from-violet-600/25 to-indigo-600/15 text-white font-bold border border-violet-500/40 shadow-lg shadow-violet-600/10'
                                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                {room.activeMode === 'VOICE' && <Volume2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 animate-pulse" />}
                                {room.activeMode === 'VIDEO' && <Video className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 animate-pulse" />}
                                {room.activeMode === 'SCREEN_SHARE' && <Monitor className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                                {room.activeMode === 'TEXT' && <Hash className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                                <span className="truncate">{room.name}</span>
                              </div>

                              <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                                room.activeMode === 'VOICE'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : room.activeMode === 'VIDEO'
                                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                  : room.activeMode === 'SCREEN_SHARE'
                                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                  : 'bg-white/[0.06] text-slate-400 border-white/[0.06]'
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
              </>
            ) : (
              /* Members Directory Variant */
              <div className="space-y-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2">
                  Community Members
                </div>
                <div className="space-y-1.5">
                  {((activeCommunity as any).members || []).map((m: any) => (
                    <div
                      key={m.userId}
                      className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all"
                    >
                      <Avatar
                        size="sm"
                        src={m.user?.avatarUrl}
                        fallbackText={m.user?.displayName || m.user?.username}
                        status={m.user?.status || 'ONLINE'}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {m.user?.displayName || m.user?.username}
                        </div>
                        <div
                          className="text-[10px] font-semibold truncate"
                          style={{ color: m.role?.color || '#8B5CF6' }}
                        >
                          {m.role?.name || 'Member'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Status & Luxury Glassmorphic Controls Footer */}
        <div className="h-18 bg-[#06070B] px-4 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              size="sm"
              status={user?.status || 'ONLINE'}
              fallbackText={user?.displayName || user?.username}
              src={user?.avatarUrl}
            />
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white truncate">
                {user?.displayName || user?.username}
              </div>
              <div
                className="text-[10px] font-bold truncate"
                style={{ color: roleColor }}
              >
                {activeCommunity.currentUserRole?.name || 'Member'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl transition-all ${
                isMuted
                  ? 'text-rose-400 bg-rose-950/60 border border-rose-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`p-2 rounded-xl transition-all ${
                isDeafened
                  ? 'text-rose-400 bg-rose-950/60 border border-rose-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <Headphones className="w-4 h-4" />
            </button>

            <button
              onClick={() => logout()}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
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
