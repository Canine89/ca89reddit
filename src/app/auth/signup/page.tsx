"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
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

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 border rounded shadow bg-white">
      <h1 className="text-2xl font-bold mb-4">회원가입</h1>
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
        className="w-full mb-4 p-2 border rounded"
      />
      {error && <div className="mb-2 text-red-500">{error}</div>}
      <button
        onClick={handleSignUp}
        className="w-full py-2 bg-orange-500 text-white rounded font-bold outline outline-2 outline-orange-500/30 hover:bg-orange-600 transition disabled:opacity-50"
        disabled={loading}
      >
        회원가입
      </button>
      <div className="text-center mt-4 text-sm">
        <div className="mb-2 text-gray-500">메일 인증을 하지 않으면 로그인할 수 없습니다.</div>
        이미 계정이 있으신가요?{' '}
        <a href="/auth/login" className="text-reddit-orange font-semibold hover:underline">로그인</a>
      </div>
    </div>
  );
} 