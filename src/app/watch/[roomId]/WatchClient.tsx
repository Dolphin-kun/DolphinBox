"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, set, push, child } from "firebase/database";

export default function WatchClient({ roomId }: { roomId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);

  // UIの状態を管理するためのState
  const [volume, setVolume] = useState(0.5); // 0.0 ~ 1.0
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    // 1. WebRTC PeerConnection の初期化
    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const peerConnection = pc.current;

    // 2. 映像/音声トラック受信時の処理 (シンプルに修正)
    peerConnection.ontrack = (event) => {
      // event.streams[0] を直接 video 要素にセットするのが最も標準的です
      if (videoRef.current && event.streams && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    // 3. 接続情報の交換 (Firebase Realtime Database)
    const roomRef = ref(db, `rooms/${roomId}`);
    const offerCandidatesRef = child(roomRef, "offerCandidates");
    const answerCandidatesRef = child(roomRef, "answerCandidates");

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        push(answerCandidatesRef, event.candidate.toJSON());
      }
    };

    onValue(offerCandidatesRef, (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const candidate = childSnapshot.val();
        if (candidate) {
          if (peerConnection.currentRemoteDescription) {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            candidateQueue.current.push(candidate);
          }
        }
      });
    });

    onValue(child(roomRef, "offer"), async (snapshot) => {
      const data = snapshot.val();
      if (data && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));

        candidateQueue.current.forEach(candidate => {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        });
        candidateQueue.current = [];

        const answerDescription = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answerDescription);

        const answer = {
          type: answerDescription.type,
          sdp: answerDescription.sdp,
        };
        await set(child(roomRef, "answer"), answer);
      }
    });

    // 4. コンポーネントが不要になったら接続を閉じる
    return () => {
      peerConnection.close();
    };
  }, [roomId]);

  // 音量スライダーを操作したときの処理
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    // 音量を変更したらミュートは解除する
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // ミュートボタンを切り替える処理
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // isMuted の状態を video 要素に反映させる
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);


   return (
  <div className="flex flex-col items-center p-8">
    <h1 className="text-2xl font-semibold mb-6">
      視聴ページ (ルーム: {roomId})
    </h1>

    {/* --- 動画コンテナ（YouTubeサイズ風） --- */}
    <div className="relative w-full max-w-[960px] aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
    </div>

    {/* --- コントロール類 --- */}
    <div className="flex items-center gap-4 mt-4">
      <button
        onClick={toggleMute}
        className="text-2xl hover:scale-110 transition-transform"
      >
        {isMuted || volume === 0 ? "🔇" : "🔊"}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={handleVolumeChange}
        className="w-40 accent-blue-500 cursor-pointer"
      />
    </div>
  </div>
);

}