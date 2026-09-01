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
      <div className="w-60 h-full bg-[#151A26] border-r border-slate-800/80 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnerOrAdmin =
    activeCommunity.currentUserRole?.name === 'Owner' ||
    activeCommunity.currentUserRole?.name === 'Admin' ||
    activeCommunity.currentUserRole?.permissions.includes('community.manage' as any);

  return (
    <>
      <aside className="w-60 h-full bg-[#151A26] border-r border-slate-800/80 flex flex-col justify-between select-none">
        {/* Community Header */}
        <div>
          <div className="h-12 px-4 border-b border-slate-800/80 flex items-center justify-between font-semibold text-slate-100 shadow-sm">
            <span className="truncate">{activeCommunity.name}</span>
            <div className="flex items-center gap-1">
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsRoleManagerOpen(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Manage Roles & Permissions"
                >
                  <Shield className="w-4 h-4 text-violet-400" />
                </button>
              )}
            </div>
          </div>

          {/* Channels & Rooms Tree */}
          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
            <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Channels & Rooms</span>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                  <div className="flex items-center justify-between group px-2 py-1 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800/50">
                    <div className="flex items-center gap-1.5 truncate">
                      {channel.type === 'VOICE' ? (
                        <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      ) : channel.type === 'MEDIA' ? (
                        <Video className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="truncate">{channel.name}</span>
                    </div>
                    {isOwnerOrAdmin && (
                      <button
                        onClick={() => setSelectedChannelForRoom(channel.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-white transition-opacity"
                        title="Add Room to Channel"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Rooms inside Channel */}
                  <div className="pl-3 space-y-0.5">
                    {channel.rooms?.map((room) => {
                      const isRoomActive = pathname.includes(`/rooms/${room.id}`);
                      return (
                        <Link
                          key={room.id}
                          href={`/communities/${communityId}/rooms/${room.id}`}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isRoomActive
                              ? 'bg-violet-600/20 text-violet-300 font-semibold border-l-2 border-violet-500'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{room.name}</span>
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
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
        <div className="h-14 bg-[#0F131C] px-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              size="sm"
              status={user?.status || 'ONLINE'}
              fallbackText={user?.displayName || user?.username}
              src={user?.avatarUrl}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {user?.displayName || user?.username}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {activeCommunity.currentUserRole?.name || 'Member'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1.5 rounded-md transition-colors ${
                isMuted ? 'text-rose-400 bg-rose-950/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`p-1.5 rounded-md transition-colors ${
                isDeafened ? 'text-rose-400 bg-rose-950/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <Headphones className="w-4 h-4" />
            </button>

            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Log Out"
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
