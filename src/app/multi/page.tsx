import type { Metadata } from 'next';
import MultiView from '@/components/MultiView';

export const metadata: Metadata = {
  title: '멀티뷰',
  description: '치지직 채널을 최대 4개까지 동시에 보고 소리는 하나만 골라 듣는 멀티뷰 플레이어.',
};

export default function MultiPage() {
  return <MultiView />;
}
