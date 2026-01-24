'use client';

import { useParams } from 'next/navigation';
import FollowListPage from '../components/FollowListPage';

export default function FollowingPage() {
  const params = useParams();
  const username = params.username as string;

  return <FollowListPage type="following" username={username} />;
}
