import { HostOverview } from '@/components/host-overview';
import hosting from '../../../../../config/hosting.json';
import guests from '../../../../../config/guests.json';

export const dynamicParams = false;
export function generateStaticParams() {
  return [{ host: hosting.hostPath }];
}
export default function Page() {
  return <HostOverview accessKey={hosting.hostPath} guests={guests} siteUrl={hosting.siteUrl} />;
}
