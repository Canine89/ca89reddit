"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/posts");
    }
  }, [user, router]);

  // 로그인
  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    else setUser(data.user);
    setLoading(false);
  };

  // 회원가입
  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    if (!email || !password || !username) {
      setError("이메일, 비밀번호, 닉네임을 모두 입력하세요.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setError(error.message);
    else {
      setUser(data.user);
      // 프로필 테이블에 닉네임 저장
      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          username,
        });
      }
    }
    setLoading(false);
  };

  // 로그아웃
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 border rounded shadow bg-white">
      <h1 className="text-2xl font-bold mb-4">로그인 / 회원가입</h1>
      {user ? (
        <div>
          <p className="mb-4">{user.email} 님 환영합니다!</p>
          <button onClick={handleLogout} className="w-full py-2 bg-gray-200 rounded">로그아웃</button>
        </div>
      ) : (
        <>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          <input
            type="text"
            placeholder="닉네임"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          {error && <div className="mb-2 text-red-500">{error}</div>}
          <button
            onClick={handleLogin}
            className="w-full py-2 mb-2 bg-reddit-orange text-white rounded disabled:opacity-50"
            disabled={loading}
          >
            로그인
          </button>
          <button
            onClick={handleSignUp}
            className="w-full py-2 bg-reddit-orange text-white rounded disabled:opacity-50"
            disabled={loading}
          >
            회원가입
          </button>
        </>
      )}
    </div>
  );
} 