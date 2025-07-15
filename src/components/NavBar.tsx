"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NavBar() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 border-b-4 border-reddit-orange bg-white mb-8 shadow-sm">
      <div className="flex items-center gap-4">
        <Link href="/posts" className="flex items-center gap-2">
          <img src="/logo.png" alt="커뮤니티 로고" className="w-8 h-8" style={{borderRadius: '50%', border: '2px solid #FF4500'}} />
          <span className="font-bold text-lg text-reddit-orange">커뮤니티 게시판</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {!user && (
          <Link href="/auth/login" className="text-reddit-orange font-semibold">로그인</Link>
        )}
        {user && (
          <>
            <Link href="/profile" className="text-gray-700">내 정보</Link>
            <button onClick={handleLogout} className="text-reddit-orange font-semibold">로그아웃</button>
          </>
        )}
      </div>
    </nav>
  );
} 