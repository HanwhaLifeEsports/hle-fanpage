import type { Metadata } from 'next';
import PostDetail from '@/components/PostDetail';

export const metadata: Metadata = { title: '게시판' };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetail id={id} />;
}
