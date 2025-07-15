"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/posts");
    }
  }, [user, router]);

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

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 border rounded shadow bg-white">
      <h1 className="text-2xl font-bold mb-4">로그인</h1>
      <form
        onSubmit={e => { e.preventDefault(); handleLogin(); }}
        className="flex flex-col gap-0"
      >
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
          className="w-full mb-4 p-2 border rounded"
        />
        {error && <div className="mb-2 text-red-500">{error}</div>}
        <button
          type="submit"
          className="w-full py-2 mb-2 bg-orange-500 text-white rounded font-bold outline outline-2 outline-orange-500/30 disabled:opacity-50"
          disabled={loading}
        >
          로그인
        </button>
      </form>
      <div className="text-center mt-4 text-sm">
        아직 회원이 아니신가요?{' '}
        <a href="/auth/signup" className="text-orange-500 font-semibold hover:underline">회원가입</a>
      </div>
    </div>
  );
} 