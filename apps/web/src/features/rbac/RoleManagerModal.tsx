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
      <div className="flex flex-col sm:flex-row gap-4 min-h-[380px]">
        {/* Role List Sidebar */}
        <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-[var(--border-subtle)] pb-3 sm:pb-0 sm:pr-3 space-y-1.5 overflow-y-auto max-h-[140px] sm:max-h-[360px]">
          <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
            Hierarchy
          </div>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedRole?.id === role.id
                  ? 'bg-[var(--brand-primary,#6366f1)]/15 text-[var(--brand-primary,#6366f1)] border border-[var(--brand-primary,#6366f1)]/30 font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-1)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: role.color || '#6366f1' }}
                />
                <span className="truncate">{role.name}</span>
              </div>
              {role.isSystem && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface-1)] text-[var(--text-muted)] font-medium">
                  System
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Permissions Inspector */}
        <div className="w-full sm:w-2/3 sm:pl-1 overflow-y-auto max-h-[300px] sm:max-h-[360px] space-y-3">
          {selectedRole ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedRole.color || '#6366f1' }}
                    />
                    {selectedRole.name} Role
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Position Level: {selectedRole.position} • {selectedRole.permissions.length} active permissions
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-[var(--text-secondary)]">
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
                            ? 'bg-[var(--brand-primary,#6366f1)]/10 border-[var(--brand-primary,#6366f1)]/25 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-surface-1)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                        }`}
                      >
                        <span className="font-mono text-[11px]">{key}</span>
                        {isGranted ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <Check className="w-3.5 h-3.5" /> Granted
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-[11px]">Denied</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-[var(--text-muted)]">
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
