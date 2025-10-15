// app/page.tsx
import Link from 'next/link'; // Next.jsのLinkコンポーネントをインポート

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4">
      <h1 className="text-5xl font-extrabold text-gray-800 mb-6 text-center leading-tight">
        いるかの入れ物
      </h1>
      <p className="text-xl text-gray-600 mb-10 text-center max-w-xl">
        リアルタイム画面共有＆視聴サービス
      </p>

      <Link href="/broadcast" passHref>
        <button className="px-10 py-5 text-2xl font-bold text-white bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95">
          <span className="mr-2">🚀</span> 配信を開始する
        </button>
      </Link>

      <div className="mt-12 text-gray-500 text-sm">
        {/* 将来的に視聴者向けのガイドやリンクなどを追加しても良いでしょう */}
        <p>視聴するには、配信者から共有されたURLにアクセスしてください。</p>
      </div>
    </div>
  );
}