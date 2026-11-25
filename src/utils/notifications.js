import { idOf } from './marketplace';

export const getNotificationIcon = (type, resourceType) => {
  if (resourceType === 'CONVERSATION') return 'forum';
  if (type?.includes('ORDER') || resourceType === 'ORDER') return 'receipt_long';
  if (type?.includes('SHIPMENT') || resourceType === 'SHIPMENT') return 'local_shipping';
  if (type?.includes('PAYOUT') || resourceType === 'PAYOUT') return 'account_balance_wallet';
  if (type?.includes('REVIEW') || resourceType === 'REVIEW') return 'star';
  if (type?.includes('REPORT')) return 'flag';
  return 'notifications';
};

export const canOpenNotification = item => Boolean(item.resourceId && item.resourceType && item.resourceType !== 'DISPUTE');

export function openNotification(item, { setCurrentView, openResource }) {
  if (['PRODUCT_REPORT_RESOLVED', 'REPORTING_POLICY'].includes(item.type)) setCurrentView('report-history');
  else openResource(item.resourceType, idOf(item.resourceId));
}
