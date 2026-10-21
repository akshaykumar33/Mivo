'use client';

import * as React from 'react';
import { Modal, Button } from '@mivo/ui';
import { ShieldAlert, Building2, CheckCircle2, Lock } from 'lucide-react';
import { CommunityDTO } from '@mivo/shared';

export interface SingleOrgLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCommunity: CommunityDTO | null;
}

export const SingleOrgLimitModal: React.FC<SingleOrgLimitModalProps> = ({
  isOpen,
  onClose,
  activeCommunity,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Single Organization Tenancy Limit"
      description="Organization membership policies in Mivo"
      maxWidth="md"
    >
      <div className="space-y-4 py-1">
        <div className="flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            One Organization Per User
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
            Under Mivo&apos;s strict single-organization tenancy architecture, each user account can belong to <strong>only one organization</strong>. You cannot create, join, or hold membership in additional organizations.
          </p>
        </div>

        {activeCommunity && (
          <div className="p-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/25 flex items-center justify-center text-[#DC2626]">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider block">
                  Current Assigned Organization
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {activeCommunity.name}
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
              <CheckCircle2 className="w-3 h-3" />
              Active
            </span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          >
            Understood
          </Button>
        </div>
      </div>
    </Modal>
  );
};
