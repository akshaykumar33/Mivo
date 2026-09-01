'use client';

import * as React from 'react';
import { Modal, Button, Badge } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { RoleDTO, PERMISSIONS } from '@mivo/shared';
import { Shield, Check } from 'lucide-react';

export interface RoleManagerModalProps {
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RoleManagerModal: React.FC<RoleManagerModalProps> = ({
  communityId,
  isOpen,
  onClose,
}) => {
  const [roles, setRoles] = React.useState<RoleDTO[]>([]);
  const [selectedRole, setSelectedRole] = React.useState<RoleDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && communityId) {
      setIsLoading(true);
      api.get<RoleDTO[]>(`/api/v1/communities/${communityId}/roles`).then((res) => {
        setIsLoading(false);
        if (res.success && res.data) {
          setRoles(res.data);
          if (res.data.length > 0) {
            setSelectedRole(res.data[0]);
          }
        }
      });
    }
  }, [isOpen, communityId]);

  const permissionList = Object.entries(PERMISSIONS);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Community Roles & Permissions"
      description="Inspect and manage role hierarchies and granular capability flags."
      maxWidth="xl"
    >
      <div className="flex gap-4 min-h-[380px]">
        {/* Role List Sidebar */}
        <div className="w-1/3 border-r border-slate-800 pr-3 space-y-1.5 overflow-y-auto max-h-[360px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Hierarchy
          </div>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedRole?.id === role.id
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: role.color || '#7C3AED' }}
                />
                <span className="truncate">{role.name}</span>
              </div>
              {role.isSystem && (
                <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                  System
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Permissions Inspector */}
        <div className="flex-1 pl-1 overflow-y-auto max-h-[360px] space-y-3">
          {selectedRole ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedRole.color || '#7C3AED' }}
                    />
                    {selectedRole.name} Role
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Position Level: {selectedRole.position} • {selectedRole.permissions.length} active permissions
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Assigned Capabilities
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {permissionList.map(([name, key]) => {
                    const isGranted =
                      selectedRole.permissions.includes('*' as any) ||
                      selectedRole.permissions.includes(key as any);

                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                          isGranted
                            ? 'bg-violet-950/20 border-violet-800/40 text-slate-200'
                            : 'bg-slate-900/40 border-slate-800/40 text-slate-500 opacity-60'
                        }`}
                      >
                        <span className="font-mono text-[11px]">{key}</span>
                        {isGranted ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <Check className="w-3.5 h-3.5" /> Granted
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Denied</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">
              Select a role to inspect permissions
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
      </div>
    </Modal>
  );
};
