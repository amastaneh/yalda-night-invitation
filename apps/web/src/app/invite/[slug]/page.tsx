import { Invitation } from '@/components/invitation';
import guests from '../../../../../../config/guests.json';

export const dynamicParams = false;
export function generateStaticParams() {
  return guests.map(({ slug }) => ({ slug }));
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Invitation invitationSlug={slug} />;
}
