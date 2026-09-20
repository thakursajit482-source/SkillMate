import React from 'react';
import { CheckCircle2, ShieldAlert, Clock, MapPin } from 'lucide-react';
import { VerificationStatus, RequestStatus, OfferStatus, TaskStatus, RequestType } from '../types';

export const VerifiedBadge: React.FC<{ status?: VerificationStatus; showText?: boolean }> = ({
  status = 'UNVERIFIED',
  showText = true,
}) => {
  if (status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        {showText && 'Verified Student'}
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        {showText && 'Verification Pending'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
      {showText && 'Unverified'}
    </span>
  );
};

export const DistanceBadge: React.FC<{ distanceBand?: string; approximateArea?: string }> = ({
  distanceBand,
  approximateArea,
}) => {
  if (!distanceBand && !approximateArea) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
      <MapPin className="w-3 h-3 text-slate-500" />
      {approximateArea ? approximateArea : ''}
      {approximateArea && distanceBand ? ' • ' : ''}
      {distanceBand || ''}
    </span>
  );
};

export const RequestTypeBadge: React.FC<{ type: RequestType }> = ({ type }) => {
  switch (type) {
    case 'PAID':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Paid Task
        </span>
      );
    case 'SKILL_EXCHANGE':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
          Skill Exchange
        </span>
      );
    case 'SOCIAL':
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
          Study / Social
        </span>
      );
    default:
      return null;
  }
};

export const StatusBadge: React.FC<{ status: RequestStatus | OfferStatus | TaskStatus }> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'OPEN':
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MATCHED':
      case 'ACCEPTED':
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CLOSED':
      case 'DECLINED':
      case 'WITHDRAWN':
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStyle()}`}>
      {status.toLowerCase().replace('_', ' ')}
    </span>
  );
};
