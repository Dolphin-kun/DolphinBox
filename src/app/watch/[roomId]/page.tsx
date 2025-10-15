import WatchClient from "./WatchClient"; // 先ほど作成したコンポーネントをインポート

// こちらはサーバーコンポーネント ( "use client" は不要 )
export default async function WatchPage({ params }: { params: { roomId: string } }) {
  const { roomId } = await params; // ← await が必要！
  return <WatchClient roomId={roomId} />;
}