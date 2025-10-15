"use client";

import { useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, set, onValue, push, child, off, remove } from "firebase/database";

export default function BroadcastPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const roomIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startBroadcasting = async () => {
    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const peerConnection = pc.current;
    if (!peerConnection) return;

    // 🎥 画面共有 + 音声取得
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080, frameRate: { ideal: 60, max: 60 } },
      audio: true,
    });
    streamRef.current = stream;

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    if (videoRef.current) videoRef.current.srcObject = stream;

    const roomId = Math.random().toString(36).substring(2);
    roomIdRef.current = roomId;
    alert(`共有リンク: ${window.location.origin}/watch/${roomId}`);

    const roomRef = ref(db, `rooms/${roomId}`);
    const offerCandidatesRef = child(roomRef, "offerCandidates");
    const answerCandidatesRef = child(roomRef, "answerCandidates");

    // ICE candidate 送信
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) push(offerCandidatesRef, event.candidate.toJSON());
    };

    // 視聴者の candidate 受信
    onValue(answerCandidatesRef, (snapshot) => {
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

    // SDP offer作成
    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);
    await set(child(roomRef, "offer"), {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    });

    // answer受信
    onValue(child(roomRef, "answer"), async (snapshot) => {
      const data = snapshot.val();
      if (data && !pc.current?.currentRemoteDescription) {
        const answerDescription = new RTCSessionDescription(data);
        await peerConnection.setRemoteDescription(answerDescription);

        candidateQueue.current.forEach((candidate) => {
          pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
        });
        candidateQueue.current = [];
      }
    });
  };

  // 🛑 配信停止
  const stopBroadcasting = async () => {
    if (pc.current) pc.current.close();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (roomIdRef.current) {
      const roomRef = ref(db, `rooms/${roomIdRef.current}`);
      await remove(roomRef);
      roomIdRef.current = null;
    }
  };

  // ✅ ページ離脱時にも自動削除
  useEffect(() => {
    const handleUnload = async () => {
      await stopBroadcasting();
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      stopBroadcasting();
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-semibold mb-6">配信ページ</h1>

      <div className="relative w-full max-w-[960px] aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={startBroadcasting}
          className="px-6 py-3 text-lg font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition-colors"
        >
          🎥 配信を開始
        </button>
        <button
          onClick={stopBroadcasting}
          className="px-6 py-3 text-lg font-semibold text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-700 transition-colors"
        >
          🛑 配信を停止
        </button>
      </div>
    </div>
  );
}
