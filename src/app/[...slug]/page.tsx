import { TipitApp } from '@/components/tipit-app';
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) { const { slug } = await params; return <TipitApp segments={slug} />; }
