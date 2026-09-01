'use client';

import * as React from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, Badge } from '@mivo/ui';
import {
  Hash,
  Volume2,
  Video,
  Plus,
  ChevronDown,
  Settings,
  Shield,
  Mic,
  MicOff,
  Headphones,
  LogOut,
  Radio,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreateChannelModal } from './CreateChannelModal';
import { CreateRoomModal } from './CreateRoomModal';
import { RoleManagerModal } from '@/features/rbac/RoleManagerModal';

export interface ChannelSidebarProps {
  communityId: string;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({ communityId }) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { activeCommunity, selectCommunity } = useCommunityStore();

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
      <div className="w-64 h-full bg-[#0B0D14] border-r border-white/[0.06] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnerOrAdmin =
    activeCommunity.currentUserRole?.name === 'Owner' ||
    activeCommunity.currentUserRole?.name === 'Admin' ||
    activeCommunity.currentUserRole?.permissions.includes('community.manage' as any);

  const roleColor = activeCommunity.currentUserRole?.color || '#8B5CF6';

  return (
    <>
      <aside className="w-64 h-full bg-[#0B0D14] border-r border-white/[0.06] flex flex-col justify-between select-none">
        {/* Community Header */}
        <div>
          <div className="h-14 px-4 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent flex items-center justify-between font-bold text-slate-100 shadow-sm">
            <span className="truncate font-display tracking-tight text-sm text-white">
              {activeCommunity.name}
            </span>
            <div className="flex items-center gap-1">
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsRoleManagerOpen(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-violet-500/30 transition-all"
                  title="Manage Roles & Permissions"
                >
                  <Shield className="w-4 h-4 text-violet-400" />
                </button>
              )}
            </div>
          </div>

          {/* Channels & Rooms Tree */}
          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-130px)]">
            <div className="flex items-center justify-between px-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-violet-400" />
                <span>Channels & Stages</span>
              </span>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  title="Create Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {activeCommunity.channels?.map((channel) => (
                <div key={channel.id} className="space-y-1">
                  {/* Channel Row */}
                  <div className="flex items-center justify-between group px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      {channel.type === 'VOICE' ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : channel.type === 'MEDIA' ? (
                        <Video className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 text-violet-400" />
                      )}
                      <span className="truncate text-slate-300 group-hover:text-white transition-colors">{channel.name}</span>
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

                  {/* Rooms inside Channel */}
                  <div className="pl-3.5 space-y-1">
                    {channel.rooms?.map((room) => {
                      const isRoomActive = pathname.includes(`/rooms/${room.id}`);
                      return (
                        <Link
                          key={room.id}
                          href={`/communities/${communityId}/rooms/${room.id}`}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isRoomActive
                              ? 'bg-violet-600/20 text-violet-200 font-bold border border-violet-500/40 shadow-sm shadow-violet-600/20'
                              : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                          }`}
                        >
                          <span className="truncate">{room.name}</span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.04]">
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
        </div>

        {/* User Status & Controls Footer */}
        <div className="h-16 bg-[#07080C] px-3.5 border-t border-white/[0.06] flex items-center justify-between">
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
              className={`p-2 rounded-xl transition-all ${
                isMuted
                  ? 'text-rose-400 bg-rose-950/60 border border-rose-800/80'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`p-2 rounded-xl transition-all ${
                isDeafened
                  ? 'text-rose-400 bg-rose-950/60 border border-rose-800/80'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => logout()}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Log Out"
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
