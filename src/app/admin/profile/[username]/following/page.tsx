'use client';

import { useParams } from 'next/navigation';
import AdminFollowListPage from '../../../components/AdminFollowListPage';

export default function AdminFollowingPage() {
  const params = useParams();
  const username = params.username as string;

  return <AdminFollowListPage type="following" username={username} />;
}
